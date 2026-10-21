import { useEffect, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import { BarChart, DonutChart, ProgressBar } from '../../../components/ui/Charts.jsx';
import {
  certificates,
  customerKpis,
  customerProfile,
  debtSummary,
  dueBuckets,
  dueDevices,
  invoices,
  notifications,
  orderStatus,
  quotations,
  recentOrders,
} from './mockData.js';
import { formatCurrency, formatCurrencyShort, formatDate, formatDueHint } from '../../../utils/formatters.js';

const orderColumns = [
  { key: 'id', label: 'Mã đơn' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'devices', label: 'Thiết bị' },
  { key: 'service', label: 'Dịch vụ' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'progress', label: 'Tiến độ' },
];

const deviceColumns = [
  { key: 'device', label: 'Thiết bị' },
  { key: 'lastCalibratedAt', label: 'Hiệu chuẩn gần nhất' },
  { key: 'nextDueDate', label: 'Hạn tiếp theo' },
  { key: 'status', label: 'Trạng thái' },
];

const certificateColumns = [
  { key: 'id', label: 'Số chứng nhận' },
  { key: 'device', label: 'Thiết bị' },
  { key: 'issuedAt', label: 'Ngày hiệu lực' },
  { key: 'expiresAt', label: 'Hết hạn' },
  { key: 'sealCode', label: 'Tem' },
  { key: 'status', label: 'Trạng thái' },
];

function CustomerDashboardPage() {
  const [toast, setToast] = useState(null);

  const notify = (message, tone = 'info') => setToast({ message, tone });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const kpiCards = [
    ...customerKpis,
    {
      key: 'debt',
      icon: '₫',
      tone: 'danger',
      label: 'Công nợ chưa thanh toán',
      value: formatCurrencyShort(debtSummary.total),
      hint: `${debtSummary.overdueCount} hoá đơn quá hạn`,
      hintTone: 'danger',
    },
  ];

  const orderRows = recentOrders.map((order) => [
    <span className="dash-cell-title" key={`${order.id}-id`}>{order.id}</span>,
    formatDate(order.createdAt),
    `${order.devices} thiết bị`,
    order.service,
    <StatusBadge key={`${order.id}-status`} tone={order.tone}>{order.status}</StatusBadge>,
    (
      <ProgressBar
        key={`${order.id}-progress`}
        label={`${order.done}/${order.devices}`}
        max={order.devices}
        tone={order.done === order.devices ? 'success' : 'info'}
        value={order.done}
      />
    ),
  ]);

  const deviceRows = dueDevices.map((device) => [
    (
      <div key={`${device.id}-device`}>
        <span className="dash-cell-title">{device.name}</span>
        <span className="dash-cell-sub">{device.model} · SN {device.serial}</span>
      </div>
    ),
    formatDate(device.lastCalibratedAt),
    (
      <div key={`${device.id}-due`}>
        <span className={`dash-cell-title${device.tone === 'danger' ? ' dash-text-danger' : ''}`}>
          {formatDate(device.nextDueDate)}
        </span>
        <span className="dash-cell-sub">{formatDueHint(device.nextDueDate)}</span>
      </div>
    ),
    <StatusBadge key={`${device.id}-status`} tone={device.tone}>{device.status}</StatusBadge>,
  ]);

  const certificateRows = certificates.map((certificate) => [
    <span className="dash-cell-title" key={`${certificate.id}-id`}>{certificate.id}</span>,
    certificate.device,
    formatDate(certificate.issuedAt),
    formatDate(certificate.expiresAt),
    <span className="dash-cell-sub dash-nowrap" key={`${certificate.id}-seal`}>{certificate.sealCode}</span>,
    <StatusBadge key={`${certificate.id}-status`} tone={certificate.tone}>{certificate.status}</StatusBadge>,
  ]);

  return (
    <div className="dash-page">
      <PageHeader
        actions={(
          <>
            <button
              className="button button-secondary"
              onClick={() => notify('Đang chuẩn bị báo cáo tổng hợp (demo).')}
              type="button"
            >
              Xuất báo cáo
            </button>
            <button
              className="button button-primary"
              onClick={() => notify('Chức năng tạo yêu cầu dịch vụ sẽ có ở giai đoạn sau (demo).')}
              type="button"
            >
              Tạo yêu cầu dịch vụ
            </button>
          </>
        )}
        description={`${customerProfile.address} · Tổng quan thiết bị, đơn dịch vụ, báo giá và công nợ.`}
        eyebrow="TỔNG QUAN KHÁCH HÀNG"
        meta={[
          `MST: ${customerProfile.taxCode}`,
          customerProfile.industry,
          `HĐ: ${customerProfile.contractCode} · đến ${formatDate(customerProfile.contractExpiry)}`,
          `${customerProfile.accountCount} tài khoản`,
        ]}
        title={customerProfile.companyName}
      />

      <section aria-label="Chỉ số tổng quan" className="dash-kpi-grid">
        {kpiCards.map(({ key, ...kpi }) => (
          <StatCard key={key} {...kpi} />
        ))}
      </section>

      <div className="dash-grid two">
        <SectionCard
          subtitle="Tổng 128 thiết bị đang quản lý"
          title="Thiết bị theo hạn hiệu chuẩn"
        >
          <BarChart
            ariaLabel="Số thiết bị theo tình trạng hạn hiệu chuẩn"
            data={dueBuckets}
            horizontal
          />
        </SectionCard>
        <SectionCard
          subtitle="Các đơn phát sinh trong 90 ngày gần nhất"
          title="Đơn dịch vụ theo trạng thái"
        >
          <DonutChart
            ariaLabel="Số đơn dịch vụ theo trạng thái"
            data={orderStatus}
            totalLabel="đơn"
          />
        </SectionCard>
      </div>

      <SectionCard
        action={(
          <button
            className="dash-btn-xs"
            onClick={() => notify('Danh sách đầy đủ sẽ có ở màn Đơn dịch vụ (demo).')}
            type="button"
          >
            Xem tất cả
          </button>
        )}
        subtitle={`${recentOrders.length} đơn mới nhất`}
        title="Đơn dịch vụ gần đây"
      >
        <DataTable columns={orderColumns} rows={orderRows} />
      </SectionCard>

      <div className="dash-grid split">
        <SectionCard
          action={(
            <button
              className="dash-btn-xs"
              onClick={() => notify('Danh sách thiết bị đầy đủ sẽ có ở màn Thiết bị (demo).')}
              type="button"
            >
              Xem tất cả
            </button>
          )}
          subtitle="Ưu tiên thiết bị quá hạn hoặc đến hạn trong 30 ngày"
          title="Thiết bị sắp đến hạn"
        >
          <DataTable columns={deviceColumns} rows={deviceRows} />
        </SectionCard>

        <SectionCard
          subtitle={`${quotations.length} báo giá cần phản hồi`}
          title="Báo giá chờ phản hồi"
        >
          <div className="dash-quote-list">
            {quotations.map((quotation) => (
              <article className="dash-quote-item" key={quotation.id}>
                <div className="dash-quote-top">
                  <div>
                    <strong>{quotation.id}</strong>
                    <small>
                      Gửi {formatDate(quotation.sentAt)} · Hết hạn {formatDate(quotation.expiresAt)}
                    </small>
                  </div>
                  <span className="dash-quote-amount">{formatCurrency(quotation.amount)}</span>
                </div>
                <div className="dash-quote-actions">
                  <button
                    className="dash-btn-xs"
                    onClick={() => notify(`Đã mở báo giá ${quotation.id} (demo).`)}
                    type="button"
                  >
                    Xem
                  </button>
                  <button
                    className="dash-btn-xs primary"
                    onClick={() => notify(`Đã ghi nhận chấp nhận ${quotation.id} (demo).`, 'success')}
                    type="button"
                  >
                    Chấp nhận
                  </button>
                  <button
                    className="dash-btn-xs"
                    onClick={() => notify(`Đã ghi nhận từ chối ${quotation.id} (demo).`, 'error')}
                    type="button"
                  >
                    Từ chối
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="dash-grid split">
        <SectionCard
          action={(
            <button
              className="dash-btn-xs"
              onClick={() => notify('Danh sách chứng nhận đầy đủ sẽ có ở màn Chứng nhận & tem (demo).')}
              type="button"
            >
              Xem tất cả
            </button>
          )}
          subtitle="Chứng nhận và tem đã phát hành gần đây"
          title="Chứng nhận & tem"
        >
          <DataTable columns={certificateColumns} rows={certificateRows} />
        </SectionCard>

        <SectionCard
          subtitle="Tổng hợp hoá đơn và công nợ hiện tại"
          title="Công nợ & thanh toán"
        >
          <div className="dash-invoice-summary">
            <div className="dash-invoice-stat">
              <span>Tổng chưa thanh toán</span>
              <strong>{formatCurrencyShort(debtSummary.total)}</strong>
            </div>
            <div className="dash-invoice-stat">
              <span>Trong đó quá hạn</span>
              <strong className="dash-text-danger">{formatCurrencyShort(debtSummary.overdue)}</strong>
            </div>
          </div>
          <ul className="dash-invoice-list">
            {invoices.map((invoice) => (
              <li className="dash-invoice-item" key={invoice.id}>
                <div className="dash-invoice-main">
                  <strong>{invoice.id}</strong>
                  <small>
                    Phát hành {formatDate(invoice.issuedAt)} · Hạn {formatDate(invoice.dueAt)}
                  </small>
                </div>
                <div className="dash-invoice-side">
                  <span className="dash-quote-amount">{formatCurrency(invoice.amount)}</span>
                  <StatusBadge tone={invoice.tone}>{invoice.status}</StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        action={(
          <button
            className="dash-btn-xs"
            onClick={() => notify('Trung tâm thông báo sẽ có ở giai đoạn sau (demo).')}
            type="button"
          >
            Xem tất cả
          </button>
        )}
        subtitle="Cập nhật mới nhất liên quan đến công ty"
        title="Thông báo gần đây"
      >
        <ul className="dash-notice-list">
          {notifications.map((notification) => (
            <li className="dash-notice-item" key={notification.id}>
              <span className={`dash-notice-icon ${notification.tone}`} aria-hidden="true">
                {notification.icon}
              </span>
              <div>
                <p>{notification.text}</p>
                <small>{notification.time}</small>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}

export default CustomerDashboardPage;
