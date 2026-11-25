import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProcedureDetailsAndStandardsTables1793181000000
  implements MigrationInterface
{
  name = "CreateProcedureDetailsAndStandardsTables1793181000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. procedure_steps
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "procedure_steps" (
        "id" SERIAL NOT NULL,
        "procedure_id" INTEGER NOT NULL,
        "step_no" INTEGER NOT NULL,
        "instruction" TEXT NOT NULL,
        "requires_evidence" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_procedure_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procedure_steps_procedure_id"
          FOREIGN KEY ("procedure_id")
          REFERENCES "calibration_procedures" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        CONSTRAINT "UQ_procedure_steps_proc_step_no"
          UNIQUE ("procedure_id", "step_no")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_procedure_steps_procedure_id"
      ON "procedure_steps" ("procedure_id");
    `);

    // 2. procedure_parameters
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "procedure_parameters" (
        "id" SERIAL NOT NULL,
        "procedure_id" INTEGER NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "unit" VARCHAR(50) NOT NULL,
        "repeat_count" INTEGER NOT NULL DEFAULT 1,
        "calculation_method" VARCHAR(255) NOT NULL DEFAULT 'mean',
        CONSTRAINT "PK_procedure_parameters_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procedure_parameters_procedure_id"
          FOREIGN KEY ("procedure_id")
          REFERENCES "calibration_procedures" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_procedure_parameters_procedure_id"
      ON "procedure_parameters" ("procedure_id");
    `);

    // 3. procedure_test_points
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "procedure_test_points" (
        "id" SERIAL NOT NULL,
        "parameter_id" INTEGER NOT NULL,
        "point_no" INTEGER NOT NULL,
        "nominal_value" NUMERIC(15, 4) NOT NULL,
        "tolerance" NUMERIC(15, 4),
        "max_uncertainty" NUMERIC(15, 4),
        CONSTRAINT "PK_procedure_test_points_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procedure_test_points_parameter_id"
          FOREIGN KEY ("parameter_id")
          REFERENCES "procedure_parameters" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        CONSTRAINT "UQ_procedure_test_points_param_point_no"
          UNIQUE ("parameter_id", "point_no")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_procedure_test_points_parameter_id"
      ON "procedure_test_points" ("parameter_id");
    `);

    // 4. master_standards
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "master_standards" (
        "id" SERIAL NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "serial_number" VARCHAR(100) NOT NULL,
        "accuracy_class" VARCHAR(100),
        "calibration_expiry" DATE NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
        CONSTRAINT "PK_master_standards_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_master_standards_serial_number" UNIQUE ("serial_number"),
        CONSTRAINT "CHK_master_standards_status" CHECK ("status" IN ('Active', 'Inactive', 'Expired'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_master_standards_status"
      ON "master_standards" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_master_standards_calibration_expiry"
      ON "master_standards" ("calibration_expiry");
    `);

    // Seed dữ liệu chuẩn đối chứng ban đầu theo SRS v1.5
    await queryRunner.query(`
      INSERT INTO "master_standards" ("name", "serial_number", "accuracy_class", "calibration_expiry", "status")
      VALUES
        ('Calibrator Fluke 5522A', 'FLK-5522A-8841', '0.005 %', CURRENT_DATE + INTERVAL '180 days', 'Active'),
        ('Bộ quả cân chuẩn F2 (1mg - 1kg)', 'QC-F2-2024-09', 'Class F2', CURRENT_DATE + INTERVAL '240 days', 'Active'),
        ('Khối chuẩn độ dài Grade 0 (Mitutoyo)', 'MIT-BLK-0042', 'Grade 0', CURRENT_DATE + INTERVAL '120 days', 'Active'),
        ('Áp kế chuẩn Fluke 700G31', 'FLK-700G-9901', '0.05 % FS', CURRENT_DATE + INTERVAL '45 days', 'Active'),
        ('Bộ ghi nhiệt độ đa kênh 9 đầu dò Chino', 'CHN-9CH-1029', '±0.1 °C', CURRENT_DATE - INTERVAL '10 days', 'Expired'),
        ('Bộ tải chuẩn công tơ điện 3 pha', 'TC-3P-5501', '0.02 %', CURRENT_DATE + INTERVAL '300 days', 'Active')
      ON CONFLICT ("serial_number") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "procedure_test_points";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procedure_parameters";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procedure_steps";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "master_standards";`);
  }
}
