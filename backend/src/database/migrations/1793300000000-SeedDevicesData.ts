import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedDevicesData1793300000000 implements MigrationInterface {
  name = 'SeedDevicesData1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Seed service_types if empty so calibration procedures and history can link properly
    await queryRunner.query(`
      INSERT INTO "service_types" ("id", "name", "kind", "field", "standard_code", "measuring_range", "description", "status")
      VALUES
        (1, 'Hiệu chuẩn đồng hồ so điện tử', 'Calibration', 'DODAI', 'ISOCAL-HC-DODAI-01', '0 - 50 mm', 'Quy trình kiểm tra độ lặp lại và sai số chỉ thị đồng hồ so điện tử.', 'Active'),
        (2, 'Hiệu chuẩn thước cặp cơ khí & điện tử', 'Calibration', 'DODAI', 'ISOCAL-HC-DODAI-02', '0 - 300 mm', 'Kiểm tra độ phẳng mỏ đo, độ thẳng và sai số đo ngoài, đo trong.', 'Active'),
        (3, 'Hiệu chuẩn cân phân tích 4 số lẻ', 'Calibration', 'KHOILUONG', 'ISOCAL-HC-KHOILUONG-01', '0 - 220 g', 'Kiểm định sai số chỉ thị, độ lặp lại và độ lệch tâm bằng bộ quả cân chuẩn F1.', 'Active'),
        (4, 'Hiệu chuẩn đồng hồ đo áp suất', 'Calibration', 'APSUAT', 'ISOCAL-HC-APSUAT-01', '-1 - 25 bar', 'Hiệu chuẩn bằng bộ tạo áp khí nén và đồng hồ áp chuẩn độ chính xác cao.', 'Active'),
        (5, 'Hiệu chuẩn ampe kìm & đồng hồ vạn năng', 'Calibration', 'DIEN', 'ISOCAL-HC-DIEN-01', '0 - 1000 V / 1000 A', 'Hiệu chuẩn điện áp AC/DC, dòng điện và điện trở với Calibrator đa năng.', 'Active'),
        (6, 'Kiểm định nhiệt ẩm kế môi trường', 'Verification', 'NHIET', 'ISOCAL-KD-NHIET-01', '-20 - 70 °C, 10 - 95 %RH', 'Kiểm định nhiệt độ và độ ẩm tương đối trong buồng tạo chuẩn.', 'Active')
      ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('"service_types"', 'id'), COALESCE((SELECT MAX(id) FROM "service_types"), 1));
    `);

    // 2. Seed realistic devices matching exact existing schema columns
    await queryRunner.query(`
      INSERT INTO "devices" (
        "id",
        "customer_id",
        "name",
        "model",
        "manufacturer",
        "serial_number",
        "internal_code",
        "measuring_range",
        "is_group2",
        "next_due_date",
        "status"
      ) VALUES
        -- Customer 1: ABC Calibration Company (long@abc-calibration.com)
        (1,  1, 'Đồng hồ so điện tử Digimatic', 'ID-C112XB', 'Mitutoyo', 'MT-IDC-1102', 'TB-ABC-001', '0 - 12.7 mm / 0.001 mm', TRUE,  CURRENT_DATE + INTERVAL '14 days', 'ExpiringSoon'),
        (2,  1, 'Thước cặp cơ khí 150mm', '530-104', 'Mitutoyo', 'MT-530-8841', 'TB-ABC-002', '0 - 150 mm / 0.05 mm', FALSE, CURRENT_DATE + INTERVAL '180 days', 'Active'),
        (3,  1, 'Cân phân tích 4 số lẻ', 'MS204S', 'Mettler Toledo', 'MT-MS-4412', 'TB-ABC-003', '0 - 220 g / 0.1 mg', TRUE,  CURRENT_DATE - INTERVAL '30 days', 'Expired'),
        (4,  1, 'Ampe kìm đo dòng True-RMS', '376 FC', 'Fluke', 'FL-376-9022', 'TB-ABC-004', '0 - 1000 A AC/DC', FALSE, CURRENT_DATE + INTERVAL '240 days', 'Active'),
        (5,  1, 'Thiết bị đo nhiệt ẩm cầm tay', 'testo 625', 'Testo', NULL, 'TB-ABC-005', '-10 đến 60 °C / 0 đến 100 %RH', TRUE,  CURRENT_DATE + INTERVAL '7 days', 'ExpiringSoon'),
        (6,  1, 'Đồng hồ đo chênh áp kỹ thuật số', 'DPI 705', 'Druck', 'DR-705-1105', 'TB-ABC-006', '-1 đến 20 bar', TRUE,  CURRENT_DATE + INTERVAL '60 days', 'InRepair'),

        -- Customer 2: Vietnam Precision Engineering Co., Ltd. (huy@vietnamprecision.com)
        (7,  2, 'Panme đo ngoài điện tử 0-25mm', '293-240-30', 'Mitutoyo', 'MT-293-5519', 'TB-VPE-001', '0 - 25 mm / 0.001 mm', FALSE, CURRENT_DATE + INTERVAL '120 days', 'Active'),
        (8,  2, 'Máy đo tọa độ 3 chiều CMM', 'Crysta-Apex V574', 'Mitutoyo', 'MT-CMM-0091', 'TB-VPE-002', '500 x 700 x 400 mm', FALSE, CURRENT_DATE + INTERVAL '20 days', 'ExpiringSoon'),
        (9,  2, 'Đồng hồ áp suất màng inox', '232.50', 'WIKA', NULL, 'TB-VPE-003', '0 - 16 bar', TRUE,  CURRENT_DATE - INTERVAL '45 days', 'Expired'),

        -- Customer 3: Mekong Food Processing JSC (mai@mekongfood.com)
        (10, 3, 'Cân bàn điện tử công nghiệp', 'BBA231', 'Mettler Toledo', 'MT-BBA-7714', 'TB-MKF-001', '0 - 150 kg / 20 g', TRUE,  CURRENT_DATE + INTERVAL '90 days', 'Active'),
        (11, 3, 'Máy đo khúc xạ kế Abbe tự động', 'NAR-1T', 'Atago', 'AT-NAR-3028', 'TB-MKF-002', '1.3000 - 1.7000 nD / 0 - 95% Brix', FALSE, CURRENT_DATE + INTERVAL '10 days', 'ExpiringSoon'),
        (12, 3, 'Nhiệt kế hồng ngoại công nghiệp', '62 Max+', 'Fluke', 'FL-62-4410', 'TB-MKF-003', '-30 đến 650 °C', FALSE, CURRENT_DATE - INTERVAL '15 days', 'Expired'),

        -- Customer 5: Da Nang Medical Equipment Co., Ltd. (ha@danangmedical.com)
        (13, 5, 'Máy theo dõi bệnh nhân đa thông số', 'IntelliVue MP50', 'Philips', 'PH-MP50-9902', 'TB-DNM-001', 'SpO2 0-100%, NIBP 10-270 mmHg', TRUE,  CURRENT_DATE + INTERVAL '150 days', 'Active'),
        (14, 5, 'Máy phá rung tim có shock điện', 'Defigard HD-7', 'Schiller', 'SC-HD7-1045', 'TB-DNM-002', '2 - 360 Joules', TRUE,  CURRENT_DATE + INTERVAL '12 days', 'ExpiringSoon'),
        (15, 5, 'Tủ ấm vi sinh kỹ thuật số', 'IN55', 'Memmert', 'MM-IN55-8831', 'TB-DNM-003', '+5 °C đến +80 °C', FALSE, CURRENT_DATE - INTERVAL '60 days', 'Expired'),

        -- Customer 6: BTC (duongnthe180949@fpt.edu.vn)
        (16, 6, 'Máy hiện sóng số 4 kênh 100MHz', 'TBS1104', 'Tektronix', 'TEK-1104-5510', 'TB-BTC-001', '100 MHz, 1 GS/s', FALSE, CURRENT_DATE + INTERVAL '210 days', 'Active'),
        (17, 6, 'Nguồn chuẩn lập trình 3 ngõ ra', 'E3631A', 'Keysight', 'KS-3631-0023', 'TB-BTC-002', '0 - 6 V/5 A, 0 - ±25 V/1 A', FALSE, CURRENT_DATE + INTERVAL '25 days', 'ExpiringSoon'),
        (18, 6, 'Áp kế chuẩn số di động', 'DPI 104', 'Druck', NULL, 'TB-BTC-003', '0 - 70 bar, độ chính xác 0.05%', TRUE,  CURRENT_DATE - INTERVAL '10 days', 'Expired')
      ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('"devices"', 'id'), COALESCE((SELECT MAX(id) FROM "devices"), 1));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "devices" WHERE id BETWEEN 1 AND 18;`);
    await queryRunner.query(`DELETE FROM "service_types" WHERE id BETWEEN 1 AND 6;`);
  }
}

