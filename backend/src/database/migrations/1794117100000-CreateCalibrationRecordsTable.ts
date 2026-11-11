import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateCalibrationRecordsTable1794117100000
  implements MigrationInterface
{
  name = 'CreateCalibrationRecordsTable1794117100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calibration_records" (
        "id" SERIAL PRIMARY KEY,
        "service_request_item_id" INTEGER NOT NULL,
        "procedure_id" INTEGER NOT NULL,
        "technician_id" INTEGER NOT NULL,
        "environment_temp" NUMERIC,
        "environment_humidity" NUMERIC,
        "result_status" VARCHAR(10)
          CHECK ("result_status" IN ('Pass', 'Fail')),
        "review_status" VARCHAR(20) NOT NULL DEFAULT 'Pending'
          CHECK ("review_status" IN ('Pending', 'Approved', 'Rejected')),
        "submitted_at" TIMESTAMPTZ,

        CONSTRAINT "FK_calibration_records_service_request_item"
          FOREIGN KEY ("service_request_item_id")
          REFERENCES "service_request_items" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_calibration_records_procedure"
          FOREIGN KEY ("procedure_id")
          REFERENCES "calibration_procedures" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_calibration_records_technician"
          FOREIGN KEY ("technician_id")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_calibration_records_service_request_item_id"
      ON "calibration_records" ("service_request_item_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_calibration_records_procedure_id"
      ON "calibration_records" ("procedure_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_calibration_records_technician_id"
      ON "calibration_records" ("technician_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_calibration_records_review_status"
      ON "calibration_records" ("review_status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "calibration_records";
    `);
  }
}
