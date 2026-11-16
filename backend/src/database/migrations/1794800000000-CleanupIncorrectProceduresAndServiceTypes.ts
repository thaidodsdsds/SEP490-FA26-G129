import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CleanupIncorrectProceduresAndServiceTypes1794800000000
  implements MigrationInterface
{
  name = 'CleanupIncorrectProceduresAndServiceTypes1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Xóa dữ liệu kết quả đo kiểm, nhật ký phê duyệt và chữ ký số gắn với hồ sơ hiệu chuẩn cũ
    await queryRunner.query(`
      DELETE FROM "measurement_details";
      DELETE FROM "step_results";
      DELETE FROM "review_logs";
      DELETE FROM "digital_signatures" WHERE "calibration_record_id" IS NOT NULL;
      DELETE FROM "calibration_records";
    `);

    // 2. Xóa toàn bộ các quy trình kỹ thuật đã tạo sai nghiệp vụ (các thiết bị/chuẩn đối chứng bị nhầm thành quy trình)
    await queryRunner.query(`
      DELETE FROM "procedure_test_points";
      DELETE FROM "procedure_parameters";
      DELETE FROM "procedure_steps";
      DELETE FROM "calibration_procedures";
    `);

    // 3. Khởi tạo/Cập nhật 8 Loại dịch vụ (Service Types) chuẩn theo đúng 8 lĩnh vực (tiêu đề đen trong tài liệu nghiệp vụ)
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
      ) VALUES
        (1, 'Hiệu chuẩn Điện – Điện tử – Tần số', 'Calibration', 'DIEN', 'HC-DIEN', 'Điện áp AC/DC, dòng điện, tần số, điện trở', 'Dịch vụ hiệu chuẩn lĩnh vực Điện – Điện tử – Tần số theo chuẩn ISO/IEC 17025', 'Active'),
        (2, 'Hiệu chuẩn Khối lượng – Lực', 'Calibration', 'KHOILUONG', 'HC-KHOILUONG', 'Khối lượng, lực kéo/nén, độ cứng', 'Dịch vụ hiệu chuẩn lĩnh vực Khối lượng – Lực theo chuẩn ISO/IEC 17025', 'Active'),
        (3, 'Hiệu chuẩn Độ dài – Dung tích', 'Calibration', 'DODAI', 'HC-DODAI', 'Kích thước, độ dài, góc, dung tích', 'Dịch vụ hiệu chuẩn lĩnh vực Độ dài – Dung tích theo chuẩn ISO/IEC 17025', 'Active'),
        (4, 'Hiệu chuẩn Áp suất – Lưu lượng', 'Calibration', 'APSUAT', 'HC-APSUAT', 'Áp suất âm, áp suất dương, lưu lượng', 'Dịch vụ hiệu chuẩn lĩnh vực Áp suất – Lưu lượng theo chuẩn ISO/IEC 17025', 'Active'),
        (5, 'Hiệu chuẩn Nhiệt độ – Độ ẩm', 'Calibration', 'NHIET', 'HC-NHIET', '-80 đến 1200 °C, 5 - 98 %RH', 'Dịch vụ hiệu chuẩn lĩnh vực Nhiệt độ – Độ ẩm theo chuẩn ISO/IEC 17025', 'Active'),
        (6, 'Hiệu chuẩn Hóa học – Y tế – Môi trường', 'Calibration', 'HOA', 'HC-HOA', 'pH, độ dẫn điện EC, quang phổ, nồng độ khí', 'Dịch vụ hiệu chuẩn lĩnh vực Hóa học – Y tế – Môi trường theo chuẩn ISO/IEC 17025', 'Active'),
        (7, 'Hiệu chuẩn Quang học – Âm thanh', 'Calibration', 'QUANG', 'HC-QUANG', 'Độ rọi Lux, độ đục, mức áp suất âm thanh dB', 'Dịch vụ hiệu chuẩn lĩnh vực Quang học – Âm thanh theo chuẩn ISO/IEC 17025', 'Active'),
        (8, 'Hiệu chuẩn Thiết bị Dệt may – Da giày – Thực phẩm', 'Calibration', 'DET', 'HC-DET', 'Độ bền kéo đứt, độ co giãn, tủ so màu, độ ẩm vật liệu', 'Dịch vụ hiệu chuẩn lĩnh vực Thiết bị Dệt may – Da giày – Thực phẩm theo chuẩn ISO/IEC 17025', 'Active')
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "kind" = EXCLUDED."kind",
        "field" = EXCLUDED."field",
        "standard_code" = EXCLUDED."standard_code",
        "measuring_range" = EXCLUDED."measuring_range",
        "description" = EXCLUDED."description",
        "status" = EXCLUDED."status";
    `);

    // 4. Ánh xạ lại service_request_items hiện có về 8 service types chuẩn tương ứng theo lĩnh vực kỹ thuật
    await queryRunner.query(`
      UPDATE "service_request_items" sri
      SET "service_type_id" = CASE
        WHEN st.field = 'DIEN' THEN 1
        WHEN st.field = 'KHOILUONG' THEN 2
        WHEN st.field = 'DODAI' THEN 3
        WHEN st.field = 'APSUAT' THEN 4
        WHEN st.field = 'NHIET' THEN 5
        WHEN st.field = 'HOA' THEN 6
        WHEN st.field = 'QUANG' THEN 7
        WHEN st.field = 'DET' THEN 8
        ELSE 1
      END
      FROM "service_types" st
      WHERE sri.service_type_id = st.id;
    `);

    // 5. Xóa bỏ toàn bộ 34 service_types cũ bị sai nghiệp vụ (các thiết bị/chuẩn đối chứng)
    await queryRunner.query(`
      DELETE FROM "service_types" WHERE "id" > 8;
    `);

    // 6. Reset sequence các bảng dữ liệu
    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('"service_types"', 'id'), 8);
      SELECT setval(pg_get_serial_sequence('"calibration_procedures"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"procedure_steps"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"procedure_parameters"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"procedure_test_points"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"calibration_records"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"measurement_details"', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('"step_results"', 'id'), 1, false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Giữ nguyên cấu trúc bảng
  }
}

