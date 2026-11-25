import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateMasterStandardTable1794116200000
  implements MigrationInterface
{
  name = 'CreateMasterStandardTable1794116200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "masterstandard" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(150) NOT NULL,
        "serial_number" VARCHAR(100) NOT NULL,
        "accuracy_class" VARCHAR(50) NOT NULL,
        "calibration_expiry" DATE NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Active'
          CHECK ("status" IN ('Active', 'Inactive', 'Expired'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_masterstandard_assignment"
      ON "masterstandard" ("status", "calibration_expiry");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "masterstandard";
    `);
  }
}
