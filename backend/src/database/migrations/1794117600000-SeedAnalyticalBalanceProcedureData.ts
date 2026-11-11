import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAnalyticalBalanceProcedureData1794117600000 implements MigrationInterface {
  name = 'SeedAnalyticalBalanceProcedureData1794117600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        r_st RECORD;
        v_proc_id BIGINT;
        v_param1_id BIGINT;
        v_param2_id BIGINT;
        v_param3_id BIGINT;
      BEGIN
        FOR r_st IN
          SELECT id, name, field, standard_code
          FROM "service_types"
          WHERE field = 'KHOILUONG'
             OR name ILIKE '%cân phân tích%'
             OR name ILIKE '%cân kỹ thuật%'
             OR name ILIKE '%cân điện tử%'
          ORDER BY id ASC
        LOOP
          -- Cập nhật mô tả và mã chuẩn cho dịch vụ hiệu chuẩn Cân phân tích
          UPDATE "service_types"
          SET
            "standard_code" = COALESCE(NULLIF("standard_code", ''), 'ĐLVN 16:2021 / OIML R76-1'),
            "description" = 'Quy trình hiệu chuẩn Cân phân tích: Kiểm tra bên ngoài, Kiểm tra kỹ thuật (hệ số nhiệt độ TK, tải khởi động 3 lần ở 80-100% Max, hiệu chỉnh nội/niêm phong), Kiểm tra đo lường (Độ lặp lại, Độ lệch tâm, Sai số gần Max, Độ đúng), Ước lượng độ KĐBĐ và Xử lý chung (Chu kỳ 12 tháng).'
          WHERE "id" = r_st.id;

          -- Tìm hoặc tạo quy trình hiệu chuẩn (calibration_procedures)
          SELECT id INTO v_proc_id
          FROM "calibration_procedures"
          WHERE "service_type_id" = r_st.id
          ORDER BY CASE WHEN status = 'Active' THEN 0 ELSE 1 END, id DESC
          LIMIT 1;

          IF v_proc_id IS NULL THEN
            INSERT INTO "calibration_procedures" (
              "service_type_id",
              "version",
              "environment_requirement",
              "required_equipment",
              "effective_from",
              "status"
            ) VALUES (
              r_st.id,
              'v2.0',
              '{"temperature_c": {"min": 21, "max": 25, "target": 23, "tolerance": 2}, "humidity_percent": {"min": 40, "max": 70}, "warmup_minutes": 30, "calibration_cycle_months": 12, "location_note": "Địa điểm hiệu chuẩn đủ sáng, xa nguồn sinh nhiệt, xa nguồn sinh gió, không bị rung động; hiệu chuẩn tại địa điểm sử dụng."}'::jsonb,
              '["Bộ quả cân chuẩn", "Ẩm kế"]'::jsonb,
              '2026-01-01',
              'Active'
            )
            RETURNING id INTO v_proc_id;
          ELSE
            UPDATE "calibration_procedures"
            SET
              "version" = 'v2.0',
              "environment_requirement" = '{"temperature_c": {"min": 21, "max": 25, "target": 23, "tolerance": 2}, "humidity_percent": {"min": 40, "max": 70}, "warmup_minutes": 30, "calibration_cycle_months": 12, "location_note": "Địa điểm hiệu chuẩn đủ sáng, xa nguồn sinh nhiệt, xa nguồn sinh gió, không bị rung động; hiệu chuẩn tại địa điểm sử dụng."}'::jsonb,
              "required_equipment" = '["Bộ quả cân chuẩn", "Ẩm kế"]'::jsonb,
              "status" = 'Active'
            WHERE "id" = v_proc_id;
          END IF;

          -- Xóa kết quả đo & bước cũ thuộc quy trình cũ (nếu có) để thay thế hoàn toàn bằng quy trình chuẩn mới
          DELETE FROM "measurement_details"
          WHERE "test_point_id" IN (
            SELECT ptp.id
            FROM "procedure_test_points" ptp
            JOIN "procedure_parameters" pp ON pp.id = ptp.parameter_id
            WHERE pp.procedure_id = v_proc_id
          );

          DELETE FROM "step_results"
          WHERE "procedure_step_id" IN (
            SELECT ps.id
            FROM "procedure_steps" ps
            WHERE ps.procedure_id = v_proc_id
          );

          DELETE FROM "procedure_steps" WHERE "procedure_id" = v_proc_id;
          DELETE FROM "procedure_parameters" WHERE "procedure_id" = v_proc_id;

          -- 1. Thêm các bước tiến hành hiệu chuẩn Cân phân tích chuẩn
          INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence")
          VALUES
            (
              v_proc_id,
              1,
              'Chuẩn bị & Kiểm tra bên ngoài: Vệ sinh cân sạch sẽ, đặt cân chắc chắn trên mặt phẳng và điều chỉnh thăng bằng, bật nguồn sấy máy tối thiểu 30 phút (hoặc theo NSX), mở cửa buồng cân để cân bằng nhiệt độ với môi trường (Nhiệt độ: 23 ± 2 ºC; Độ ẩm: 40 ÷ 70 %RH). Kiểm tra nhãn ghi thông số (số máy, nơi sản xuất, Max, giá trị độ chia), đầy đủ bộ phận/phụ kiện, bộ phận chỉ thị rõ ràng và bộ phận tiếp nhận tải cứng vững, không bị vướng.',
              TRUE
            ),
            (
              v_proc_id,
              2,
              'Kiểm tra kỹ thuật: Kiểm tra tài liệu kỹ thuật của cân để xác định hệ số ảnh hưởng của nhiệt độ (TK) do nhà sản xuất cung cấp. Tải khởi động cân 3 lần với mức tải tương đương (80 ÷ 100)% Max (cân phải hoạt động bình thường). Đối với cân có chức năng hiệu chỉnh bằng quả cân bên trong (Internal Calibration) thì cho cân thực hiện chức năng này; đối với cân không có chức năng hiệu chỉnh nội thì kiểm tra cơ cấu niêm phong ngăn cản việc điều chỉnh độ đúng của cân.',
              TRUE
            ),
            (
              v_proc_id,
              3,
              'Kiểm tra đo lường - Kiểm tra độ lặp lại (Repeatability): Đặt quả cân chuẩn lên đĩa cân tại mức tải quy định (50% Max và 100% Max), thực hiện cân lặp lại 3 lần tại mỗi mức tải để đánh giá độ lặp lại của cân.',
              FALSE
            ),
            (
              v_proc_id,
              4,
              'Kiểm tra đo lường - Kiểm tra độ lệch tâm (Eccentricity): Đặt quả cân chuẩn (tương đương 1/3 Max) lần lượt tại 5 vị trí trên đĩa cân (1-Tâm đĩa cân, 2-Phía trước, 3-Phía sau, 4-Bên trái, 5-Bên phải) và ghi nhận kết quả chỉ thị tại từng vị trí.',
              FALSE
            ),
            (
              v_proc_id,
              5,
              'Kiểm tra đo lường - Kiểm tra sai số gần Max & Kiểm tra độ đúng: Tiến hành cân kiểm tra bằng Bộ quả cân chuẩn tại các mức tải phân bố trên phạm vi cân đến mức tải gần Max (10%, 25%, 50%, 75% và 100% Max) để xác định độ đúng và sai số gần Max.',
              FALSE
            ),
            (
              v_proc_id,
              6,
              'Ước lượng độ không đảm bảo đo & Xử lý chung: Ước lượng độ không đảm bảo đo căn cứ trên các thành phần: độ lặp lại, giá trị độ chia tại điểm "0", giá trị độ chia tại Max, quả cân chuẩn, độ lệch tâm, độ đúng, nhiệt độ khi sử dụng. Xử lý chung để đưa ra đánh giá cuối cùng đối với thiết bị hiệu chuẩn (Chu kỳ hiệu chuẩn của Cân phân tích là 12 tháng).',
              TRUE
            );

          -- 2. Thêm các phép đo lường (procedure_parameters) và các điểm đo (procedure_test_points)
          -- Phép đo 1: Kiểm tra độ lặp (Repeatability) - đo lặp lại 3 lần (repeat_count = 3)
          INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
          VALUES (v_proc_id, 'Kiểm tra độ lặp (Repeatability)', 'g', 3, 'mean')
          RETURNING id INTO v_param1_id;

          INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty")
          VALUES
            (v_param1_id, 1, 100.0000, 0.0005, 0.00020),
            (v_param1_id, 2, 200.0000, 0.0010, 0.00030);

          -- Phép đo 2: Kiểm tra độ lệch tâm (Eccentricity - 5 vị trí đĩa cân)
          INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
          VALUES (v_proc_id, 'Kiểm tra độ lệch tâm (5 vị trí: Tâm, Trước, Sau, Trái, Phải)', 'g', 1, 'max')
          RETURNING id INTO v_param2_id;

          INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty")
          VALUES
            (v_param2_id, 1, 50.0000, 0.0005, 0.00020),
            (v_param2_id, 2, 50.0000, 0.0005, 0.00020),
            (v_param2_id, 3, 50.0000, 0.0005, 0.00020),
            (v_param2_id, 4, 50.0000, 0.0005, 0.00020),
            (v_param2_id, 5, 50.0000, 0.0005, 0.00020);

          -- Phép đo 3: Kiểm tra độ đúng & Kiểm tra sai số gần Max
          INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
          VALUES (v_proc_id, 'Kiểm tra độ đúng & Kiểm tra sai số gần Max', 'g', 1, 'mean')
          RETURNING id INTO v_param3_id;

          INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty")
          VALUES
            (v_param3_id, 1, 20.0000, 0.0005, 0.00015),
            (v_param3_id, 2, 50.0000, 0.0005, 0.00020),
            (v_param3_id, 3, 100.0000, 0.0005, 0.00020),
            (v_param3_id, 4, 150.0000, 0.0010, 0.00030),
            (v_param3_id, 5, 200.0000, 0.0010, 0.00030);
        END LOOP;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: preserve analytical balance procedure data
  }
}

