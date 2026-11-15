import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CleanupDevicesData1794900000000
  implements MigrationInterface
{
  name = 'CleanupDevicesData1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Xóa toàn bộ các bảng liên kết phụ thuộc theo đúng thứ tự ràng buộc khóa ngoại (Foreign Keys)
    await queryRunner.query(`
      -- Xóa chữ ký số liên kết hợp đồng/hồ sơ cũ
      DELETE FROM "digital_signatures";

      -- Xóa phân công kỹ thuật, kiểm tra ngoại quan và lệnh công tác
      DELETE FROM "work_order_assignments";
      DELETE FROM "initial_inspections";
      DELETE FROM "work_orders";

      -- Xóa các phụ lục hợp đồng, hợp đồng, chi tiết báo giá và báo giá
      DELETE FROM "contract_items";
      DELETE FROM "contracts";
      DELETE FROM "quotation_line_items";
      DELETE FROM "quotations";

      -- Xóa tệp đính kèm và hạng mục yêu cầu liên kết với service_requests
      DELETE FROM "attachments";
      DELETE FROM "service_request_items";
      DELETE FROM "service_requests";

      -- Xóa lịch sử thay đổi quyền sở hữu thiết bị
      DELETE FROM "device_ownership_histories";

      -- Xóa toàn bộ dữ liệu thiết bị trong bảng devices
      DELETE FROM "devices";
    `);

    // 2. Reset các sequence tự tăng về 1 để sẵn sàng cho việc nhập liệu thiết bị và yêu cầu mới
    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('"devices"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"service_requests"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"service_request_items"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"attachments"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"quotations"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"quotation_line_items"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"contracts"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"contract_items"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"work_orders"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"work_order_assignments"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"device_ownership_histories"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"digital_signatures"', 'id'), 1, false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Giữ nguyên trạng thái sạch
  }
}
