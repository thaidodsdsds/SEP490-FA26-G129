import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateStepResultsTable1794117200000
  implements MigrationInterface
{
  name = 'CreateStepResultsTable1794117200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "step_results" (
        "id" SERIAL PRIMARY KEY,
        "calibration_record_id" INTEGER NOT NULL,
        "procedure_step_id" INTEGER NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Pending'
          CHECK ("status" IN ('Pending', 'Done', 'Skipped', 'Failed')),
        "note" TEXT,
        "done_at" TIMESTAMPTZ,

        CONSTRAINT "UQ_step_results_record_procedure_step"
          UNIQUE ("calibration_record_id", "procedure_step_id"),

        CONSTRAINT "FK_step_results_calibration_record"
          FOREIGN KEY ("calibration_record_id")
          REFERENCES "calibration_records" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_step_results_procedure_step"
          FOREIGN KEY ("procedure_step_id")
          REFERENCES "procedure_steps" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_step_results_procedure_step_id"
      ON "step_results" ("procedure_step_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "step_results";
    `);
  }
}
