
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateServiceTypesTable1793167061376
  implements MigrationInterface
{
  name = "CreateServiceTypesTable1793167061376";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_types" (
        "id" SERIAL PRIMARY KEY,

        "name" VARCHAR(150) NOT NULL,

        "kind" VARCHAR(20) NOT NULL
          CHECK (
            "kind" IN ('Calibration', 'Verification', 'Repair')
          ),

        "field" VARCHAR(20) NOT NULL
          CHECK (
            "field" IN (
              'DIEN',
              'KHOILUONG',
              'DODAI',
              'APSUAT',
              'NHIET',
              'HOA',
              'QUANG',
              'DET'
            )
          ),

        "standard_code" VARCHAR(100) NOT NULL UNIQUE,

        "measuring_range" TEXT,

        "description" TEXT,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Active'
          CHECK ("status" IN ('Active', 'Inactive'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_types_field"
      ON "service_types" ("field");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_types_status"
      ON "service_types" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_types_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_types_field";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "service_types";
    `);
  }
}
