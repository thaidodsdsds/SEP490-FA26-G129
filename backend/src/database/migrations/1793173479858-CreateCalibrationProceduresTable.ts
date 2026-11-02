import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCalibrationProceduresTable1793173479858 implements MigrationInterface
{
  name = 'CreateCalibrationProceduresTable1793168000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calibration_procedures" (
        "id" SERIAL NOT NULL,

        "service_type_id" INTEGER NOT NULL,

        "version" VARCHAR(20) NOT NULL,

        "environment_requirement" JSONB,

        "required_equipment" JSONB,

        "effective_from" DATE,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Draft',

        CONSTRAINT "PK_calibration_procedures_id"
          PRIMARY KEY ("id"),

        CONSTRAINT "FK_calibration_procedures_service_type"
          FOREIGN KEY ("service_type_id")
          REFERENCES "service_types" ("id")
          ON DELETE RESTRICT
          ON UPDATE CASCADE,

        CONSTRAINT "UQ_calibration_procedures_service_version"
          UNIQUE ("service_type_id", "version"),

        CONSTRAINT "CHK_calibration_procedures_status"
          CHECK ("status" IN ('Draft', 'Active', 'Obsolete'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_calibration_procedures_service_type_id"
      ON "calibration_procedures" ("service_type_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_calibration_procedures_status"
      ON "calibration_procedures" ("status")
    `);

    // Mỗi loại dịch vụ chỉ có tối đa một quy trình Active.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_calibration_procedures_one_active"
      ON "calibration_procedures" ("service_type_id")
      WHERE "status" = 'Active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "calibration_procedures"
    `);
  }

}
