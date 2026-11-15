import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedMicrometerProcedureAndDevice1795000000000
  implements MigrationInterface
{
  name = 'SeedMicrometerProcedureAndDevice1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm chuẩn đối chứng vào bảng masterstandard nếu chưa có
    await queryRunner.query(`
      INSERT INTO "masterstandard" (
        "id",
        "name",
        "serial_number",
        "accuracy_class",
        "calibration_expiry",
        "status"
      ) VALUES
        (7, 'Bộ căn mẫu chuẩn cấp 1 Mitutoyo (0.5 - 100mm)', 'MITU-GB-516', 'Grade 1 (ISO 3650)', CURRENT_DATE + INTERVAL '730 days', 'Active'),
        (8, 'Bàn đá phẳng Granite Mitutoyo cấp 0 (600x450mm)', 'MITU-GP-6045', 'Grade 0 (DIN 876)', CURRENT_DATE + INTERVAL '1095 days', 'Active')
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "serial_number" = EXCLUDED."serial_number",
        "accuracy_class" = EXCLUDED."accuracy_class",
        "calibration_expiry" = EXCLUDED."calibration_expiry",
        "status" = EXCLUDED."status";

      SELECT setval(pg_get_serial_sequence('"masterstandard"', 'id'), (SELECT MAX(id) FROM "masterstandard"));
    `);

    // 2. Thêm thiết bị Thước panme vào bảng devices
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
        (1, 1, 'Thước panme đo ngoài cơ khí 0-25mm', '103-137', 'Mitutoyo', 'MT-MIC-2026-01', 'TB-MIC-001', '0 - 25 mm / 0.001 mm', TRUE, CURRENT_DATE + INTERVAL '180 days', 'Active'),
        (2, 2, 'Thước panme đo ngoài điện tử Digimatic 0-25mm', '293-240-30', 'Mitutoyo', 'MT-DIGI-8842', 'TB-MIC-002', '0 - 25 mm / 0.001 mm', TRUE, CURRENT_DATE + INTERVAL '365 days', 'Active')
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

    // 3. Tạo Quy trình kỹ thuật hiệu chuẩn thước panme (service_type_id = 3: Hiệu chuẩn Độ dài – Dung tích)
    await queryRunner.query(`
      DO $$
      DECLARE
        v_proc_id INTEGER;
        v_param_zero INTEGER;
        v_param_lin INTEGER;
      BEGIN
        -- 3.1. Insert hoặc Update calibration_procedures cho service_type_id = 3
        SELECT id INTO v_proc_id
        FROM "calibration_procedures"
        WHERE "service_type_id" = 3 AND "version" = 'V1.0';

        IF v_proc_id IS NULL THEN
          INSERT INTO "calibration_procedures" (
            "service_type_id",
            "version",
            "environment_requirement",
            "required_equipment",
            "effective_from",
            "status"
          ) VALUES (
            3,
            'V1.0',
            '{"temperature_c": {"min": 19, "max": 25, "ideal": 20, "display": "20°C ± 1°C (hoặc 19°C – 25°C)"}, "humidity_percent": {"min": 40, "max": 70, "display": "40% – 70% RH"}, "stabilize_hours": 1, "note": "Phòng kín gió, đủ ánh sáng, tránh ánh nắng chiếu trực tiếp. Đặt thước và phương tiện chuẩn ổn định nhiệt tối thiểu 1 giờ trước khi đo."}'::jsonb,
            '["Bộ căn mẫu chuẩn (cấp chính xác ≤ 2)", "Bàn đá phẳng (hoặc bàn kim loại phẳng thay thế)", "Dung dịch vệ sinh chuyên dụng", "Găng tay chuyên dụng"]'::jsonb,
            CURRENT_DATE,
            'Active'
          ) RETURNING id INTO v_proc_id;
        ELSE
          UPDATE "calibration_procedures"
          SET
            "environment_requirement" = '{"temperature_c": {"min": 19, "max": 25, "ideal": 20, "display": "20°C ± 1°C (hoặc 19°C – 25°C)"}, "humidity_percent": {"min": 40, "max": 70, "display": "40% – 70% RH"}, "stabilize_hours": 1, "note": "Phòng kín gió, đủ ánh sáng, tránh ánh nắng chiếu trực tiếp. Đặt thước và phương tiện chuẩn ổn định nhiệt tối thiểu 1 giờ trước khi đo."}'::jsonb,
            "required_equipment" = '["Bộ căn mẫu chuẩn (cấp chính xác ≤ 2)", "Bàn đá phẳng (hoặc bàn kim loại phẳng thay thế)", "Dung dịch vệ sinh chuyên dụng", "Găng tay chuyên dụng"]'::jsonb,
            "status" = 'Active'
          WHERE id = v_proc_id;
        END IF;

        -- 3.2. Tạo 4 bước quy trình thực hiện chuẩn
        DELETE FROM "procedure_steps" WHERE "procedure_id" = v_proc_id;

        INSERT INTO "procedure_steps" ("procedure_id", "step_no", "instruction", "requires_evidence") VALUES
          (v_proc_id, 1, 'Chuẩn bị & Ổn định nhiệt: Đeo găng tay chuyên dụng. Vệ sinh sạch sẽ bề mặt tiếp xúc của panme và các căn mẫu chuẩn bằng dung dịch vệ sinh chuyên dụng. Đặt thiết bị và phương tiện chuẩn trong phòng đo tối thiểu 1 giờ trước khi bắt đầu để cân bằng nhiệt độ.', FALSE),
          (v_proc_id, 2, 'Kiểm tra điểm 0: Vặn núm điều chỉnh cho hai đầu đo của panme khớp lại với nhau cho đến khi núm vặn kêu 3 tiếng (đủ lực đo). Điều chỉnh thước về vạch 0, sau đó vặn ngược lại khoảng 1/3 giá trị thang đo rồi siết lại và ghi nhận kết quả. Đối với panme điện tử, nhấn phím 0 (Zero) để thiết lập lại điểm mốc.', TRUE),
          (v_proc_id, 3, 'Kiểm tra độ tuyến tính: Đưa thước về vị trí 0 và khóa chốt. Tiến hành đo kiểm tra với các căn mẫu chuẩn tại các điểm tương ứng với 25%, 50%, 75% và 95% dải đo của thước. Kẹp chặt đầu đo vào căn mẫu chuẩn để cố định vị trí và đọc số liệu hiển thị.', FALSE),
          (v_proc_id, 4, 'Đánh giá và xử lý kết quả: Ước lượng độ không đảm bảo đo tổng hợp (độ lặp lại, sai số chuẩn, sai số đọc, hệ số giãn nở nhiệt). Đánh giá sự phù hợp tiêu chuẩn ĐLVN/ISO 17025. Cấp giấy chứng nhận kèm tem/dấu kiểm định nếu đạt, hoặc lập biên bản từ chối và thu hồi dấu cũ nếu không đạt.', TRUE);

        -- 3.3. Tạo thông số đo lường
        DELETE FROM "procedure_parameters" WHERE "procedure_id" = v_proc_id;

        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra sai số điểm 0 (Zero Point Check)', 'mm', 1, 'abs')
        RETURNING id INTO v_param_zero;

        INSERT INTO "procedure_parameters" ("procedure_id", "name", "unit", "repeat_count", "calculation_method")
        VALUES (v_proc_id, 'Kiểm tra độ tuyến tính dải đo (Linearity Check)', 'mm', 1, 'mean')
        RETURNING id INTO v_param_lin;

        -- 3.4. Tạo các điểm đo chuẩn (Điểm 0 và các điểm 25%, 50%, 75%, 95% dải đo 0-25mm)
        DELETE FROM "procedure_test_points" WHERE "parameter_id" IN (v_param_zero, v_param_lin);

        -- Điểm 0: Danh định 0.000 mm, Dung sai ±0.002 mm, Max Độ KĐB 0.0005 mm
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_zero, 1, 0.000, 0.002, 0.0005);

        -- Độ tuyến tính dải đo 0-25mm:
        -- Điểm 1: 25% = 6.250 mm, Dung sai ±0.002 mm, Độ KĐB 0.0006 mm
        -- Điểm 2: 50% = 12.500 mm, Dung sai ±0.002 mm, Độ KĐB 0.0006 mm
        -- Điểm 3: 75% = 18.750 mm, Dung sai ±0.003 mm, Độ KĐB 0.0008 mm
        -- Điểm 4: 95% = 23.750 mm, Dung sai ±0.003 mm, Độ KĐB 0.0008 mm
        INSERT INTO "procedure_test_points" ("parameter_id", "point_no", "nominal_value", "tolerance", "max_uncertainty") VALUES
          (v_param_lin, 1, 6.250, 0.002, 0.0006),
          (v_param_lin, 2, 12.500, 0.002, 0.0006),
          (v_param_lin, 3, 18.750, 0.003, 0.0008),
          (v_param_lin, 4, 23.750, 0.003, 0.0008);

      END $$;
    `);

    // 4. Tạo yêu cầu dịch vụ và phân công công việc mẫu cho KTV Lê Văn Cường (ID 4)
    await queryRunner.query(`
      -- 4.1. Tạo Service Request
      INSERT INTO "service_requests" (
        "id",
        "customer_id",
        "created_by",
        "request_code",
        "location_type",
        "preferred_date",
        "status",
        "created_at"
      ) VALUES (
        1,
        1,
        2,
        'SR-2026-001',
        'In-lab',
        CURRENT_DATE + INTERVAL '7 days',
        'Confirmed',
        NOW()
      ) ON CONFLICT ("id") DO NOTHING;

      SELECT setval(pg_get_serial_sequence('"service_requests"', 'id'), (SELECT MAX(id) FROM "service_requests"));

      -- 4.2. Tạo Service Request Item cho Thước panme (device_id = 1, service_type_id = 3)
      INSERT INTO "service_request_items" (
        "id",
        "service_request_id",
        "device_id",
        "service_type_id",
        "status"
      ) VALUES (
        1,
        1,
        1,
        3,
        'Pending'
      ) ON CONFLICT ("id") DO NOTHING;

      SELECT setval(pg_get_serial_sequence('"service_request_items"', 'id'), (SELECT MAX(id) FROM "service_request_items"));

      -- 4.3. Tạo Báo giá và Hợp đồng
      INSERT INTO "quotations" (
        "id",
        "service_request_id",
        "subtotal",
        "discount_amount",
        "travel_fee",
        "total_amount",
        "status"
      ) VALUES (
        1,
        1,
        450000,
        0,
        0,
        450000,
        'Approved'
      ) ON CONFLICT ("id") DO NOTHING;

      SELECT setval(pg_get_serial_sequence('"quotations"', 'id'), (SELECT MAX(id) FROM "quotations"));

      INSERT INTO "contracts" (
        "id",
        "contract_code",
        "contract_type",
        "quotation_id",
        "customer_id",
        "created_by",
        "title",
        "subtotal",
        "discount_amount",
        "travel_fee",
        "total_amount",
        "status"
      ) VALUES (
        1,
        'HD-2026-001',
        'Service',
        1,
        1,
        2,
        'Hợp đồng hiệu chuẩn thiết bị đo lường',
        450000,
        0,
        0,
        450000,
        'Signed'
      ) ON CONFLICT ("id") DO NOTHING;

      SELECT setval(pg_get_serial_sequence('"contracts"', 'id'), (SELECT MAX(id) FROM "contracts"));

      -- 4.4. Tạo Lệnh công tác Work Order
      INSERT INTO "work_orders" (
        "id",
        "contract_id",
        "quotation_id",
        "status",
        "created_at"
      ) VALUES (
        1,
        1,
        1,
        'Open',
        NOW()
      ) ON CONFLICT ("id") DO NOTHING;

      SELECT setval(pg_get_serial_sequence('"work_orders"', 'id'), (SELECT MAX(id) FROM "work_orders"));

      -- 4.5. Phân công nhiệm vụ cho KTV Lê Văn Cường (ID 4) với chuẩn Bộ căn mẫu Mitutoyo (ID 7)
      INSERT INTO "work_order_assignments" (
        "id",
        "work_order_id",
        "service_request_item_id",
        "technician_id",
        "master_standard_id",
        "assigned_by",
        "scheduled_start",
        "scheduled_end",
        "status"
      ) VALUES (
        1,
        1,
        1,
        4,
        7,
        5,
        NOW(),
        NOW() + INTERVAL '2 days',
        'Assigned'
      ) ON CONFLICT ("id") DO NOTHING;

      SELECT setval(pg_get_serial_sequence('"work_order_assignments"', 'id'), (SELECT MAX(id) FROM "work_order_assignments"));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "work_order_assignments" WHERE "id" = 1;
      DELETE FROM "work_orders" WHERE "id" = 1;
      DELETE FROM "contracts" WHERE "id" = 1;
      DELETE FROM "quotations" WHERE "id" = 1;
      DELETE FROM "service_request_items" WHERE "id" = 1;
      DELETE FROM "service_requests" WHERE "id" = 1;
      DELETE FROM "devices" WHERE "id" IN (1, 2);
    `);
  }
}
