import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedSphygmomanometerVerificationProcedure1795400000000
  implements MigrationInterface
{
  name = 'SeedSphygmomanometerVerificationProcedure1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Mở rộng độ dài trường version trong calibration_procedures lên VARCHAR(50) nếu cần
    await queryRunner.query(`
      ALTER TABLE "calibration_procedures" ALTER COLUMN "version" TYPE VARCHAR(50);
    `);

    // 1. Đảm bảo chuẩn đối chứng đo áp suất tồn tại
    await queryRunner.query(`
      INSERT INTO "masterstandard" (
        "id",
        "name",
        "serial_number",
        "accuracy_class",
        "calibration_expiry",
        "status"
      ) VALUES
        (9, 'Bộ tạo áp suất và áp kế chuẩn kiểm định huyết áp kế Fluke ProSim 4', 'FLUKE-PS4-9021', 'Grade 0.05 (±0.05%)', CURRENT_DATE + INTERVAL '730 days', 'Active')
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "serial_number" = EXCLUDED."serial_number",
        "accuracy_class" = EXCLUDED."accuracy_class",
        "calibration_expiry" = EXCLUDED."calibration_expiry",
        "status" = EXCLUDED."status";

      SELECT setval(pg_get_serial_sequence('"masterstandard"', 'id'), (SELECT MAX(id) FROM "masterstandard"));
    `);

    // 2. Tạo dịch vụ riêng: "Kiểm định Huyết áp kế (Cơ, Thủy ngân & Điện tử)" với kind = 'Verification'
    await queryRunner.query(`
      INSERT INTO "service_types" (
        "id",
        "name",
        "kind",
        "field",
        "standard_code",
        "measuring_range",
        "description",
        "status"
      ) VALUES (
        10,
        'Kiểm định Huyết áp kế (Cơ, Thủy ngân & Điện tử)',
        'Verification',
        'APSUAT',
        'KD-HAK',
        '0 – 300 mmHg (0 – 40 kPa)',
        'Dịch vụ kiểm định kỹ thuật đo lường bắt buộc đối với phương tiện đo nhóm 2: Huyết áp kế cơ, thủy ngân và điện tử theo ĐLVN 09:2011 và ĐLVN 343:2020',
        'Active'
      ) ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "kind" = EXCLUDED."kind",
        "field" = EXCLUDED."field",
        "standard_code" = EXCLUDED."standard_code",
        "measuring_range" = EXCLUDED."measuring_range",
        "description" = EXCLUDED."description",
        "status" = EXCLUDED."status";

      SELECT setval(pg_get_serial_sequence('"service_types"', 'id'), (SELECT MAX(id) FROM "service_types"));
    `);

    // 3. Đảm bảo các thiết bị Huyết áp kế trong bảng devices có cờ is_group2 = TRUE
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
        (3, 5, 'Huyết áp kế cơ Aneroid ALPK2 500', '500', 'ALPK2', 'ALP-500-2026-08', 'TB-HAK-001', '0 - 300 mmHg / 2 mmHg', TRUE, CURRENT_DATE + INTERVAL '365 days', 'Active'),
        (4, 5, 'Huyết áp kế điện tử bắp tay Omron HEM-7120', 'HEM-7120', 'Omron', 'OMR-7120-4491', 'TB-HAK-002', '0 - 299 mmHg / 1 mmHg', TRUE, CURRENT_DATE + INTERVAL '365 days', 'Active')
      ON CONFLICT ("id") DO UPDATE SET
        "customer_id" = EXCLUDED."customer_id",
        "name" = EXCLUDED."name",
        "model" = EXCLUDED."model",
        "manufacturer" = EXCLUDED."manufacturer",
        "serial_number" = EXCLUDED."serial_number",
        "internal_code" = EXCLUDED."internal_code",
        "measuring_range" = EXCLUDED."measuring_range",
        "is_group2" = TRUE,
        "next_due_date" = EXCLUDED."next_due_date",
        "status" = EXCLUDED."status";

      SELECT setval(pg_get_serial_sequence('"devices"', 'id'), (SELECT MAX(id) FROM "devices"));
    `);

    // 4. Tạo Quy trình kiểm định cho service_type_id = 10 theo ĐLVN 09:2011 & ĐLVN 343:2020
    await queryRunner.query(`
      DO $$
      DECLARE
        v_proc_id INTEGER;
        v_param_leak INTEGER;
        v_param_meas INTEGER;
        v_param_valve INTEGER;
      BEGIN
        -- 4.1. Insert hoặc Update calibration_procedures cho service_type_id = 10
        SELECT id INTO v_proc_id
        FROM "calibration_procedures"
        WHERE "service_type_id" = 10 AND "version" = 'ĐLVN 09:2011 / 343:2020';

        IF v_proc_id IS NULL THEN
          INSERT INTO "calibration_procedures" (
            "service_type_id",
            "version",
            "environment_requirement",
            "required_equipment",
            "effective_from",
            "status"
          ) VALUES (
            10,
            'ĐLVN 09:2011 / 343:2020',
            '{"temperature_c": {"min": 15, "max": 28, "ideal": 20, "display": "20 ± 5°C (loại cơ/thủy ngân) / 23 ± 5°C (loại điện tử)"}, "humidity_percent": {"min": 30, "max": 80, "display": "≤ 80% RH"}, "stabilize_hours": 4, "note": "Nhiệt độ phòng ổn định (20 ± 5°C với loại cơ/thủy ngân hoặc 23 ± 5°C với loại điện tử), độ ẩm phù hợp ≤ 80% RH. Huyết áp kế và phương tiện chuẩn phải được ổn định trong môi trường kiểm định tối thiểu từ 4 đến 6 giờ trước khi thao tác."}'::jsonb,
            '["Chuẩn đo áp suất có độ chính xác cao hơn huyết áp kế cần kiểm định (cấp chính xác ≤ 0.2 hoặc Fluke ProSim 4)", "Hệ thống tạo áp suất (Bơm tạo áp, bình điều áp, van xả tinh chỉnh)", "Ống dẫn cao su chịu áp lực cao, cút nối chữ T chuẩn", "Đồng hồ bấm giây kiểm tra độ kín khí và thời gian van xả nhanh"]'::jsonb,
            CURRENT_DATE,
            'Active'
          ) RETURNING id INTO v_proc_id;
        ELSE
          UPDATE "calibration_procedures"
          SET
            "environment_requirement" = '{"temperature_c": {"min": 15, "max": 28, "ideal": 20, "display": "20 ± 5°C (loại cơ/thủy ngân) / 23 ± 5°C (loại điện tử)"}, "humidity_percent": {"min": 30, "max": 80, "display": "≤ 80% RH"}, "stabilize_hours": 4, "note": "Nhiệt độ phòng ổn định (20 ± 5°C với loại cơ/thủy ngân hoặc 23 ± 5°C với loại điện tử), độ ẩm phù hợp ≤ 80% RH. Huyết áp kế và phương tiện chuẩn phải được ổn định trong môi trường kiểm định tối thiểu từ 4 đến 6 giờ trước khi thao tác."}'::jsonb,
            "required_equipment" = '["Chuẩn đo áp suất có độ chính xác cao hơn huyết áp kế cần kiểm định (cấp chính xác ≤ 0.2 hoặc Fluke ProSim 4)", "Hệ thống tạo áp suất (Bơm tạo áp, bình điều áp, van xả tinh chỉnh)", "Ống dẫn cao su chịu áp lực cao, cút nối chữ T chuẩn", "Đồng hồ bấm giây kiểm tra độ kín khí và thời gian van xả nhanh"]'::jsonb,
            "status" = 'Active'
          WHERE id = v_proc_id;
        END IF;

        -- 4.2. Xóa các bước cũ và thêm 5 bước quy trình theo quy chuẩn ĐLVN
        DELETE FROM "procedure_steps" WHERE "procedure_id" = v_proc_id;

        INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
          (v_proc_id, 1, 'Chuẩn bị & Điều kiện môi trường: Kiểm tra điều kiện nhiệt độ phòng kiểm định (20 ± 5°C với loại cơ/thủy ngân hoặc 23 ± 5°C với loại điện tử), độ ẩm ≤ 80% RH. Huyết áp kế và phương tiện chuẩn phải được ổn định nhiệt độ trong phòng kiểm định tối thiểu 4 giờ. Lắp ráp hệ thống đo bằng ống dẫn và cút nối chữ T giữa chuẩn đo áp suất, bộ tạo áp và huyết áp kế kiểm định.', FALSE),
          (v_proc_id, 2, 'Kiểm tra bên ngoài: Kiểm tra tính nguyên vẹn của nhãn mác, ký mã hiệu, số chế tạo, phạm vi đo (thường 0 – 300 mmHg hoặc 0 – 40 kPa) và tên nhà sản xuất. Kiểm tra vỏ máy, mặt số/màn hình hiển thị, ống dẫn cao su và bao quấn tay; không được có nứt vỡ, rò rỉ khí, kim cong vênh hoặc khiếm khuyết cản trở quan sát kết quả.', FALSE),
          (v_proc_id, 3, 'Kiểm tra kỹ thuật: Kiểm tra vạch chia, đơn vị đo (kPa, mmHg), vị trí kim chỉ thị về điểm 0 khi không có áp lực (đối với loại cơ). Kiểm tra độ kín khí của hệ thống tạo áp và bao quấn: bơm nạp áp suất đến mức tối đa (260 – 300 mmHg), khóa van duy trì trong 1 phút; độ tụt áp không được vượt quá 0.5 kPa (4 mmHg)/phút. Kiểm tra van xả khí nhanh đối với huyết áp kế điện tử theo ĐLVN 343:2020: thời gian xả từ 260 mmHg xuống 15 mmHg không quá 10 giây.', TRUE),
          (v_proc_id, 4, 'Kiểm tra đo lường (Xác định sai số cơ bản): Tiến hành đo tại các điểm phân bố đều trên toàn thang đo: 50, 100, 150, 200, 250, 300 mmHg (hoặc tương đương kPa) theo cả hai chiều tăng áp và giảm áp. Ghi nhận số chỉ trên phương tiện chuẩn và số chỉ trên huyết áp kế tại từng điểm để tính sai số cơ bản. Sai số cho phép không vượt quá ±0.4 kPa (±3 mmHg).', FALSE),
          (v_proc_id, 5, 'Đánh giá kết quả & Dán tem kiểm định: So sánh toàn bộ kết quả với quy định kỹ thuật đo lường. Nếu huyết áp kế đạt toàn bộ các yêu cầu về ngoại quan, kỹ thuật, độ kín khí và sai số đo lường (≤ ±3 mmHg): Tiến hành dán Tem kiểm định và cấp Giấy chứng nhận kiểm định phương tiện đo nhóm 2 theo ĐLVN. Nếu không đạt: Lập biên bản không đạt và thông báo kết quả cho cơ sở sử dụng.', TRUE);

        -- 4.3. Tạo các thông số đo lường
        DELETE FROM "procedure_parameters" WHERE "procedure_id" = v_proc_id;

        -- Thông số 1: Độ kín khí hệ thống (Độ tụt áp sau 1 phút)
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra độ kín khí hệ thống (Áp suất tụt sau 1 phút)', 'mmHg', 1, 'abs')
        RETURNING id INTO v_param_leak;

        -- Thông số 2: Sai số cơ bản tại các điểm đo (Chiều tăng và giảm áp)
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra sai số cơ bản tại các điểm đo (Tăng và giảm áp)', 'mmHg', 1, 'mean')
        RETURNING id INTO v_param_meas;

        -- Thông số 3: Thời gian van xả khí nhanh (ĐLVN 343:2020)
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra van xả khí nhanh (Từ 260 mmHg về <= 15 mmHg)', 'giây', 1, 'max')
        RETURNING id INTO v_param_valve;

        -- 4.4. Tạo các điểm đo chuẩn
        DELETE FROM "procedure_test_points" WHERE "parameter_id" IN (v_param_leak, v_param_meas, v_param_valve);

        -- Điểm kiểm tra độ kín: Danh định 0.0 mmHg, Dung sai tụt cho phép 4.0 mmHg (0.5 kPa/phút), KĐBĐ 0.5 mmHg
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_leak, 1, 0.000, 4.000, 0.500);

        -- 6 điểm kiểm tra sai số cơ bản phân bố đều trên thang đo: 50, 100, 150, 200, 250, 300 mmHg
        -- Dung sai cho phép: ±3.0 mmHg (±0.4 kPa); Max KĐBĐ: 0.8 mmHg
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_meas, 1, 50.000, 3.000, 0.800),
          (v_param_meas, 2, 100.000, 3.000, 0.800),
          (v_param_meas, 3, 150.000, 3.000, 0.800),
          (v_param_meas, 4, 200.000, 3.000, 0.800),
          (v_param_meas, 5, 250.000, 3.000, 0.800),
          (v_param_meas, 6, 300.000, 3.000, 0.800);

        -- Điểm kiểm tra van xả nhanh: Tối đa 10 giây
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_valve, 1, 0.000, 10.000, 0.500);

      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "calibration_procedures" WHERE "service_type_id" = 10;
      DELETE FROM "service_types" WHERE "id" = 10;
    `);
  }
}
