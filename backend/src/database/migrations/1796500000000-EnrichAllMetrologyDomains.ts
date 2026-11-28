import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnrichAllMetrologyDomains1796500000000 implements MigrationInterface {
  name = 'EnrichAllMetrologyDomains1796500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. DROP LEFTOVER TRIGGER to dropped masterstandard table
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sync_master_standards ON master_standards CASCADE;
      DROP FUNCTION IF EXISTS sync_master_standards_to_masterstandard() CASCADE;
      DROP FUNCTION IF EXISTS sync_masterstandard_to_master_standards() CASCADE;
    `);

    // =========================================================================
    // 1. FIX SERVICE TYPE 4 (Áp kế công nghiệp) PARAMETERS: Sửa từ mmHg sang bar
    // =========================================================================
    // Xóa test points và parameters cũ của procedure 2 (Áp kế)
    await queryRunner.query(`
      DELETE FROM procedure_test_points
      WHERE parameter_id IN (SELECT id FROM procedure_parameters WHERE procedure_id = 2);
      DELETE FROM procedure_parameters WHERE procedure_id = 2;
    `);

    // Thêm parameters chuẩn theo bar (Áp kế công nghiệp 0 - 100 bar, Cấp chính xác 1.0)
    await queryRunner.query(`
      INSERT INTO procedure_parameters (id, procedure_id, name, unit, repeat_count, calculation_method)
      VALUES 
        (101, 2, 'Kiểm tra độ kín hệ thống áp suất (Tụt áp sau 3 phút tại 100 bar)', 'bar', 1, 'mean'),
        (102, 2, 'Kiểm tra sai số số chỉ khi tăng và giảm áp (Dải 0 - 100 bar)', 'bar', 2, 'mean'),
        (103, 2, 'Kiểm tra độ hồi sai / độ trễ kim giữa tăng và giảm áp', 'bar', 1, 'max');

      INSERT INTO procedure_test_points (parameter_id, point_no, nominal_value, tolerance, max_uncertainty)
      VALUES 
        (101, 1, 0.000, 1.000, 0.200),
        (102, 1, 0.000, 1.000, 0.200),
        (102, 2, 25.000, 1.000, 0.200),
        (102, 3, 50.000, 1.000, 0.200),
        (102, 4, 75.000, 1.000, 0.200),
        (102, 5, 100.000, 1.000, 0.200),
        (103, 1, 0.000, 1.000, 0.200),
        (103, 2, 25.000, 1.000, 0.200),
        (103, 3, 50.000, 1.000, 0.200),
        (103, 4, 75.000, 1.000, 0.200),
        (103, 5, 100.000, 1.000, 0.200);
    `);

    // =========================================================================
    // 2. ENRICH SERVICE TYPE 1 (Đồng hồ vạn năng DMM): Thêm các thang đo ACV, DCI, ACI, Điện trở
    // =========================================================================
    await queryRunner.query(`
      DELETE FROM procedure_test_points
      WHERE parameter_id IN (SELECT id FROM procedure_parameters WHERE procedure_id = 8);
      DELETE FROM procedure_parameters WHERE procedure_id = 8;

      INSERT INTO procedure_parameters (id, procedure_id, name, unit, repeat_count, calculation_method)
      VALUES 
        (104, 8, 'Kiểm tra điện áp một chiều (DC Voltage)', 'V', 1, 'mean'),
        (105, 8, 'Kiểm tra điện áp xoay chiều (AC Voltage 50Hz)', 'V', 1, 'mean'),
        (106, 8, 'Kiểm tra dòng điện một chiều (DC Current)', 'A', 1, 'mean'),
        (107, 8, 'Kiểm tra dòng điện xoay chiều (AC Current 50Hz)', 'A', 1, 'mean'),
        (108, 8, 'Kiểm tra điện trở (Resistance)', 'kΩ', 1, 'mean');

      INSERT INTO procedure_test_points (parameter_id, point_no, nominal_value, tolerance, max_uncertainty)
      VALUES 
        -- DCV
        (104, 1, 1.000, 0.001, 0.0002),
        (104, 2, 10.000, 0.005, 0.0010),
        (104, 3, 100.000, 0.050, 0.0100),
        (104, 4, 1000.000, 0.500, 0.1000),
        -- ACV
        (105, 1, 10.000, 0.050, 0.0100),
        (105, 2, 100.000, 0.500, 0.1000),
        (105, 3, 750.000, 4.000, 0.8000),
        -- DCI
        (106, 1, 0.010, 0.0001, 0.00002),
        (106, 2, 0.100, 0.0005, 0.00010),
        (106, 3, 1.000, 0.0050, 0.00100),
        (106, 4, 10.000, 0.0500, 0.01000),
        -- ACI
        (107, 1, 1.000, 0.0100, 0.00200),
        (107, 2, 10.000, 0.1000, 0.02000),
        -- Resistance
        (108, 1, 0.100, 0.0005, 0.0001),
        (108, 2, 1.000, 0.0020, 0.0005),
        (108, 3, 10.000, 0.0100, 0.0020),
        (108, 4, 100.000, 0.1000, 0.0200),
        (108, 5, 1000.000, 2.0000, 0.5000);
    `);

    // =========================================================================
    // 3. THÊM CÁC SERVICE TYPES MỚI (14 -> 27)
    // =========================================================================
    await queryRunner.query(`
      INSERT INTO service_types (id, name, kind, field, standard_code, measuring_range, description, status)
      VALUES
        -- APSUAT
        (14, 'Hiệu chuẩn Cảm biến áp suất & Bộ chuyển đổi áp suất công nghiệp', 'Calibration', 'APSUAT', 'ĐLVN 225:2010', '0 đến 250 bar / Tín hiệu ra: 4 – 20 mA, 0 – 10 VDC', 'Hiệu chuẩn bộ chuyển đổi và cảm biến áp suất công nghiệp theo ĐLVN 225:2010', 'Active'),
        (15, 'Kiểm định Van an toàn & Van giảm áp', 'Verification', 'APSUAT', 'ĐLVN 344:2020', '0.5 đến 40 bar (0.05 đến 4.0 MPa)', 'Kiểm định áp suất mở xả và đóng kín của van an toàn theo ĐLVN 344:2020', 'Active'),

        -- DIEN
        (16, 'Hiệu chuẩn Ampe kìm (Ampe kẹp AC/DC - Clamp Meter)', 'Calibration', 'DIEN', 'ĐLVN 106:2002', 'Dòng AC/DC: 0.1 A – 1000 A; Điện áp AC/DC: đến 600V', 'Hiệu chuẩn ampe kẹp đo dòng điện xoay chiều và một chiều theo ĐLVN 106:2002', 'Active'),
        (17, 'Hiệu chuẩn Thiết bị đo điện trở cách điện (Megohmmeter)', 'Calibration', 'DIEN', 'ĐLVN 138:2004', 'Điện áp thử: 250V, 500V, 1000V; Điện trở: 0.1 MΩ – 2000 MΩ', 'Hiệu chuẩn máy đo điện trở cách điện cao áp theo ĐLVN 138:2004', 'Active'),
        (18, 'Hiệu chuẩn Thiết bị đo điện trở tiếp địa & chống sét', 'Calibration', 'DIEN', 'ĐLVN 139:2004', '0.01 Ω đến 2000 Ω (Thang đo: 20Ω, 200Ω, 2000Ω)', 'Hiệu chuẩn máy đo điện trở đất và hệ thống chống sét theo ĐLVN 139:2004', 'Active'),
        (19, 'Hiệu chuẩn Máy hiện sóng (Oscilloscope cơ & số)', 'Calibration', 'DIEN', 'TCVN/ISO 17025', 'Băng thông: 20 MHz – 500 MHz, Biên độ: 1 mV/div – 10 V/div', 'Hiệu chuẩn dao động ký tương tự và hiện số theo tiêu chuẩn ISO/IEC 17025', 'Active'),

        -- KHOILUONG
        (20, 'Kiểm định Cân bàn & Cân sàn điện tử công nghiệp', 'Verification', 'KHOILUONG', 'ĐLVN 14:2009', '15 kg đến 2000 kg (Cấp chính xác III / Cân công nghiệp)', 'Kiểm định cân bàn, cân đĩa và cân sàn theo ĐLVN 14:2009', 'Active'),
        (21, 'Hiệu chuẩn Bộ quả cân chuẩn (Cấp chính xác F1, F2, M1)', 'Calibration', 'KHOILUONG', 'ĐLVN 286:2015', '1 mg đến 20 kg (Quả cân đơn và bộ quả cân)', 'Hiệu chuẩn xác định khối lượng quy ước của quả cân theo ĐLVN 286:2015', 'Active'),
        (22, 'Hiệu chuẩn Lực kế & Máy thử độ bền kéo nén', 'Calibration', 'KHOILUONG', 'ĐLVN 108:2002', '10 N đến 50 kN (Phép thử kéo và nén)', 'Hiệu chuẩn lực kế và máy thử nghiệm cơ lý theo ĐLVN 108:2002 / TCVN ISO 7500-1', 'Active'),
        (23, 'Hiệu chuẩn Cờ lê lực / Cần xiết lực (Torque Wrench)', 'Calibration', 'KHOILUONG', 'TCVN 11952:2017', '10 N.m đến 1000 N.m (Cơ khí bật tách và điện tử)', 'Hiệu chuẩn dụng cụ xiết mô-men lực theo TCVN 11952:2017 / ISO 6789', 'Active'),

        -- NHIET
        (24, 'Hiệu chuẩn Nhiệt kế hiện số & Cảm biến nhiệt độ công nghiệp', 'Calibration', 'NHIET', 'ĐLVN 137:2004', '-50°C đến +1200°C (Cảm biến Pt100, Can nhiệt Thermocouple K, J, S)', 'Hiệu chuẩn nhiệt kế hiện số và cảm biến nhiệt độ theo ĐLVN 137:2004 / ĐLVN 23:2011', 'Active'),
        (25, 'Hiệu chuẩn Nhiệt kế thủy tinh chất lỏng', 'Calibration', 'NHIET', 'ĐLVN 20:2009', '-30°C đến +300°C / Độ chia: 0.1°C, 0.5°C, 1°C', 'Hiệu chuẩn nhiệt kế thủy tinh chất lỏng theo ĐLVN 20:2009', 'Active'),
        (26, 'Hiệu chuẩn Nhiệt ẩm kế tự ghi & Data Logger nhiệt ẩm', 'Calibration', 'NHIET', 'ĐLVN 358:2020', '10°C đến 50°C / 20% đến 95% RH', 'Hiệu chuẩn nhiệt ẩm kế điện tử và bộ ghi tự động theo ĐLVN 358:2020', 'Active'),
        (27, 'Hiệu chuẩn Súng đo nhiệt độ hồng ngoại & Nhiệt kế bức xạ', 'Calibration', 'NHIET', 'ĐLVN 272:2014', '-20°C đến +500°C (Độ phát xạ ε = 0.95)', 'Hiệu chuẩn nhiệt kế bức xạ hồng ngoại theo ĐLVN 272:2014', 'Active')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        kind = EXCLUDED.kind,
        field = EXCLUDED.field,
        standard_code = EXCLUDED.standard_code,
        measuring_range = EXCLUDED.measuring_range,
        description = EXCLUDED.description,
        status = EXCLUDED.status;
    `);

    // =========================================================================
    // 4. THÊM MASTER STANDARDS MỚI (17 -> 24)
    // =========================================================================
    await queryRunner.query(`
      INSERT INTO master_standards (id, name, serial_number, accuracy_class, calibration_expiry, status)
      VALUES
        (17, 'Cuộn dây phát dòng chuẩn 50 vòng Fluke 5500A/COIL', 'FLK-COIL-50T-01', '0.25%', '2028-12-31', 'Active'),
        (18, 'Hộp điện trở chuẩn cao áp và cách điện Fluke 5322A Calibrator', 'FLK-5322A-9921', '0.1%', '2028-12-31', 'Active'),
        (19, 'Bộ quả cân chuẩn công nghiệp cấp M1 (500kg gồm các quả 20kg)', 'QC-M1-SET-500K', 'Cấp M1', '2028-12-31', 'Active'),
        (20, 'Hệ thống chuẩn kiểm tra mô-men xoắn Norbar Torque System (10 - 1000 N.m)', 'NOR-TQS-1000', '0.5%', '2028-12-31', 'Active'),
        (21, 'Bể ổn nhiệt chuẩn khô cao cấp Fluke 9144 (-25°C đến 660°C)', 'FLK-9144-CAL-02', '±0.05°C', '2028-12-31', 'Active'),
        (22, 'Nguồn phát xạ vật đen chuẩn Fluke 4181 Precision Blackbody (35°C đến 500°C)', 'FLK-4181-BB-88', '±0.35°C', '2028-12-31', 'Active'),
        (23, 'Buồng tạo nhiệt ẩm chuẩn Rotronic HygroCal & Gương sương chuẩn', 'ROT-HYGROCAL-11', '±1.0% RH / ±0.1°C', '2028-12-31', 'Active'),
        (24, 'Bệ thử và kiểm định van an toàn tự động Ventil Test Bench (0 - 400 bar)', 'VEN-SRV-400B', '0.25%', '2028-12-31', 'Active')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        serial_number = EXCLUDED.serial_number,
        accuracy_class = EXCLUDED.accuracy_class,
        calibration_expiry = EXCLUDED.calibration_expiry,
        status = EXCLUDED.status;
    `);

    // =========================================================================
    // 5. THÊM CALIBRATION PROCEDURES (11 -> 24) CHO CÁC SERVICE TYPES MỚI
    // =========================================================================
    await queryRunner.query(`
      INSERT INTO calibration_procedures (id, service_type_id, version, environment_requirement, required_equipment, effective_from, status)
      VALUES
        -- 11 (st 14 - Cảm biến áp suất)
        (11, 14, 'ĐLVN 225:2010 (V1.0)',
         '{"temperature_c": {"min": 18, "max": 25, "ideal": 20, "display": "20°C ± 2°C"}, "humidity_percent": {"min": 30, "max": 80, "display": "≤ 80% RH"}, "note": "Ổn định cảm biến trong phòng đo tối thiểu 2 giờ. Nguồn cấp DC phải ổn định không gợn sóng."}'::jsonb,
         '["Áp kế chuẩn hiện số Fluke 700G31 (cấp 0.05)","Máy phát áp lực thủy lực/khí nén","Đồng hồ đo dòng miliampe chuẩn Fluke 754/5522A","Bộ nguồn DC chuẩn 24V"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 12 (st 15 - Van an toàn)
        (12, 15, 'ĐLVN 344:2020 (V1.0)',
         '{"temperature_c": {"min": 15, "max": 35, "ideal": 25, "display": "15°C – 35°C"}, "humidity_percent": {"min": 30, "max": 85, "display": "≤ 85% RH"}, "note": "Thử nghiệm trên bệ thử chuyên dụng có lồng chắn an toàn bảo vệ kỹ thuật viên."}'::jsonb,
         '["Bệ thử kiểm định van an toàn chuyên dụng Ventil (0 - 400 bar)","Áp kế chuẩn số Fluke 700G31","Đồng hồ bấm giây kiểm tra độ kín"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 13 (st 16 - Ampe kìm)
        (13, 16, 'ĐLVN 106:2002 (V1.0)',
         '{"temperature_c": {"min": 20, "max": 26, "ideal": 23, "display": "23°C ± 3°C"}, "humidity_percent": {"min": 30, "max": 70, "display": "30% – 70% RH"}, "note": "Phòng kiểm định tránh nguồn từ trường mạnh ngoài. Sấy máy chuẩn tối thiểu 30 phút."}'::jsonb,
         '["Nguồn phát chuẩn Fluke Calibrator 5522A","Cuộn dây phát dòng chuẩn 50 vòng Fluke 5500A/COIL","Bộ dây đo chống nhiễu chuyên dụng"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 14 (st 17 - Megohmmeter)
        (14, 17, 'ĐLVN 138:2004 (V1.0)',
         '{"temperature_c": {"min": 20, "max": 26, "ideal": 23, "display": "23°C ± 3°C"}, "humidity_percent": {"min": 30, "max": 70, "display": "30% – 70% RH"}, "note": "Bàn thử bọc cao su chống tĩnh điện, thảm cách điện cao áp, hệ thống tiếp địa an toàn."}'::jsonb,
         '["Hộp điện trở chuẩn cao áp và máy chuẩn Fluke 5322A Calibrator","Đầu đo cao áp chống phóng điện"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 15 (st 18 - Đo tiếp địa)
        (15, 18, 'ĐLVN 139:2004 (V1.0)',
         '{"temperature_c": {"min": 20, "max": 26, "ideal": 23, "display": "23°C ± 3°C"}, "humidity_percent": {"min": 30, "max": 70, "display": "30% – 70% RH"}, "note": "Đo kiểm theo phương pháp 4 dây để loại trừ điện trở dây nối và tiếp xúc."}'::jsonb,
         '["Hộp điện trở chuẩn độ chính xác cao 4 dây (0.01Ω - 2000Ω)","Bộ cáp đo đồng trục chống nhiễu"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 16 (st 19 - Oscilloscope)
        (16, 19, 'TCVN/ISO 17025 (V1.0)',
         '{"temperature_c": {"min": 21, "max": 25, "ideal": 23, "display": "23°C ± 2°C"}, "humidity_percent": {"min": 40, "max": 60, "display": "40% – 60% RH"}, "note": "Phòng đo chống nhiễu điện từ EMI/RFI. Sấy ấm máy hiện sóng tối thiểu 20 phút."}'::jsonb,
         '["Nguồn phát chuẩn Fluke Calibrator 5522A tích hợp Module sóng chuẩn Oscilloscope 500MHz","Cáp đồng trục 50Ω tiêu chuẩn kèm tải kết thúc 50Ω"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 17 (st 20 - Cân bàn, cân sàn)
        (17, 20, 'ĐLVN 14:2009 (V1.0)',
         '{"temperature_c": {"min": 15, "max": 30, "ideal": 22, "display": "15°C – 30°C"}, "humidity_percent": {"min": 30, "max": 80, "display": "≤ 80% RH"}, "note": "Nền đặt cân bằng phẳng, kiên cố, không bị võng lún hoặc rung lắc, tránh gió lùa mạnh."}'::jsonb,
         '["Bộ quả cân chuẩn công nghiệp cấp M1 (500kg)","Xe đẩy nâng tải chuyên dụng","Nhiệt ẩm kế tự ghi"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 18 (st 21 - Bộ quả cân chuẩn)
        (18, 21, 'ĐLVN 286:2015 (V1.0)',
         '{"temperature_c": {"min": 19, "max": 21, "ideal": 20, "display": "20°C ± 1°C"}, "humidity_percent": {"min": 45, "max": 60, "display": "45% – 60% RH"}, "note": "Phòng cân vi lượng chống rung tuyệt đối, không có luồng khí đối lưu. Ổn định quả cân 24 giờ."}'::jsonb,
         '["Cân so khối lượng vi lượng (Mass Comparator)","Bộ quả cân chuẩn đối chứng cấp E2 Mettler Toledo","Kẹp gắp quả cân bọc nhung và găng tay chuyên dụng"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 19 (st 22 - Lực kế kéo nén)
        (19, 22, 'ĐLVN 108:2002 (V1.0)',
         '{"temperature_c": {"min": 15, "max": 25, "ideal": 20, "display": "20°C ± 5°C"}, "humidity_percent": {"min": 30, "max": 75, "display": "≤ 75% RH"}, "note": "Gá đặt cảm biến đồng trục với hướng tác dụng lực. Khởi động tạo tải sơ bộ 3 lần trước khi đo."}'::jsonb,
         '["Cảm biến lực chuẩn Loadcell Cấp 0.5 (10N - 50kN)","Khung giá tạo lực kéo nén chuẩn","Bộ hiển thị số lực chuẩn"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 20 (st 23 - Cờ lê lực)
        (20, 23, 'TCVN 11952:2017 (V1.0)',
         '{"temperature_c": {"min": 18, "max": 24, "ideal": 20, "display": "20°C ± 3°C"}, "humidity_percent": {"min": 30, "max": 70, "display": "30% – 70% RH"}, "note": "Kẹp giữ cờ lê lực đúng vị trí tâm tay nắm, tốc độ gia tải đều đặn không giật cục."}'::jsonb,
         '["Hệ thống chuẩn kiểm tra mô-men xoắn Norbar Torque System (10 - 1000 N.m)","Đầu gá vuông tiêu chuẩn các cỡ"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 21 (st 24 - Nhiệt kế hiện số & Pt100)
        (21, 24, 'ĐLVN 137:2004 (V1.0)',
         '{"temperature_c": {"min": 18, "max": 25, "ideal": 20, "display": "20°C ± 3°C"}, "humidity_percent": {"min": 30, "max": 75, "display": "≤ 75% RH"}, "note": "Nhúng ngập đầu dò nhiệt ít nhất 15 lần đường kính que đo. Chờ nhiệt độ ổn định hoàn toàn trước khi ghi số liệu."}'::jsonb,
         '["Bể ổn nhiệt chuẩn khô cao cấp Fluke 9144 (-25°C đến 660°C)","Nhiệt kế chuẩn bạch kim điện trở SPRT Pt25/Pt100","Bộ đọc chuẩn Super-DAQ Fluke 1586A"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 22 (st 25 - Nhiệt kế thủy tinh)
        (22, 25, 'ĐLVN 20:2009 (V1.0)',
         '{"temperature_c": {"min": 18, "max": 25, "ideal": 20, "display": "20°C ± 3°C"}, "humidity_percent": {"min": 30, "max": 75, "display": "≤ 75% RH"}, "note": "Đặt nhiệt kế thẳng đứng trong bể ổn nhiệt tuần hoàn chất lỏng, dùng kính lúp đọc vạch chia tránh sai số thị sai."}'::jsonb,
         '["Bể ổn nhiệt tuần hoàn chất lỏng chuẩn","Bình chuẩn điểm băng 0°C (Ice Point Bath)","Kính phóng đại đọc vạch chia quang học"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 23 (st 26 - Nhiệt ẩm kế tự ghi)
        (23, 26, 'ĐLVN 358:2020 (V1.0)',
         '{"temperature_c": {"min": 21, "max": 25, "ideal": 23, "display": "23°C ± 2°C"}, "humidity_percent": {"min": 30, "max": 70, "display": "30% – 70% RH"}, "note": "Đặt đầu đo trong buồng tạo ẩm chuẩn kín khí tối thiểu 45 phút cho mỗi mức thử nghiệm."}'::jsonb,
         '["Buồng tạo nhiệt ẩm chuẩn Rotronic HygroCal","Gương sương chuẩn xác định độ ẩm chính xác cao (Chilled Mirror Hygrometer)"]'::jsonb,
         '2024-01-01', 'Active'),

        -- 24 (st 27 - Súng đo nhiệt hồng ngoại)
        (24, 27, 'ĐLVN 272:2014 (V1.0)',
         '{"temperature_c": {"min": 20, "max": 26, "ideal": 23, "display": "23°C ± 3°C"}, "humidity_percent": {"min": 30, "max": 70, "display": "≤ 70% RH"}, "note": "Căn chỉnh trục quang học của súng đo vuông góc với tâm bề mặt phát xạ vật đen. Khoảng cách đo theo tỷ lệ D:S."}'::jsonb,
         '["Nguồn phát xạ vật đen chuẩn Fluke 4181 Precision Blackbody (35°C đến 500°C)","Giá gá đặt định vị quang học laser"]'::jsonb,
         '2024-01-01', 'Active')
      ON CONFLICT (id) DO UPDATE SET
        service_type_id = EXCLUDED.service_type_id,
        version = EXCLUDED.version,
        environment_requirement = EXCLUDED.environment_requirement,
        required_equipment = EXCLUDED.required_equipment,
        status = EXCLUDED.status;
    `);

    // =========================================================================
    // 6. THÊM PROCEDURE STEPS (4 - 5 BƯỚC CHUẨN ĐLVN CHO TỪNG QUY TRÌNH 11 -> 24)
    // =========================================================================
    await queryRunner.query(`
      DELETE FROM procedure_steps WHERE procedure_id BETWEEN 11 AND 24;

      INSERT INTO procedure_steps (procedure_id, step_no, instruction, requires_evidence) VALUES
        -- Proc 11 (Cảm biến áp suất)
        (11, 1, 'Chuẩn bị & Ổn định nhiệt: Đặt cảm biến trong phòng đo 2 giờ, cấp nguồn 24VDC sấy máy 15 phút, đấu nối đầu ra với đồng hồ đo dòng chuẩn mA.', FALSE),
        (11, 2, 'Kiểm tra ngoại quan: Nhãn mác, số chế tạo, dải áp suất làm việc, ren kết nối không trầy xước, giắc cắm điện chắc chắn.', FALSE),
        (11, 3, 'Kiểm tra kỹ thuật & Tín hiệu Zero: Tại áp suất khí quyển 0 bar, đo dòng điện ra (chuẩn 4.000 mA ± 0.05 mA).', TRUE),
        (11, 4, 'Kiểm tra đo lường (Độ tuyến tính biến đổi tín hiệu): Tăng và giảm áp suất qua 5 điểm chuẩn (0, 50, 100, 150, 200, 250 bar), ghi nhận dòng điện ra mA.', FALSE),
        (11, 5, 'Đánh giá sai số quy đổi & Kết luận: Tính toán sai số tín hiệu mA quy đổi ra áp suất bar so với cấp chính xác của cảm biến.', TRUE),

        -- Proc 12 (Van an toàn)
        (12, 1, 'Chuẩn bị & Gá đặt: Vệ sinh sạch cửa vào và cửa xả của van. Gá chặt van an toàn lên bệ thử chuyên dụng theo phương thẳng đứng, đóng lồng bảo vệ.', FALSE),
        (12, 2, 'Kiểm tra ngoại quan: Thân van nguyên vẹn, lò xo và nắp chụp chắc chắn, đĩa van không han rỉ, vít niêm chì còn nguyên nếu là kiểm định định kỳ.', FALSE),
        (12, 3, 'Kiểm tra áp suất bắt đầu mở xả (Set Pressure): Tăng áp từ từ với tốc độ ≤ 0.1 bar/s cho đến khi van bắt đầu xả xì hơi (ghi áp suất mở P_set), thử lặp lại 3 lần.', TRUE),
        (12, 4, 'Kiểm tra áp suất đóng lại (Reseating Pressure): Giảm dần áp suất cho đến khi van đóng kín hoàn toàn, ghi áp suất đóng P_close (yêu cầu ≥ 85% P_set).', FALSE),
        (12, 5, 'Kiểm tra độ kín đĩa van sau khi đóng (Seat Tightness): Duy trì áp suất ở mức 90% P_set trong 1 phút, kiểm tra độ rò rỉ bọt khí qua ống xả theo ĐLVN 344:2020.', TRUE),

        -- Proc 13 (Ampe kìm)
        (13, 1, 'Chuẩn bị thiết bị: Bật nguồn máy phát chuẩn Fluke 5522A sấy máy 30 phút. Kiểm tra pin, cơ cấu cơ khí mở ngàm kẹp của ampe kìm trơn tru kín khít.', FALSE),
        (13, 2, 'Kiểm tra ngoại quan & Cách điện: Vỏ nhựa không nứt vỡ rò rỉ, vạch chỉ thị hiển thị rõ ràng không mất nét.', FALSE),
        (13, 3, 'Kiểm tra chức năng đo dòng xoay chiều ACA: Luồn ngàm kẹp vào giữa cuộn dây phát dòng chuẩn 50 vòng, phát các mức dòng chuẩn 10A, 50A, 100A, 300A, 600A, 1000A.', FALSE),
        (13, 4, 'Kiểm tra chức năng đo dòng một chiều DCA & Điện áp ACV: Kiểm tra điểm 0 khi mở/đóng ngàm kẹp, phát dòng DCA 10A, 50A, 100A và áp ACV 100V, 400V.', FALSE),
        (13, 5, 'Đánh giá độ lệch vị trí dây dẫn trong ngàm kẹp & Kết luận: Dịch chuyển dây dẫn tới các góc ngàm kẹp, đánh giá sai số vị trí và cấp chính xác tổng.', TRUE),

        -- Proc 14 (Megohmmeter)
        (14, 1, 'Chuẩn bị an toàn cao áp: Đeo găng tay cách điện, trải thảm cao su chống tĩnh điện, kết nối cọc nối đất của máy chuẩn Fluke 5322A.', FALSE),
        (14, 2, 'Kiểm tra ngoại quan: Nút nhấn xả điện tích cao áp hoạt động tốt, đồng hồ chỉ thị hoặc màn hình số hiển thị rõ, que đo cao áp lành lặn.', FALSE),
        (14, 3, 'Kiểm tra điện áp phát danh định: Cài đặt các thang 250V, 500V, 1000V; đo điện áp mở mạch thực tế phát ra (yêu cầu không lệch quá ±10% điện áp danh định).', TRUE),
        (14, 4, 'Kiểm tra sai số điện trở cách điện: Nối que đo vào hộp điện trở chuẩn, thử tại các mức 1 MΩ, 10 MΩ, 50 MΩ, 100 MΩ, 500 MΩ, 1000 MΩ.', FALSE),
        (14, 5, 'Kiểm tra chức năng xả điện tích tự động & Đánh giá kết quả: Đảm bảo thiết bị tự động xả điện áp tích lũy sau mỗi lần ngắt đo về < 50V trong 10 giây.', TRUE),

        -- Proc 15 (Đo tiếp địa)
        (15, 1, 'Chuẩn bị & Đấu nối 4 dây: Đấu nối các cọc C (Current), P (Potential), E (Earth) của máy đo tiếp địa với hộp điện trở chuẩn theo sơ đồ 4 dây Kelvin.', FALSE),
        (15, 2, 'Kiểm tra ngoại quan & Điện áp pin: Kiểm tra cảnh báo pin yếu, que cắm và cọc đấu dây đồng thau không bị oxy hóa.', FALSE),
        (15, 3, 'Kiểm tra điện áp đất giả lập (Earth Voltage): Thử khả năng triệt tiêu điện áp nhiễu nền xoay chiều của máy đo tiếp địa tại 5V, 10V / 50Hz.', FALSE),
        (15, 4, 'Kiểm tra sai số thang đo điện trở đất: Đo so sánh tại các điểm 1Ω, 5Ω, 10Ω, 50Ω, 100Ω, 500Ω, 1000Ω trên các thang đo 20Ω, 200Ω, 2000Ω.', FALSE),
        (15, 5, 'Đánh giá sai số cơ bản & Độ lặp lại: Lặp lại phép đo 3 lần tại 10Ω, tính sai số tương đối và kết luận theo ĐLVN 139:2004.', TRUE),

        -- Proc 16 (Oscilloscope)
        (16, 1, 'Khởi động & Tự chuẩn (Self-Cal): Bật máy sấy 20 phút, chạy chức năng Auto-Calibration nội bộ của máy hiện sóng trước khi đo.', FALSE),
        (16, 2, 'Kiểm tra ngoại quan & Độ ổn định đường quét: Màn hình sáng đều, tia quét không bị méo mó, các núm chỉnh độ nhạy Volt/div và Time/div trơn tru.', FALSE),
        (16, 3, 'Kiểm tra sai số biên độ điện áp một chiều (DC Amplitude): Phát các mức điện áp chuẩn DC 10mV, 100mV, 1V, 10V vào kênh CH1 và CH2 (chuẩn tải 1MΩ).', FALSE),
        (16, 4, 'Kiểm tra sai số cơ sở thời gian (Timebase Error): Phát chuỗi xung chuẩn chu kỳ 10ns, 1µs, 1ms, đo độ lệch tần số và thời gian quét ngang.', FALSE),
        (16, 5, 'Kiểm tra độ rộng băng thông (-3 dB Bandwidth): Tăng dần tần số sóng sin đến tần số danh định (ví dụ 100MHz), kiểm tra biên độ suy giảm không vượt quá -3dB.', TRUE),

        -- Proc 17 (Cân bàn, cân sàn)
        (17, 1, 'Chuẩn bị mặt bằng & Cân bằng bọt thủy: Đặt cân trên nền bê tông phẳng, chỉnh 4 chân đế cho bọt thủy vào tâm, làm nóng cân điện tử 30 phút.', FALSE),
        (17, 2, 'Kiểm tra ngoại quan: Mặt bàn cân không bị gỉ sét biến dạng, màn hình hiển thị số chỉ rõ nét, cơ cấu chống quá tải hoạt động tốt.', FALSE),
        (17, 3, 'Kiểm tra độ lặp lại (Repeatability): Đặt tải 50% Max và 100% Max lặp lại 3 lần mỗi mức, ghi nhận sai số số chỉ.', FALSE),
        (17, 4, 'Kiểm tra độ lệch tâm (Eccentricity): Đặt tải 25% Max lần lượt tại 4 góc của mặt bàn cân và tại tâm, chênh lệch không vượt quá MPE.', TRUE),
        (17, 5, 'Kiểm tra sai số số chỉ (Linearity): Tăng tải và giảm tải qua các mức 0, 20kg, 100kg, 300kg, 500kg (hoặc Max), đánh giá sai số theo ĐLVN 14:2009.', TRUE),

        -- Proc 18 (Bộ quả cân chuẩn)
        (18, 1, 'Chuẩn bị & Ổn định nhiệt quả cân: Đặt quả cân cần hiệu chuẩn và quả cân chuẩn E2 trong phòng cân vi lượng tối thiểu 24 giờ trước khi đo.', FALSE),
        (18, 2, 'Kiểm tra ngoại quan & Vệ sinh: Dùng chổi lông mềm quét bụi, bề mặt quả cân sáng bóng, không có vết xước sâu hay rỉ sét, hốc điều chỉnh nguyên vẹn.', FALSE),
        (18, 3, 'Thao tác cân so sánh theo chu trình ABBA: Cân quả chuẩn A -> Cân quả kiểm B -> Cân quả kiểm B -> Cân quả chuẩn A trên cân so vi lượng.', TRUE),
        (18, 4, 'Tính toán khối lượng quy ước & Hiệu chỉnh lực đẩy không khí: Áp dụng công thức hiệu chỉnh lực đẩy Acsimet dựa trên nhiệt độ, độ ẩm và áp suất khí quyển phòng đo.', FALSE),
        (18, 5, 'Đánh giá độ không đảm bảo đo U & Kết luận cấp chính xác: So sánh sai số khối lượng quy ước và độ không đảm bảo đo mở rộng với giới hạn sai số cho phép theo ĐLVN 286:2015.', TRUE),

        -- Proc 19 (Lực kế kéo nén)
        (19, 1, 'Gá đặt cảm biến: Lắp đặt lực kế vào khung giá thử chuẩn, căn chỉnh tuyệt đối đồng trục theo phương kéo hoặc nén, cấp nguồn khởi động 20 phút.', FALSE),
        (19, 2, 'Tác dụng tải sơ bộ (Preloading): Tăng tải 3 lần lên tới 100% tải danh định rồi xả về 0 để giải phóng ứng suất dư cơ khí trong cảm biến lực.', FALSE),
        (19, 3, 'Kiểm tra điểm 0 & Độ hồi không tải: Đưa số chỉ về 0.0 N, kiểm tra độ ổn định trôi điểm không trong 3 phút.', FALSE),
        (19, 4, 'Kiểm tra đo lường sai số chiều kéo và nén: Tăng tải qua các điểm 10%, 20%, 40%, 60%, 80%, 100% dải đo, lặp lại 2 chu trình đo độc lập.', FALSE),
        (19, 5, 'Đánh giá độ lặp lại, độ hồi sai & Kết luận: Tính toán độ hồi sai cơ học (Hysteresis), độ lặp lại và cấp chính xác thiết bị theo ĐLVN 108:2002.', TRUE),

        -- Proc 20 (Cờ lê lực)
        (20, 1, 'Chuẩn bị thiết bị: Gá đầu vuông của cờ lê lực vào cảm biến đo mô-men xoắn của hệ thống chuẩn Norbar, chỉnh điểm 0 của hệ thống chuẩn.', FALSE),
        (20, 2, 'Tác dụng tải sơ bộ: Kích hoạt cờ lê lực nhảy tách 3 lần tại mức 100% Max mô-men xoắn để bôi trơn đều cơ cấu lò xo cơ khí bên trong.', FALSE),
        (20, 3, 'Kiểm tra sai số tại 20% mô-men xoắn Max: Tác dụng lực từ từ theo phương thẳng đứng với tay cầm, ghi nhận giá trị mô-men xoắn thực tế tại thời điểm tách, lặp lại 5 lần.', FALSE),
        (20, 4, 'Kiểm tra sai số tại 60% và 100% mô-men xoắn Max: Thực hiện tương tự 5 lần tại mức 60% và 5 lần tại mức 100% Max mô-men xoắn danh định.', FALSE),
        (20, 5, 'Tính sai số tương đối trung bình & Cấp chính xác: Tính độ lệch tương đối trung bình của 5 lần đo tại mỗi mức, so sánh với giới hạn ±4% (hoặc ±2% với loại điện tử) theo ISO 6789.', TRUE),

        -- Proc 21 (Nhiệt kế hiện số & Pt100)
        (21, 1, 'Chuẩn bị thiết bị & Lắp đặt: Cắm ngập đầu dò Pt100 của nhiệt kế cần hiệu chuẩn và nhiệt kế chuẩn SPRT vào cùng một khối đồng tâm trong bể ổn nhiệt khô Fluke 9144.', FALSE),
        (21, 2, 'Kiểm tra ngoại quan: Vỏ bọc inox bảo vệ đầu dò không bị nứt vỡ rỉ sét, màn hình hiển thị số không bị mờ nhạt, dây cáp chịu nhiệt nguyên vẹn.', FALSE),
        (21, 3, 'Kiểm tra điểm băng 0°C (Ice Point Check): Nhúng đầu dò vào bình chuẩn điểm băng nước tinh khiết đá bào, đo kiểm tra sai số tại 0.00°C.', TRUE),
        (21, 4, 'Kiểm tra sai số tại các điểm nhiệt độ cao: Cài đặt bể chuẩn tại các mức 50°C, 100°C, 200°C, 400°C, 600°C; chờ bể ổn định trong 15 phút rồi ghi đồng thời số chỉ chuẩn và số chỉ thiết bị.', FALSE),
        (21, 5, 'Tính toán sai số chỉ thị & Đánh giá U: Lập bảng sai số và phương trình hồi quy hiệu chỉnh nhiệt độ cho cảm biến theo ĐLVN 137:2004.', TRUE),

        -- Proc 22 (Nhiệt kế thủy tinh)
        (22, 1, 'Kiểm tra ngoại quan trước khi đo: Cột chất lỏng (thủy ngân hoặc cồn hữu cơ) phải liền mạch không bị đứt đoạn, không có bọt khí trong mao dẫn, thang chia độ rõ nét.', FALSE),
        (22, 2, 'Kiểm tra điểm băng 0°C: Cắm ngập nhiệt kế vào bình chuẩn điểm băng trong 15 phút, dùng kính lúp đọc vạch chia kiểm tra điểm 0°C.', TRUE),
        (22, 3, 'Kiểm tra tại các điểm nhiệt độ trong bể chất lỏng: Nhúng ngập nhiệt kế đến vạch ngập quy định trong bể chuẩn tại các mức 20°C, 40°C, 60°C, 80°C, 100°C.', FALSE),
        (22, 4, 'Đọc số chỉ theo phương vuông góc: Mắt nhìn vuông góc với mao dẫn tại đỉnh mặt khum chất lỏng để triệt tiêu sai số thị sai (Parallax error).', FALSE),
        (22, 5, 'Tính sai số số chỉ và cấp Giấy chứng nhận: So sánh với sai số cho phép MPE theo ĐLVN 20:2009.', TRUE),

        -- Proc 23 (Nhiệt ẩm kế tự ghi)
        (23, 1, 'Đặt thiết bị vào buồng tạo ẩm chuẩn: Đặt nhiệt ẩm kế tự ghi vào khoang làm việc của buồng chuẩn Rotronic HygroCal, đóng kín nắp cách ly.', FALSE),
        (23, 2, 'Kiểm tra ngoại quan: Vỏ máy chắc chắn, màn hình hiển thị cả nhiệt độ (°C) và độ ẩm (% RH), chức năng lưu thẻ nhớ hoặc kết nối máy tính tốt.', FALSE),
        (23, 3, 'Kiểm tra sai số nhiệt độ: Duy trì buồng ở các mức 20°C, 25°C, 30°C (ở độ ẩm 50% RH), chờ ổn định 30 phút rồi ghi số liệu so sánh.', FALSE),
        (23, 4, 'Kiểm tra sai số độ ẩm tương đối: Cố định nhiệt độ 25°C, thay đổi độ ẩm buồng chuẩn qua các mức 30% RH, 50% RH, 70% RH, 85% RH, chờ ổn định 45 phút mỗi mức.', FALSE),
        (23, 5, 'Đánh giá độ trôi số chỉ & Kết luận: So sánh sai số đo độ ẩm (yêu cầu ≤ ±3% RH) và sai số đo nhiệt độ (≤ ±0.5°C) theo ĐLVN 358:2020.', TRUE),

        -- Proc 24 (Súng đo nhiệt hồng ngoại)
        (24, 1, 'Chuẩn bị nguồn vật đen chuẩn: Bật nguồn bộ phát xạ vật đen chuẩn Fluke 4181, cài đặt nhiệt độ chuẩn cần thử nghiệm, chờ đạt trạng thái cân bằng nhiệt.', FALSE),
        (24, 2, 'Kiểm tra ngoại quan & Thấu kính: Thấu kính quang học sạch sẽ không bị bám bụi bẩn hoặc trầy xước, tia laser định vị chiếu thẳng góc vào tâm vật đen.', FALSE),
        (24, 3, 'Cài đặt hệ số phát xạ: Cài đặt hệ số phát xạ trên súng đo nhiệt hồng ngoại về đúng giá trị ε = 0.95 (phù hợp với đĩa phát xạ của nguồn chuẩn Fluke 4181).', TRUE),
        (24, 4, 'Đo kiểm tại các điểm nhiệt độ danh định: Định vị súng đo cách mặt vật đen 30cm, đo kiểm tra tại các điểm 0°C, 50°C, 100°C, 200°C, 350°C, 500°C (mỗi điểm đo 3 lần).', FALSE),
        (24, 5, 'Tính sai số trung bình & Đánh giá sai số thị trường: Tính toán sai số trung bình tại từng điểm nhiệt độ, đánh giá sai số góc nghiêng và kết luận theo ĐLVN 272:2014.', TRUE);
    `);

    // =========================================================================
    // 7. THÊM PROCEDURE PARAMETERS & TEST POINTS CHO QUY TRÌNH 11 -> 24
    // =========================================================================
    await queryRunner.query(`
      DELETE FROM procedure_test_points WHERE parameter_id BETWEEN 109 AND 150;
      DELETE FROM procedure_parameters WHERE id BETWEEN 109 AND 150;

      INSERT INTO procedure_parameters (id, procedure_id, name, unit, repeat_count, calculation_method) VALUES
        -- Proc 11 (Cảm biến áp suất)
        (109, 11, 'Kiểm tra dòng điện tín hiệu tại áp suất 0 bar (Zero Signal)', 'mA', 1, 'mean'),
        (110, 11, 'Kiểm tra độ tuyến tính tín hiệu ra dòng điện 4 - 20 mA (Dải 0 - 250 bar)', 'mA', 2, 'mean'),

        -- Proc 12 (Van an toàn)
        (111, 12, 'Kiểm tra áp suất bắt đầu mở xả (Set Pressure)', 'bar', 3, 'mean'),
        (112, 12, 'Kiểm tra áp suất đóng lại (Reseating Pressure)', 'bar', 3, 'mean'),

        -- Proc 13 (Ampe kìm)
        (113, 13, 'Kiểm tra dòng điện xoay chiều ACA (Thang 1000A)', 'A', 1, 'mean'),
        (114, 13, 'Kiểm tra dòng điện một chiều DCA (Thang 100A)', 'A', 1, 'mean'),
        (115, 13, 'Kiểm tra điện áp xoay chiều ACV (Thang 600V)', 'V', 1, 'mean'),

        -- Proc 14 (Megohmmeter)
        (116, 14, 'Kiểm tra điện áp phát danh định DC', 'V', 1, 'mean'),
        (117, 14, 'Kiểm tra sai số điện trở cách điện (Thang 1000 MΩ)', 'MΩ', 1, 'mean'),

        -- Proc 15 (Đo tiếp địa)
        (118, 15, 'Kiểm tra sai số điện trở tiếp địa (Thang đo 20Ω & 200Ω)', 'Ω', 1, 'mean'),
        (119, 15, 'Kiểm tra độ lặp lại tại điểm 10.00 Ω', 'Ω', 3, 'std_dev'),

        -- Proc 16 (Oscilloscope)
        (120, 16, 'Kiểm tra sai số biên độ điện áp DC Amplitude (CH1 & CH2)', 'V', 1, 'mean'),
        (121, 16, 'Kiểm tra sai số cơ sở thời gian Timebase', 'ms', 1, 'mean'),

        -- Proc 17 (Cân bàn, cân sàn)
        (122, 17, 'Kiểm tra độ lặp lại tại 500kg (Repeatability)', 'kg', 3, 'std_dev'),
        (123, 17, 'Kiểm tra sai số số chỉ khi tăng và giảm tải (Linearity)', 'kg', 1, 'mean'),
        (124, 17, 'Kiểm tra độ lệch tâm tại 4 góc mặt bàn cân (Eccentricity 125kg)', 'kg', 1, 'max'),

        -- Proc 18 (Bộ quả cân chuẩn)
        (125, 18, 'Xác định khối lượng quy ước của quả cân chuẩn (Chu trình ABBA)', 'g', 4, 'mean'),

        -- Proc 19 (Lực kế kéo nén)
        (126, 19, 'Kiểm tra sai số lực kéo và nén (Dải 0 - 50 kN)', 'kN', 2, 'mean'),
        (127, 19, 'Kiểm tra độ hồi sai lực kế (Hysteresis)', 'kN', 1, 'max'),

        -- Proc 20 (Cờ lê lực)
        (128, 20, 'Kiểm tra mô-men xoắn tại 20%, 60% và 100% Max (Dải 100 N.m)', 'N.m', 5, 'mean'),

        -- Proc 21 (Nhiệt kế hiện số & Pt100)
        (129, 21, 'Kiểm tra điểm băng 0.00°C', '°C', 2, 'mean'),
        (130, 21, 'Kiểm tra sai số tại các điểm nhiệt độ cao trong bể chuẩn', '°C', 1, 'mean'),

        -- Proc 22 (Nhiệt kế thủy tinh)
        (131, 22, 'Kiểm tra sai số tại điểm 0°C và các điểm thang chia', '°C', 1, 'mean'),

        -- Proc 23 (Nhiệt ẩm kế tự ghi)
        (132, 23, 'Kiểm tra sai số đo nhiệt độ trong buồng chuẩn', '°C', 1, 'mean'),
        (133, 23, 'Kiểm tra sai số đo độ ẩm tương đối % RH', '%RH', 1, 'mean'),

        -- Proc 24 (Súng đo nhiệt hồng ngoại)
        (134, 24, 'Kiểm tra sai số nhiệt độ bức xạ so với nguồn vật đen chuẩn', '°C', 3, 'mean');

      -- TEST POINTS
      INSERT INTO procedure_test_points (parameter_id, point_no, nominal_value, tolerance, max_uncertainty) VALUES
        -- Param 109 (Cảm biến áp suất - Zero)
        (109, 1, 4.000, 0.050, 0.010),
        -- Param 110 (Cảm biến áp suất - Tuyến tính)
        (110, 1, 4.000, 0.050, 0.010),
        (110, 2, 7.200, 0.080, 0.015),
        (110, 3, 10.400, 0.080, 0.015),
        (110, 4, 13.600, 0.080, 0.015),
        (110, 5, 16.800, 0.080, 0.015),
        (110, 6, 20.000, 0.080, 0.015),

        -- Param 111 (Van an toàn - P_set 10 bar)
        (111, 1, 10.000, 0.300, 0.050),
        -- Param 112 (Van an toàn - P_reseat 8.8 bar)
        (112, 1, 8.800, 0.500, 0.080),

        -- Param 113 (Ampe kìm - ACA)
        (113, 1, 10.000, 0.200, 0.050),
        (113, 2, 50.000, 0.750, 0.150),
        (113, 3, 100.000, 1.500, 0.300),
        (113, 4, 300.000, 4.500, 0.900),
        (113, 5, 600.000, 9.000, 1.800),
        (113, 6, 1000.000, 15.000, 3.000),
        -- Param 114 (Ampe kìm - DCA)
        (114, 1, 10.000, 0.200, 0.050),
        (114, 2, 50.000, 0.750, 0.150),
        (114, 3, 100.000, 1.500, 0.300),
        -- Param 115 (Ampe kìm - ACV)
        (115, 1, 100.000, 1.000, 0.200),
        (115, 2, 400.000, 4.000, 0.800),

        -- Param 116 (Megohmmeter - Điện áp phát)
        (116, 1, 250.000, 25.000, 5.000),
        (116, 2, 500.000, 50.000, 10.000),
        (116, 3, 1000.000, 100.000, 20.000),
        -- Param 117 (Megohmmeter - Điện trở)
        (117, 1, 1.000, 0.050, 0.010),
        (117, 2, 10.000, 0.500, 0.100),
        (117, 3, 50.000, 2.500, 0.500),
        (117, 4, 100.000, 5.000, 1.000),
        (117, 5, 500.000, 25.000, 5.000),
        (117, 6, 1000.000, 50.000, 10.000),

        -- Param 118 (Đo tiếp địa - Thang 20 & 200)
        (118, 1, 1.000, 0.050, 0.010),
        (118, 2, 5.000, 0.100, 0.020),
        (118, 3, 10.000, 0.200, 0.040),
        (118, 4, 50.000, 1.000, 0.200),
        (118, 5, 100.000, 2.000, 0.400),
        -- Param 119 (Đo tiếp địa - Lặp lại tại 10Ω)
        (119, 1, 10.000, 0.100, 0.020),

        -- Param 120 (Oscilloscope - Biên độ DC)
        (120, 1, 0.010, 0.0003, 0.00005),
        (120, 2, 0.100, 0.0020, 0.00040),
        (120, 3, 1.000, 0.0200, 0.00400),
        (120, 4, 10.000, 0.2000, 0.04000),
        -- Param 121 (Oscilloscope - Timebase)
        (121, 1, 0.001, 0.00002, 0.000004),
        (121, 2, 1.000, 0.01500, 0.003000),

        -- Param 122 (Cân bàn - Lặp lại 500kg)
        (122, 1, 500.000, 0.100, 0.020),
        -- Param 123 (Cân bàn - Tuyến tính)
        (123, 1, 0.000, 0.050, 0.010),
        (123, 2, 20.000, 0.050, 0.010),
        (123, 3, 100.000, 0.050, 0.010),
        (123, 4, 300.000, 0.100, 0.020),
        (123, 5, 500.000, 0.100, 0.020),
        -- Param 124 (Cân bàn - Lệch tâm 125kg)
        (124, 1, 125.000, 0.100, 0.020),

        -- Param 125 (Bộ quả cân chuẩn)
        (125, 1, 10.000, 0.0002, 0.00005),
        (125, 2, 50.000, 0.0003, 0.00008),
        (125, 3, 100.000, 0.0005, 0.00010),
        (125, 4, 500.000, 0.0025, 0.00050),
        (125, 5, 1000.000, 0.0050, 0.00100),

        -- Param 126 (Lực kế - Kéo nén)
        (126, 1, 5.000, 0.050, 0.010),
        (126, 2, 10.000, 0.100, 0.020),
        (126, 3, 25.000, 0.250, 0.050),
        (126, 4, 50.000, 0.500, 0.100),
        -- Param 127 (Lực kế - Hồi sai)
        (127, 1, 25.000, 0.250, 0.050),

        -- Param 128 (Cờ lê lực - 20%, 60%, 100%)
        (128, 1, 20.000, 0.800, 0.150),
        (128, 2, 60.000, 2.400, 0.450),
        (128, 3, 100.000, 4.000, 0.800),

        -- Param 129 (Nhiệt kế Pt100 - Điểm băng)
        (129, 1, 0.000, 0.150, 0.030),
        -- Param 130 (Nhiệt kế Pt100 - Điểm cao)
        (130, 1, 50.000, 0.250, 0.050),
        (130, 2, 100.000, 0.350, 0.070),
        (130, 3, 200.000, 0.500, 0.100),
        (130, 4, 400.000, 1.000, 0.200),
        (130, 5, 600.000, 1.500, 0.300),

        -- Param 131 (Nhiệt kế thủy tinh)
        (131, 1, 0.000, 0.200, 0.040),
        (131, 2, 20.000, 0.200, 0.040),
        (131, 3, 50.000, 0.300, 0.060),
        (131, 4, 100.000, 0.500, 0.100),

        -- Param 132 (Nhiệt ẩm kế - Nhiệt độ)
        (132, 1, 20.000, 0.500, 0.100),
        (132, 2, 25.000, 0.500, 0.100),
        (132, 3, 30.000, 0.500, 0.100),
        -- Param 133 (Nhiệt ẩm kế - Độ ẩm)
        (133, 1, 30.000, 3.000, 0.600),
        (133, 2, 50.000, 3.000, 0.600),
        (133, 3, 70.000, 3.000, 0.600),
        (133, 4, 85.000, 3.500, 0.700),

        -- Param 134 (Súng hồng ngoại)
        (134, 1, 0.000, 1.500, 0.300),
        (134, 2, 50.000, 1.500, 0.300),
        (134, 3, 100.000, 2.000, 0.400),
        (134, 4, 200.000, 3.000, 0.600),
        (134, 5, 350.000, 5.000, 1.000),
        (134, 6, 500.000, 7.500, 1.500);
    `);

    // =========================================================================
    // 8. CẬP NHẬT SEQUENCES CHO TẤT CẢ CÁC BẢNG
    // =========================================================================
    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('service_types', 'id'), COALESCE((SELECT MAX(id) FROM service_types), 27));
      SELECT setval(pg_get_serial_sequence('master_standards', 'id'), COALESCE((SELECT MAX(id) FROM master_standards), 24));
      SELECT setval(pg_get_serial_sequence('calibration_procedures', 'id'), COALESCE((SELECT MAX(id) FROM calibration_procedures), 24));
      SELECT setval(pg_get_serial_sequence('procedure_steps', 'id'), COALESCE((SELECT MAX(id) FROM procedure_steps), 100));
      SELECT setval(pg_get_serial_sequence('procedure_parameters', 'id'), COALESCE((SELECT MAX(id) FROM procedure_parameters), 134));
      SELECT setval(pg_get_serial_sequence('procedure_test_points', 'id'), COALESCE((SELECT MAX(id) FROM procedure_test_points), 200));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM procedure_test_points WHERE parameter_id BETWEEN 109 AND 150;
      DELETE FROM procedure_parameters WHERE id BETWEEN 109 AND 150;
      DELETE FROM procedure_steps WHERE procedure_id BETWEEN 11 AND 24;
      DELETE FROM calibration_procedures WHERE id BETWEEN 11 AND 24;
      DELETE FROM master_standards WHERE id BETWEEN 17 AND 24;
      DELETE FROM service_types WHERE id BETWEEN 14 AND 27;
    `);
  }
}
