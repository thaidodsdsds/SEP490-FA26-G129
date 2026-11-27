import { closeDatabase, initializeDatabase } from '../database/databaseService.js';
import { sendCalibrationDueReminderEmail } from '../common/emailService.js';
import env from '../config/env.js';

const DUE_WINDOW_DAYS = 10;
const shouldSend = process.argv.includes('--send');

interface DueDeviceRow {
  device_id: number;
  device_name: string;
  serial_number: string | null;
  model: string | null;
  due_date: string;
  days_left: number;
  customer_id: number;
  company_name: string;
  account_id: number | null;
  full_name: string | null;
  email: string | null;
}

interface ReminderGroup {
  customerId: number;
  companyName: string;
  emails: string[];
  fullNames: string[];
  devices: DueDeviceRow[];
}

const formatDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const main = async (): Promise<void> => {
  const dataSource = await initializeDatabase();

  try {
    const rows = await dataSource.query<DueDeviceRow[]>(
      `SELECT
         d.id AS device_id,
         d.name AS device_name,
         d.serial_number,
         d.model,
         to_char(d.next_due_date, 'YYYY-MM-DD') AS due_date,
         (d.next_due_date - CURRENT_DATE)::integer AS days_left,
         c.id AS customer_id,
         c.company_name,
         a.id AS account_id,
         a.full_name,
         a.email
       FROM devices d
       LEFT JOIN customers c ON c.id = d.customer_id
       LEFT JOIN accounts a ON a.customer_id = c.id
       WHERE d.next_due_date >= CURRENT_DATE
         AND d.next_due_date <= (CURRENT_DATE + ($1::integer * INTERVAL '1 day'))
       ORDER BY d.next_due_date ASC, c.id ASC, a.id ASC`,
      [DUE_WINDOW_DAYS],
    );

    const groups = new Map<number, ReminderGroup>();

    rows.forEach((row) => {
      let group = groups.get(Number(row.customer_id));
      if (!group) {
        group = {
          customerId: Number(row.customer_id),
          companyName: row.company_name || 'Khách hàng',
          emails: [],
          fullNames: [],
          devices: [],
        };
        groups.set(group.customerId, group);
      }

      const email = row.email?.trim().toLowerCase();
      if (email && !group.emails.includes(email)) group.emails.push(email);
      if (row.full_name?.trim() && !group.fullNames.includes(row.full_name.trim())) {
        group.fullNames.push(row.full_name.trim());
      }
      if (!group.devices.some((device) => device.device_id === row.device_id)) {
        group.devices.push(row);
      }
    });

    const renewalUrl = `${env.frontendUrl}/internal/customer/service-requests/new`;
    const mode = shouldSend ? 'GỬI THẬT' : 'DRY-RUN';

    console.log(`[DueReminder] ${mode} · ngưỡng ${DUE_WINDOW_DAYS} ngày · ${groups.size} khách hàng · ${rows.length} dòng thiết bị`);

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const values = Array.from(groups.values());
    for (const group of values) {
      const deviceSummary = group.devices
        .map((device) => `    - ${device.device_name}${device.serial_number ? ` (${device.serial_number})` : ''}: ${formatDate(device.due_date)} (${device.days_left} ngày)`)
        .join('\n');

      if (group.emails.length === 0) {
        skippedCount += 1;
        console.warn(`[DueReminder] Bỏ qua "${group.companyName}": không có email tài khoản.\n${deviceSummary}`);
        continue;
      }

      console.log(`[DueReminder] ${group.companyName} -> ${group.emails.join(', ')}\n${deviceSummary}`);

      if (!shouldSend) continue;

      try {
        const result = await sendCalibrationDueReminderEmail({
          to: group.emails.join(', '),
          fullName: group.fullNames[0],
          companyName: group.companyName,
          devices: group.devices.map((device) => ({
            name: device.device_name,
            serialNumber: device.serial_number,
            model: device.model,
            dueDate: device.due_date,
            daysLeft: Number(device.days_left),
          })),
          dueInDays: DUE_WINDOW_DAYS,
          renewalUrl,
        });

        if (result.sent) sentCount += 1;
        else {
          failedCount += 1;
          console.warn(`[DueReminder] Không gửi thật được cho ${group.companyName} (SMTP chưa cấu hình).`);
        }
      } catch (error) {
        failedCount += 1;
        console.error(`[DueReminder] Lỗi khi gửi cho ${group.companyName}:`, error);
      }
    }

    console.log(
      shouldSend
        ? `[DueReminder] Kết quả: đã gửi ${sentCount}, lỗi ${failedCount}, bỏ qua ${skippedCount}.`
        : `[DueReminder] Dry-run xong. Chạy lại với --send để gửi thật. Bỏ qua ${skippedCount} khách hàng không có email.`,
    );

    if (failedCount > 0) process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
};

main().catch((error: unknown) => {
  console.error('[DueReminder] Lỗi:', error);
  process.exitCode = 1;
});
