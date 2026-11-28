import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDraftFieldsAndRefinePressure1796400000000 implements MigrationInterface {
  name = 'RemoveDraftFieldsAndRefinePressure1796400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Delete draft service types with no procedures or references: HOA (6), QUANG (7), DET (8)
    await queryRunner.query(`
      DELETE FROM service_types 
      WHERE field IN ('HOA', 'QUANG', 'DET') OR id IN (6, 7, 8);
    `);

    // 2. Refine Service Type 4 (Áp kế công nghiệp) calibration procedure environment & standard code
    await queryRunner.query(`
      UPDATE service_types
      SET 
        standard_code = 'ĐLVN 76:2001',
        description = 'Dịch vụ hiệu chuẩn Áp kế lò xo, Đồng hồ đo áp suất và Cảm biến áp suất theo ĐLVN 76:2001 / ISO/IEC 17025'
      WHERE id = 4;
    `);

    await queryRunner.query(`
      UPDATE calibration_procedures
      SET 
        version = 'ĐLVN 76:2001 (V1.0)',
        required_equipment = '["Áp kế chuẩn hiện số Fluke 700G31 (cấp chính xác 0.05)","Bơm tạo áp thủy lực và khí nén chuyên dụng (0 - 700 bar)","Bộ cút nối nhanh cao áp"]'::jsonb,
        environment_requirement = '{"temperature_c": {"min": 18, "max": 25, "ideal": 20, "display": "20°C ± 2°C (18°C – 25°C)"}, "humidity_percent": {"min": 30, "max": 80, "display": "≤ 80% RH"}, "note": "Phòng hiệu chuẩn áp suất cần đặt trên nền vững chắc, không bị rung lắc và tránh luồng gió lùa trực tiếp."}'::jsonb
      WHERE id = 2 AND service_type_id = 4;
    `);

    // Also update steps for procedure 2 (Áp kế công nghiệp) to match ĐLVN 76:2001
    await queryRunner.query(`
      UPDATE procedure_steps
      SET instruction = 'Chuẩn bị & Ổn định nhiệt: Đặt áp kế cần hiệu chuẩn và phương tiện chuẩn trong phòng đo tối thiểu 2 giờ. Lắp đặt áp kế lên giá bơm tạo áp theo phương thẳng đứng.'
      WHERE procedure_id = 2 AND step_no = 1;
    `);

    await queryRunner.query(`
      UPDATE procedure_steps
      SET instruction = 'Kiểm tra bên ngoài: Mặt kính trong suốt, kim chỉ không chạm mặt số, vạch chia rõ ràng, vỏ không bị móp méo rò rỉ dầu.'
      WHERE procedure_id = 2 AND step_no = 2;
    `);

    await queryRunner.query(`
      UPDATE procedure_steps
      SET instruction = 'Kiểm tra kỹ thuật: Kiểm tra vị trí kim chỉ về điểm 0 khi không chịu tải. Tăng áp suất nhẹ kiểm tra chuyển động của kim êm, không bị kẹt dính.'
      WHERE procedure_id = 2 AND step_no = 3;
    `);

    await queryRunner.query(`
      UPDATE procedure_steps
      SET instruction = 'Kiểm tra đo lường (Xác định sai số số chỉ): Tiến hành so sánh số chỉ tại ít nhất 5 điểm phân bố đều trên dải đo theo cả hai chiều tăng áp và giảm áp.'
      WHERE procedure_id = 2 AND step_no = 4;
    `);

    await queryRunner.query(`
      UPDATE procedure_steps
      SET instruction = 'Đánh giá độ hồi sai (Hysteresis) & Đánh giá kết quả: Tính toán sai số cơ bản lớn nhất và độ trễ số chỉ, so sánh với cấp chính xác công bố của thiết bị.'
      WHERE procedure_id = 2 AND step_no = 5;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-insert if needed
    await queryRunner.query(`
      INSERT INTO service_types (id, name, kind, field, standard_code, measuring_range, description, status)
      VALUES 
        (6, 'Hiệu chuẩn Hóa học – Y tế – Môi trường', 'Calibration', 'HOA', 'HC-HOA', 'pH, EC, quang phổ', 'Dịch vụ hiệu chuẩn Hóa học', 'Inactive'),
        (7, 'Hiệu chuẩn Quang học – Âm thanh', 'Calibration', 'QUANG', 'HC-QUANG', 'Độ rọi, âm thanh', 'Dịch vụ hiệu chuẩn Quang học', 'Inactive'),
        (8, 'Hiệu chuẩn Thiết bị Dệt may – Da giày', 'Calibration', 'DET', 'HC-DET', 'Độ bền, độ ẩm', 'Dịch vụ hiệu chuẩn Dệt may', 'Inactive')
      ON CONFLICT (id) DO NOTHING;
    `);
  }
}
