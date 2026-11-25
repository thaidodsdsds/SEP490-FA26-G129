import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedCaliperProcedureAndDevices1795300000000
  implements MigrationInterface
{
  name = 'SeedCaliperProcedureAndDevices1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm Thước tóc kiểm tra độ phẳng quang học vào bảng masterstandard
    await queryRunner.query(`
      INSERT INTO "masterstandard" (
        "id",
        "name",
        "serial_number",
        "accuracy_class",
        "calibration_expiry",
        "status"
      ) VALUES
        (10, 'Thước tóc quang học kiểm tra độ phẳng Mitutoyo Knife Edge Rule (150mm)', 'MITU-KER-150', 'Grade 00 (DIN 874/00)', CURRENT_DATE + INTERVAL '730 days', 'Active')
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "serial_number" = EXCLUDED."serial_number",
        "accuracy_class" = EXCLUDED."accuracy_class",
        "calibration_expiry" = EXCLUDED."calibration_expiry",
        "status" = EXCLUDED."status";

      SELECT setval(pg_get_serial_sequence('"masterstandard"', 'id'), (SELECT MAX(id) FROM "masterstandard"));
    `);

    // 2. Cập nhật tên dịch vụ ID 3 (Thước Panme) và Thêm dịch vụ mới ID 9: Thước Cặp (cùng lĩnh vực DODAI)
    await queryRunner.query(`
      UPDATE "service_types"
      SET
        "name" = 'Hiệu chuẩn Thước panme đo ngoài',
        "description" = 'Dịch vụ hiệu chuẩn Thước panme đo ngoài, đo sâu và điện tử theo chuẩn ISO/IEC 17025'
      WHERE "id" = 3;

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
        9,
        'Hiệu chuẩn Thước cặp (Thước kẹp cơ khí, đồng hồ & điện tử)',
        'Calibration',
        'DODAI',
        'HC-THUOC-CAP',
        '0 - 150 mm, 0 - 200 mm, 0 - 300 mm',
        'Dịch vụ hiệu chuẩn Thước cặp (thước kẹp) cơ khí, đồng hồ và điện tử theo ĐLVN 118:2003 / ISO/IEC 17025',
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

    // 3. Thêm thiết bị Thước Cặp vào bảng devices
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
        (5, 2, 'Thước cặp điện tử Mitutoyo Digimatic 0-150mm', '500-196-30', 'Mitutoyo', 'MT-CAL-500-2026', 'TB-CAP-001', '0 - 150 mm / 0.01 mm', FALSE, CURRENT_DATE + INTERVAL '365 days', 'Active'),
        (6, 1, 'Thước cặp cơ khí du xích Mitutoyo 0-200mm', '530-114', 'Mitutoyo', 'MT-CAL-530-8812', 'TB-CAP-002', '0 - 200 mm / 0.02 mm', FALSE, CURRENT_DATE + INTERVAL '365 days', 'Active')
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

    // 4. Tạo Quy trình kỹ thuật hiệu chuẩn Thước cặp (gắn với service_type_id = 9: DODAI)
    await queryRunner.query(`
      DO $$
      DECLARE
        v_proc_id INTEGER;
        v_param_zero_parallel INTEGER;
        v_param_ext INTEGER;
        v_param_int_depth INTEGER;
      BEGIN
        -- 4.1. Insert hoặc Update calibration_procedures cho service_type_id = 9
        SELECT id INTO v_proc_id
        FROM "calibration_procedures"
        WHERE "service_type_id" = 9 AND "version" = 'ĐLVN 118:2003 (V1.0)';

        IF v_proc_id IS NULL THEN
          INSERT INTO "calibration_procedures" (
            "service_type_id",
            "version",
            "environment_requirement",
            "required_equipment",
            "effective_from",
            "status"
          ) VALUES (
            9,
            'ĐLVN 118:2003 (V1.0)',
            '{"temperature_c": {"min": 15, "max": 25, "ideal": 20, "display": "20°C ± 2°C (15°C – 25°C)"}, "humidity_percent": {"min": 40, "max": 70, "display": "40% – 70% RH"}, "stabilize_hours": 2, "note": "Ổn định nhiệt độ: Thước cặp và các chuẩn đo lường phải được đặt tại phòng hiệu chuẩn tối thiểu từ 1 đến 2 giờ trước khi thao tác. Tránh chấn động, gió lùa và ánh nắng chiếu trực tiếp."}'::jsonb,
            '["Bộ căn mẫu chuẩn cấp 1 hoặc 2 (0.5 - 100mm)", "Bàn đá phẳng Granite cấp 0", "Thước tóc (dao thử phẳng quang học)", "Đũa đo chuẩn và bộ gá kiểm tra độ song song", "Dung dịch vệ sinh chuyên dụng và găng tay thao tác"]'::jsonb,
            CURRENT_DATE,
            'Active'
          ) RETURNING id INTO v_proc_id;
        ELSE
          UPDATE "calibration_procedures"
          SET
            "environment_requirement" = '{"temperature_c": {"min": 15, "max": 25, "ideal": 20, "display": "20°C ± 2°C (15°C – 25°C)"}, "humidity_percent": {"min": 40, "max": 70, "display": "40% – 70% RH"}, "stabilize_hours": 2, "note": "Ổn định nhiệt độ: Thước cặp và các chuẩn đo lường phải được đặt tại phòng hiệu chuẩn tối thiểu từ 1 đến 2 giờ trước khi thao tác. Tránh chấn động, gió lùa và ánh nắng chiếu trực tiếp."}'::jsonb,
            "required_equipment" = '["Bộ căn mẫu chuẩn cấp 1 hoặc 2 (0.5 - 100mm)", "Bàn đá phẳng Granite cấp 0", "Thước tóc (dao thử phẳng quang học)", "Đũa đo chuẩn và bộ gá kiểm tra độ song song", "Dung dịch vệ sinh chuyên dụng và găng tay thao tác"]'::jsonb,
            "status" = 'Active'
          WHERE id = v_proc_id;
        END IF;

        -- 4.2. Tạo các bước quy trình thực hiện
        DELETE FROM "procedure_steps" WHERE "procedure_id" = v_proc_id;

        INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
          (v_proc_id, 1, 'Chuẩn bị & Ổn định nhiệt độ: Đặt thước cặp và các phương tiện chuẩn trong phòng hiệu chuẩn tối thiểu 1 - 2 giờ để cân bằng nhiệt độ (15°C - 25°C, độ ẩm 40% - 70%RH). Đeo găng tay thao tác để tránh truyền nhiệt thân nhiệt sang thước.', FALSE),
          (v_proc_id, 2, 'Vệ sinh & Kiểm tra bên ngoài (Ngoại quan): Làm sạch bề mặt đo, mỏ đo và thân thước, loại bỏ bụi bẩn và dầu mỡ bảo quản. Kiểm tra tổng thể thân thước không bị cong vênh, rỉ sét, nứt gãy. Vít hãm và con chạy phải trượt êm ái, trơn tru dọc thân thước. Kiểm tra vạch chia rõ nét hoặc màn hình LCD hiển thị đầy đủ nét số.', FALSE),
          (v_proc_id, 3, 'Kiểm tra kỹ thuật (Điểm 0, Độ phẳng & Độ song song): Khép sát hai mỏ đo ngoài kiểm tra điểm 0 (vạch 0 trùng khớp hoặc màn hình hiển thị 0.00 mm). Áp thước tóc theo nhiều hướng để soi khe sáng kiểm tra độ phẳng mặt đo. Kẹp căn mẫu 5 mm ở đầu và cuối mỏ đo ngoài rồi dùng đũa đo kiểm tra độ song song (sai lệch ≤ 0.01 mm). Kiểm tra độ song song mỏ đo trong.', TRUE),
          (v_proc_id, 4, 'Kiểm tra đo lường (Kích thước ngoài, Kích thước trong & Chiều sâu): Dùng các căn mẫu chuẩn đo kiểm tra mỏ đo ngoài tại các điểm phân bố đều trên dải đo (20, 50, 80, 100, 150 mm). Kiểm tra mỏ đo trong tại các mốc 20 mm và 50 mm. Kiểm tra thanh đo độ sâu tại các mốc 20 mm và 50 mm trên bàn đá chuẩn. Ghi nhận toàn bộ số liệu đo.', FALSE),
          (v_proc_id, 5, 'Đánh giá & Xử lý kết quả: Tính toán sai số chỉ thị cho từng cơ cấu đo (ngoài, trong, sâu) và ước lượng độ không đảm bảo đo tổng hợp (U ≤ 0.01 mm). Đánh giá sự phù hợp tiêu chuẩn ĐLVN 118:2003 / JIS B 7507. Cấp giấy chứng nhận hiệu chuẩn kèm tem nếu đạt; lập biên bản từ chối nếu không đạt.', TRUE);

        -- 4.3. Tạo các thông số đo lường
        DELETE FROM "procedure_parameters" WHERE "procedure_id" = v_proc_id;

        -- Thông số 1: Điểm 0 và độ song song mỏ đo ngoài
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra điểm 0 và độ song song mỏ đo ngoài', 'mm', 1, 'abs')
        RETURNING id INTO v_param_zero_parallel;

        -- Thông số 2: Sai số mỏ đo kích thước ngoài
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra sai số mỏ đo kích thước ngoài', 'mm', 1, 'mean')
        RETURNING id INTO v_param_ext;

        -- Thông số 3: Sai số mỏ đo trong và thanh đo độ sâu
        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra sai số mỏ đo trong và thanh đo độ sâu', 'mm', 1, 'mean')
        RETURNING id INTO v_param_int_depth;

        -- 4.4. Tạo các điểm đo chuẩn
        DELETE FROM "procedure_test_points" WHERE "parameter_id" IN (v_param_zero_parallel, v_param_ext, v_param_int_depth);

        -- Điểm 0 và Độ song song mỏ đo ngoài
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_zero_parallel, 1, 0.000, 0.010, 0.003),
          (v_param_zero_parallel, 2, 0.000, 0.010, 0.003);

        -- 5 điểm mỏ đo ngoài: 20, 50, 80, 100, 150 mm
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_ext, 1, 20.000, 0.020, 0.005),
          (v_param_ext, 2, 50.000, 0.030, 0.005),
          (v_param_ext, 3, 80.000, 0.030, 0.006),
          (v_param_ext, 4, 100.000, 0.030, 0.006),
          (v_param_ext, 5, 150.000, 0.030, 0.008);

        -- 4 điểm mỏ đo trong và thanh đo sâu: Trong 20mm, Trong 50mm, Sâu 20mm, Sâu 50mm
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_int_depth, 1, 20.000, 0.030, 0.006),
          (v_param_int_depth, 2, 50.000, 0.040, 0.008),
          (v_param_int_depth, 3, 20.000, 0.030, 0.006),
          (v_param_int_depth, 4, 50.000, 0.030, 0.006);

      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "devices" WHERE "id" IN (5, 6);
      DELETE FROM "calibration_procedures" WHERE "service_type_id" = 9;
      DELETE FROM "service_types" WHERE "id" = 9;
      DELETE FROM "masterstandard" WHERE "id" = 10;
    `);
  }
}

