import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedSphygmomanometerProcedureAndDevice1795200000000
  implements MigrationInterface
{
  name = 'SeedSphygmomanometerProcedureAndDevice1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm Chuẩn đối chứng chuyên dụng cho kiểm định huyết áp kế (nếu chưa có)
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

    // 2. Thêm thiết bị Huyết áp kế vào bảng devices
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
        "is_group2" = EXCLUDED."is_group2",
        "next_due_date" = EXCLUDED."next_due_date",
        "status" = EXCLUDED."status";

      SELECT setval(pg_get_serial_sequence('"devices"', 'id'), (SELECT MAX(id) FROM "devices"));
    `);

    // 3. Tạo Quy trình kiểm định Huyết áp kế theo ĐLVN 09:2011 (thuộc service_type_id = 4: Hiệu chuẩn Áp suất – Lưu lượng)
    await queryRunner.query(`
      DO $$
      DECLARE
        v_proc_id INTEGER;
        v_param_leak INTEGER;
        v_param_meas INTEGER;
        v_param_hyst INTEGER;
      BEGIN
        -- 3.1. Insert hoặc Update calibration_procedures cho service_type_id = 4 (Áp suất)
        SELECT id INTO v_proc_id
        FROM "calibration_procedures"
        WHERE "service_type_id" = 4 AND "version" = 'ĐLVN 09:2011 (V1.0)';

        IF v_proc_id IS NULL THEN
          INSERT INTO "calibration_procedures" (
            "service_type_id",
            "version",
            "environment_requirement",
            "required_equipment",
            "effective_from",
            "status"
          ) VALUES (
            4,
            'ĐLVN 09:2011 (V1.0)',
            '{"temperature_c": {"min": 15, "max": 25, "ideal": 20, "display": "20°C ± 5°C (15°C – 25°C)"}, "humidity_percent": {"min": 30, "max": 80, "display": "≤ 80% RH"}, "stabilize_hours": 6, "note": "Nơi kiểm định phải thoáng khí, tránh chấn động và không có từ trường ngoài ảnh hưởng đến kết quả đo. Đặt huyết áp kế vào môi trường kiểm định tối thiểu 6 giờ trước khi tiến hành."}'::jsonb,
            '["Áp kế chuẩn số hoặc máy chuẩn đo huyết áp (cấp chính xác ≤ 0.2)", "Hệ thống tạo áp suất (Bơm tạo áp, bình điều áp, van xả tinh chỉnh)", "Ống dẫn cao su chịu áp lực, cút nối chữ T", "Đồng hồ bấm giây"]'::jsonb,
            CURRENT_DATE,
            'Active'
          ) RETURNING id INTO v_proc_id;
        ELSE
          UPDATE "calibration_procedures"
          SET
            "environment_requirement" = '{"temperature_c": {"min": 15, "max": 25, "ideal": 20, "display": "20°C ± 5°C (15°C – 25°C)"}, "humidity_percent": {"min": 30, "max": 80, "display": "≤ 80% RH"}, "stabilize_hours": 6, "note": "Nơi kiểm định phải thoáng khí, tránh chấn động và không có từ trường ngoài ảnh hưởng đến kết quả đo. Đặt huyết áp kế vào môi trường kiểm định tối thiểu 6 giờ trước khi tiến hành."}'::jsonb,
            "required_equipment" = '["Áp kế chuẩn số hoặc máy chuẩn đo huyết áp (cấp chính xác ≤ 0.2)", "Hệ thống tạo áp suất (Bơm tạo áp, bình điều áp, van xả tinh chỉnh)", "Ống dẫn cao su chịu áp lực, cút nối chữ T", "Đồng hồ bấm giây"]'::jsonb,
            "status" = 'Active'
          WHERE id = v_proc_id;
        END IF;

        -- 3.2. Tạo các bước quy trình thực hiện theo ĐLVN 09:2011
        DELETE FROM "procedure_steps" WHERE "procedure_id" = v_proc_id;

        INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
          (v_proc_id, 1, 'Chuẩn bị trước khi kiểm định: Đặt huyết áp kế vào phòng kiểm định tối thiểu 6 giờ trước khi tiến hành để cân bằng nhiệt độ và độ ẩm. Chuẩn bị ống cao su chịu áp, cút nối chữ T, kiểm tra độ kín của hệ thống tạo áp suất và áp kế chuẩn. Lắp đặt thiết bị vào hệ thống và chạy thử để đánh giá tính ổn định.', FALSE),
          (v_proc_id, 2, 'Kiểm tra bên ngoài: Xác định tình trạng tổng quát, sự đầy đủ của các chi tiết và phụ tùng (bao đo, bóng bóp cao su, van xả khí). Mặt kính bảo vệ phải trong suốt, không bị nứt vỡ, bọt khí, mốc bẩn cản trở đọc số chỉ. Mặt số phải được khắc/in rõ ràng các vạch chia, đơn vị đo (mmHg hoặc kPa), mã hiệu, số seri và hãng sản xuất.', FALSE),
          (v_proc_id, 3, 'Kiểm tra kỹ thuật & Độ kín: Kiểm tra đơn vị đo lường chính thức, giới hạn đo và giá trị độ chia thang đo. Ở trạng thái nghỉ, kim chỉ thị phải áp sát chốt tỳ hoặc trùng vạch 0 (sai số ≤ ±3 mmHg). Nạp áp suất đến giới hạn đo trên (hoặc 260 mmHg), khóa van duy trì trong 1 phút; áp suất tụt không được vượt quá 0.5 kPa (4 mmHg)/phút.', TRUE),
          (v_proc_id, 4, 'Kiểm tra đo lường (Xác định sai số): So sánh số chỉ áp suất trên huyết áp kế cần kiểm định với số chỉ áp kế chuẩn tại các điểm phân bố đều trên dải đo (60, 120, 180, 240, 280 mmHg) ở cả hai chiều tăng áp và giảm áp. Sai số cơ bản cho phép không được vượt quá ±0.4 kPa (tương đương ±3 mmHg).', FALSE),
          (v_proc_id, 5, 'Kiểm tra sai số đàn hồi & Đánh giá kết quả: Tăng áp suất đến giới hạn đo trên (hoặc 280 mmHg) và duy trì tải trong thời gian 5 phút. Sau khi xả tải hoàn toàn về 0, kim chỉ thị phải trở về vị trí 0 với sai lệch không quá ±3 mmHg. Nếu đạt toàn bộ yêu cầu, cấp Giấy chứng nhận kèm tem/dấu kiểm định; nếu không đạt, lập biên bản từ chối và xóa dấu cũ.', TRUE);

        -- 3.3. Tạo các thông số đo lường
        DELETE FROM "procedure_parameters" WHERE "procedure_id" = v_proc_id;

        -- Thông số 1: Độ kín hệ thống (Độ tụt áp)
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra độ kín hệ thống (Áp suất tụt sau 1 phút)', 'mmHg', 1, 'abs')
        RETURNING id INTO v_param_leak;

        -- Thông số 2: Sai số đo lường (Chiều tăng và giảm áp)
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra sai số số chỉ khi tăng và giảm áp', 'mmHg', 1, 'mean')
        RETURNING id INTO v_param_meas;

        -- Thông số 3: Sai số đàn hồi (Độ dịch chuyển điểm 0 sau 5 phút tải)
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra sai số đàn hồi (Sau 5 phút chịu tải)', 'mmHg', 1, 'abs')
        RETURNING id INTO v_param_hyst;

        -- 3.4. Tạo các điểm đo chuẩn
        DELETE FROM "procedure_test_points" WHERE "parameter_id" IN (v_param_leak, v_param_meas, v_param_hyst);

        -- Điểm kiểm tra độ kín: Danh định 0.0 mmHg tụt, Dung sai 4.0 mmHg, Max KĐBĐ 0.5 mmHg
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_leak, 1, 0.000, 4.000, 0.500);

        -- 5 điểm kiểm tra sai số số chỉ: 60, 120, 180, 240, 280 mmHg; Dung sai ±3.0 mmHg (±0.4 kPa); Max KĐBĐ 0.8 mmHg
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_meas, 1, 60.000, 3.000, 0.800),
          (v_param_meas, 2, 120.000, 3.000, 0.800),
          (v_param_meas, 3, 180.000, 3.000, 0.800),
          (v_param_meas, 4, 240.000, 3.000, 0.800),
          (v_param_meas, 5, 280.000, 3.000, 0.800);

        -- Điểm kiểm tra đàn hồi: Danh định 0.0 mmHg lệch, Dung sai 3.0 mmHg, Max KĐBĐ 0.5 mmHg
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_hyst, 1, 0.000, 3.000, 0.500);

      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "devices" WHERE "id" IN (3, 4);
      DELETE FROM "calibration_procedures" WHERE "service_type_id" = 4 AND "version" = 'ĐLVN 09:2011 (V1.0)';
      DELETE FROM "masterstandard" WHERE "id" = 9;
    `);
  }
}
