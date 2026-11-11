import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateProcedureStepsTable1794116800000
  implements MigrationInterface
{
  name = 'CreateProcedureStepsTable1794116800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "procedure_steps" (
        "id" SERIAL PRIMARY KEY,
        "procedure_id" INTEGER NOT NULL,
        "step_no" INTEGER NOT NULL,
        "instruction" TEXT NOT NULL,
        "requires_evidence" BOOLEAN NOT NULL DEFAULT FALSE,

        CONSTRAINT "CHK_procedure_steps_step_no"
          CHECK ("step_no" > 0),

        CONSTRAINT "UQ_procedure_steps_procedure_step_no"
          UNIQUE ("procedure_id", "step_no"),

        CONSTRAINT "FK_procedure_steps_procedure"
          FOREIGN KEY ("procedure_id")
          REFERENCES "calibration_procedures" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "procedure_steps";
    `);
  }
}
