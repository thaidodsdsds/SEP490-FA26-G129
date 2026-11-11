import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateProcedureTestPointsTable1794117000000
  implements MigrationInterface
{
  name = 'CreateProcedureTestPointsTable1794117000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "procedure_test_points" (
        "id" SERIAL PRIMARY KEY,
        "parameter_id" INTEGER NOT NULL,
        "point_no" INTEGER NOT NULL,
        "nominal_value" NUMERIC NOT NULL,
        "tolerance" NUMERIC,
        "max_uncertainty" NUMERIC NOT NULL,

        CONSTRAINT "CHK_procedure_test_points_point_no"
          CHECK ("point_no" > 0),

        CONSTRAINT "CHK_procedure_test_points_tolerance"
          CHECK ("tolerance" IS NULL OR "tolerance" >= 0),

        CONSTRAINT "CHK_procedure_test_points_max_uncertainty"
          CHECK ("max_uncertainty" >= 0),

        CONSTRAINT "UQ_procedure_test_points_parameter_point_no"
          UNIQUE ("parameter_id", "point_no"),

        CONSTRAINT "FK_procedure_test_points_parameter"
          FOREIGN KEY ("parameter_id")
          REFERENCES "procedure_parameters" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "procedure_test_points";
    `);
  }
}
