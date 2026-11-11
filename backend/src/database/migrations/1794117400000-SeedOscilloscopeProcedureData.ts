import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedOscilloscopeProcedureData1794117400000
  implements MigrationInterface
{
  name = 'SeedOscilloscopeProcedureData1794117400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        v_proc_id INTEGER;
        v_param_dc1 INTEGER;
        v_param_dc2 INTEGER;
        v_param_bw INTEGER;
        v_param_delay INTEGER;
        v_param_trig INTEGER;
      BEGIN
        -- 1. Ensure calibration procedure exists & active for service_type_id = 2 (Hiệu chuẩn máy hiện sóng)
        SELECT id INTO v_proc_id
        FROM "calibration_procedures"
        WHERE "service_type_id" = 2 AND "version" = 'V1.0';

        IF v_proc_id IS NULL THEN
          INSERT INTO "calibration_procedures" (
            "service_type_id",
            "version",
            "environment_requirement",
            "required_equipment",
            "effective_from",
            "status"
          ) VALUES (
            2,
            'V1.0',
            '{"temperature_c": {"min": 18, "max": 28}, "humidity_percent": {"min": 20, "max": 65}, "warmup_minutes": 30}'::jsonb,
            '["Máy hiện sóng", "Fluke 5520A Calibrator", "Phần mềm đo lường chuyên dụng", "Cáp BNC đồng trục 50Ω và đầu tải trở 50Ω"]'::jsonb,
            CURRENT_DATE,
            'Active'
          ) RETURNING id INTO v_proc_id;
        ELSE
          UPDATE "calibration_procedures"
          SET
            "environment_requirement" = '{"temperature_c": {"min": 18, "max": 28}, "humidity_percent": {"min": 20, "max": 65}, "warmup_minutes": 30}'::jsonb,
            "required_equipment" = '["Máy hiện sóng", "Fluke 5520A Calibrator", "Phần mềm đo lường chuyên dụng", "Cáp BNC đồng trục 50Ω và đầu tải trở 50Ω"]'::jsonb,
            "status" = 'Active'
          WHERE id = v_proc_id;
        END IF;

        -- 2. Seed 6 steps into procedure_steps
        DELETE FROM "procedure_steps" WHERE "procedure_id" = v_proc_id;

        INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
          (v_proc_id, 1, 'Chạy chức năng Self Calibration trên phần mềm: Bật nguồn làm nóng thiết bị trong 30 phút, kích hoạt tự cân chỉnh nội vi trên máy và phần mềm cho Channel 1 & 2.', TRUE),
          (v_proc_id, 2, 'Kiểm tra độ chính xác tín hiệu DC (DC Gain Accuracy) lần lượt Channel 1 & 2: Kết nối chuẩn Fluke 5520A phát mức điện áp chuẩn 10mV, 100mV, 1V, 10V và ghi nhận số đo.', FALSE),
          (v_proc_id, 3, 'Dò Bandwidth Accuracy Test (-3dB) lần lượt cho Channel 1 & 2: Phát tần số chuẩn 100MHz từ Fluke 5520A qua tải trở 50Ω, kiểm tra biên độ đáp ứng >= 3.00 div (suy giảm không quá -3dB so với 4.24 div chuẩn).', FALSE),
          (v_proc_id, 4, 'Đo tốc độ lấy mẫu và thời gian trễ (Sample Rate and Delay Time Accuracy) lần lượt cho Channel 1 & 2: Cấp xung chuẩn thời gian marker 10MHz, kiểm tra sai số thời gian trễ không vượt quá dung sai cho phép.', FALSE),
          (v_proc_id, 5, 'Kiểm tra độ nhạy đầu dò (Edge Trigger Sensitivity Check) lần lượt cho Channel 1 & 2: Kiểm tra biên độ kích hoạt cạnh xung ổn định ở mức <= 1.00 div.', FALSE),
          (v_proc_id, 6, 'Kết thúc quá trình đo, xuất trình báo cáo hiệu chuẩn và tắt nguồn các thiết bị.', TRUE);

        -- 3. Seed parameters into procedure_parameters
        DELETE FROM "procedure_parameters" WHERE "procedure_id" = v_proc_id;

        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Độ chính xác điện áp DC CH1 (DC Gain Accuracy)', 'V', 1, 'mean')
        RETURNING id INTO v_param_dc1;

        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Độ chính xác điện áp DC CH2 (DC Gain Accuracy)', 'V', 1, 'mean')
        RETURNING id INTO v_param_dc2;

        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra độ chính xác băng thông (Bandwidth -3dB Test)', 'div', 1, 'min')
        RETURNING id INTO v_param_bw;

        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Tốc độ lấy mẫu & Thời gian trễ (Sample Rate & Delay Time)', 'μs', 1, 'abs')
        RETURNING id INTO v_param_delay;

        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra độ nhạy đầu dò (Edge Trigger Sensitivity Check)', 'div', 1, 'max')
        RETURNING id INTO v_param_trig;

        -- 4. Seed test points into procedure_test_points
        -- DC Gain CH1 (10mV, 100mV, 1V, 10V - dung sai 2%)
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_dc1, 1, 0.010, 0.00020, 0.00005),
          (v_param_dc1, 2, 0.100, 0.00200, 0.00050),
          (v_param_dc1, 3, 1.000, 0.02000, 0.00500),
          (v_param_dc1, 4, 10.000, 0.20000, 0.05000);

        -- DC Gain CH2 (10mV, 100mV, 1V, 10V - dung sai 2%)
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_dc2, 1, 0.010, 0.00020, 0.00005),
          (v_param_dc2, 2, 0.100, 0.00200, 0.00050),
          (v_param_dc2, 3, 1.000, 0.02000, 0.00500),
          (v_param_dc2, 4, 10.000, 0.20000, 0.05000);

        -- Bandwidth Test (100MHz @ 4.24 div, biên độ >= 3.00 div)
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_bw, 1, 4.24, 1.24, 0.10);

        -- Delay Time & Sample Rate (Marker 10MHz, tolerance ±0.0010 μs)
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_delay, 1, 0.1000, 0.0010, 0.0003);

        -- Edge Trigger Sensitivity Check (trigger <= 1.00 div)
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_trig, 1, 1.00, 0.30, 0.05);

        -- 5. Link the assigned oscilloscope service request item to service_type_id = 2
        UPDATE "service_request_items"
        SET "service_type_id" = 2
        WHERE "id" = 3;

      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        v_proc_id INTEGER;
      BEGIN
        SELECT id INTO v_proc_id
        FROM "calibration_procedures"
        WHERE "service_type_id" = 2 AND "version" = 'V1.0';

        IF v_proc_id IS NOT NULL THEN
          DELETE FROM "procedure_steps" WHERE "procedure_id" = v_proc_id;
          DELETE FROM "procedure_parameters" WHERE "procedure_id" = v_proc_id;
        END IF;
      END $$;
    `);
  }
}

