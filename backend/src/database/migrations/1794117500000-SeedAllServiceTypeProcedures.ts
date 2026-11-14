import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedAllServiceTypeProcedures1794117500000
  implements MigrationInterface
{
  name = 'SeedAllServiceTypeProcedures1794117500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        v_param_id INTEGER;
        v_step_count INTEGER;
      BEGIN
        -- Ensure service_type 1 is Active so all 34 service types can be executed
        UPDATE "service_types" SET "status" = 'Active' WHERE "id" = 1;

        FOR rec IN
          SELECT
            st.id AS st_id,
            st.name AS st_name,
            st.field AS st_field,
            cp.id AS proc_id
          FROM "service_types" st
          JOIN "calibration_procedures" cp ON cp.service_type_id = st.id AND cp.status = 'Active'
          WHERE st.id <> 2 -- Skip Oscilloscope (id = 2) because it already has its specialized 6-step procedure
          ORDER BY st.id
        LOOP
          SELECT COUNT(*) INTO v_step_count FROM "procedure_steps" WHERE "procedure_id" = rec.proc_id;

          IF v_step_count = 0 THEN
            -- 1. Seed steps according to technical field (st_field)
            IF rec.st_field = 'DIEN' THEN
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Chuẩn bị & Làm nóng: Bật nguồn thiết bị và chuẩn Fluke 5520A ổn định nhiệt trong 30 phút ở điều kiện 18–28°C, kiểm tra điểm Zero.', TRUE),
                (rec.proc_id, 2, 'Đo kiểm dải Điện áp một chiều (DC Voltage) / Tín hiệu chuẩn chính tại các điểm 10%, 50%, 90% thang đo.', FALSE),
                (rec.proc_id, 3, 'Đo kiểm dải Điện áp xoay chiều (AC Voltage) / Tần số đáp ứng và kiểm tra độ ổn định chỉ thị.', FALSE),
                (rec.proc_id, 4, 'Đo kiểm thông số phụ trợ (Điện trở / Dòng điện / Độ cách điện) theo đặc tính kỹ thuật của ' || rec.st_name || '.', FALSE),
                (rec.proc_id, 5, 'Kết thúc quá trình đo, đánh giá độ không đảm bảo đo, xuất trình báo cáo và tắt nguồn thiết bị.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Độ chính xác thang đo chuẩn (' || rec.st_name || ')', 'V', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 1.000, 0.005, 0.001),
                (v_param_id, 2, 10.000, 0.020, 0.005),
                (v_param_id, 3, 100.000, 0.150, 0.030),
                (v_param_id, 4, 500.000, 0.750, 0.150);

            ELSIF rec.st_field = 'KHOILUONG' THEN
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Cân bằng bọt thủy, vệ sinh đĩa tải và làm nóng thiết bị trong 30 phút tại môi trường không rung động (18–25°C).', TRUE),
                (rec.proc_id, 2, 'Kiểm tra độ lặp lại (Repeatability) bằng quả cân chuẩn F1/E2 tại mức tải 50% và 100% Max.', FALSE),
                (rec.proc_id, 3, 'Kiểm tra độ lệch tâm (Eccentricity) tại 5 vị trí trên mặt bàn cân theo ĐLVN.', FALSE),
                (rec.proc_id, 4, 'Kiểm tra độ tuyến tính (Linearity) tăng tải và giảm tải tại 5 điểm chuẩn từ Min đến Max.', FALSE),
                (rec.proc_id, 5, 'Dỡ tải về 0, kiểm tra độ trôi điểm không (Zero drift) và xuất trình biên bản hiệu chuẩn.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Sai số chỉ thị tải trọng (' || rec.st_name || ')', 'g', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 10.000, 0.002, 0.0005),
                (v_param_id, 2, 50.000, 0.005, 0.0010),
                (v_param_id, 3, 100.000, 0.010, 0.0020),
                (v_param_id, 4, 200.000, 0.015, 0.0030);

            ELSIF rec.st_field = 'DODAI' THEN
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Làm sạch bề mặt đo bằng dung dịch chuyên dụng, khử từ và ổn định nhiệt độ tại 20 ± 2°C.', TRUE),
                (rec.proc_id, 2, 'Kiểm tra điểm không (Zero setting), độ trơn tru của cơ cấu trượt/vít vi cấp và độ phẳng mỏ đo.', FALSE),
                (rec.proc_id, 3, 'Đo kiểm độ chính xác kích thước bằng bộ căn mẫu chuẩn cấp 0 (Gauge Blocks) tại các điểm phân bố đều trên dải đo.', FALSE),
                (rec.proc_id, 4, 'Kiểm tra độ song song của hai mặt đo và sai số hành trình ngược.', FALSE),
                (rec.proc_id, 5, 'Phủ dầu chống gỉ bảo quản bề mặt đo và xuất trình báo cáo hiệu chuẩn.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Sai số đo kích thước (' || rec.st_name || ')', 'mm', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 25.00, 0.02, 0.005),
                (v_param_id, 2, 50.00, 0.02, 0.005),
                (rec.proc_id % 2 + v_param_id - (rec.proc_id % 2), 3, 100.00, 0.03, 0.008),
                (v_param_id, 4, 150.00, 0.03, 0.010);

            ELSIF rec.st_field = 'APSUAT' THEN
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Lắp thiết bị lên bàn tạo áp thủy lực/khí nén chuẩn, xả khí đường ống và cân bằng mực chất lỏng truyền áp.', TRUE),
                (rec.proc_id, 2, 'Tạo áp suất 100% dải đo giữ trong 5 phút để kiểm tra độ kín khít, sau đó xả về 0 kiểm tra kim chỉ thị.', FALSE),
                (rec.proc_id, 3, 'Tiến hành đo chiều tăng áp (Upscale) tại các điểm 20%, 40%, 60%, 80%, 100% phạm vi đo.', FALSE),
                (rec.proc_id, 4, 'Tiến hành đo chiều giảm áp (Downscale) và xác định sai số biến thiên / độ trễ (Hysteresis).', FALSE),
                (rec.proc_id, 5, 'Xả áp an toàn về 0, tháo thiết bị và xuất trình biên bản hiệu chuẩn.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Độ chính xác áp suất (' || rec.st_name || ')', 'bar', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 2.00, 0.05, 0.010),
                (v_param_id, 2, 4.00, 0.05, 0.010),
                (v_param_id, 3, 6.00, 0.08, 0.015),
                (v_param_id, 4, 10.00, 0.10, 0.020);

            ELSIF rec.st_field = 'NHIET' THEN
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Bố trí các đầu dò nhiệt chuẩn Pt100 / Logger chuẩn tại tâm và các góc không gian làm việc của thiết bị.', TRUE),
                (rec.proc_id, 2, 'Cài đặt điểm nhiệt độ kiểm tra, vận hành thiết bị và chờ ổn định nhiệt tối thiểu 30 phút.', FALSE),
                (rec.proc_id, 3, 'Thu thập chuỗi số liệu nhiệt độ / độ ẩm liên tục trong 30 phút để xác định số đọc trung bình.', FALSE),
                (rec.proc_id, 4, 'Tính toán độ đồng đều không gian (Uniformity) và độ ổn định theo thời gian (Stability).', FALSE),
                (rec.proc_id, 5, 'Đưa thiết bị về nhiệt độ phòng an toàn, tháo đầu dò chuẩn và xuất trình báo cáo.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Độ chính xác nhiệt độ (' || rec.st_name || ')', '°C', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 25.00, 0.50, 0.10),
                (v_param_id, 2, 50.00, 0.80, 0.15),
                (v_param_id, 3, 100.00, 1.20, 0.25);

            ELSIF rec.st_field = 'HOA' THEN
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Vệ sinh đầu đo / cuvet bằng nước cất 2 lần, thấm khô và ổn định nhiệt mẫu chuẩn CRM tại 25°C.', TRUE),
                (rec.proc_id, 2, 'Kiểm tra điểm Zero / Blank và hiệu chuẩn đa điểm bằng dung dịch chuẩn có liên kết chuẩn quốc tế (NIST).', FALSE),
                (rec.proc_id, 3, 'Đo kiểm tra độ chính xác tại 3 nồng độ / mức chuẩn thấp, trung bình và cao.', FALSE),
                (rec.proc_id, 4, 'Kiểm tra độ lặp lại (RSD%) và hệ số bù nhiệt tự động (ATC).', FALSE),
                (rec.proc_id, 5, 'Ngâm bảo quản điện cực trong dung dịch KCl 3M / làm sạch buồng đo và xuất trình báo cáo.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Độ chính xác phân tích hóa lý (' || rec.st_name || ')', 'pH/Unit', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 4.01, 0.03, 0.010),
                (v_param_id, 2, 7.00, 0.03, 0.010),
                (v_param_id, 3, 10.01, 0.05, 0.015);

            ELSIF rec.st_field = 'QUANG' THEN
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Thiết lập buồng tối quang học / môi trường chuẩn, kiểm tra điểm Zero tối khi đậy nắp cảm biến.', TRUE),
                (rec.proc_id, 2, 'Căn chỉnh đồng trục cảm biến với nguồn phát chuẩn và làm nóng nguồn chuẩn trong 15 phút.', FALSE),
                (rec.proc_id, 3, 'Đo kiểm tại các mức cường độ chuẩn phân bố trên toàn dải đo.', FALSE),
                (rec.proc_id, 4, 'Đánh giá độ tuyến tính và sai số tương đối theo tiêu chuẩn ĐLVN.', FALSE),
                (rec.proc_id, 5, 'Tắt nguồn phát chuẩn, đóng nắp bảo vệ cảm biến quang và xuất trình báo cáo.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Độ chính xác quang học & âm học (' || rec.st_name || ')', 'Lux/dB', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 100.0, 3.0, 0.8),
                (v_param_id, 2, 500.0, 15.0, 3.5),
                (v_param_id, 3, 1000.0, 30.0, 7.0);

            ELSE
              -- DET or general
              INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
                (rec.proc_id, 1, 'Kiểm tra cơ cấu gá kẹp, hành trình chuyển động và điều kiện môi trường tiêu chuẩn 20–25°C.', TRUE),
                (rec.proc_id, 2, 'Lắp đặt thiết bị chuẩn tham chiếu (Loadcell chuẩn / Mẫu chuẩn) và cân chỉnh điểm 0.', FALSE),
                (rec.proc_id, 3, 'Thực hiện phép đo so sánh tại các điểm chuẩn trải đều trên phạm vi làm việc.', FALSE),
                (rec.proc_id, 4, 'Kiểm tra tốc độ dịch chuyển / độ đồng đều và độ lặp lại của phép đo.', FALSE),
                (rec.proc_id, 5, 'Tháo bộ gá chuẩn, vệ sinh thiết bị và xuất trình báo cáo hiệu chuẩn.', TRUE);

              INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
              VALUES (rec.proc_id, 'Độ chính xác đo kiểm (' || rec.st_name || ')', 'N/%', 1, 'mean')
              RETURNING id INTO v_param_id;

              INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
                (v_param_id, 1, 50.00, 0.50, 0.12),
                (v_param_id, 2, 200.00, 1.50, 0.35),
                (v_param_id, 3, 500.00, 3.50, 0.80);
            END IF;
          END IF;
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "procedure_steps"
      WHERE "procedure_id" IN (
        SELECT id FROM "calibration_procedures" WHERE "service_type_id" <> 2
      );
      DELETE FROM "procedure_parameters"
      WHERE "procedure_id" IN (
        SELECT id FROM "calibration_procedures" WHERE "service_type_id" <> 2
      );
    `);
  }
}

