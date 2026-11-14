import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateProcedureParametersTable1794116900000
  implements MigrationInterface
{
  name = 'CreateProcedureParametersTable1794116900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "procedure_parameters" (
        "id" SERIAL PRIMARY KEY,
        "procedure_id" INTEGER NOT NULL,
        "name" VARCHAR(150) NOT NULL,
        "unit" VARCHAR(50) NOT NULL,
        "repeat_count" INTEGER NOT NULL,
        "calculation_method" VARCHAR(20) NOT NULL,

        CONSTRAINT "CHK_procedure_parameters_repeat_count"
          CHECK ("repeat_count" > 0),

        CONSTRAINT "CHK_procedure_parameters_calculation_method"
          CHECK ("calculation_method" IN ('mean', 'stdev', 'max', 'min', 'sum', 'abs')),

        CONSTRAINT "FK_procedure_parameters_procedure"
          FOREIGN KEY ("procedure_id")
          REFERENCES "calibration_procedures" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_procedure_parameters_procedure_id"
      ON "procedure_parameters" ("procedure_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "procedure_parameters";
    `);
  }
}
