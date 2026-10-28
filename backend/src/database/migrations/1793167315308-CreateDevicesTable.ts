
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDevicesTable1793167315308
  implements MigrationInterface
{
  name = "CreateDevicesTable1793167315308";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id" SERIAL PRIMARY KEY,

        "customer_id" INTEGER NOT NULL,

        "name" VARCHAR(150) NOT NULL,

        "model" VARCHAR(150),

        "manufacturer" VARCHAR(150),

        "serial_number" VARCHAR(100),

        "internal_code" VARCHAR(50) NOT NULL UNIQUE,

        "measuring_range" TEXT,

        "is_group2" BOOLEAN NOT NULL DEFAULT FALSE,

        "next_due_date" DATE,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Active'
          CHECK (
            "status" IN (
              'Active',
              'ExpiringSoon',
              'Expired',
              'InRepair'
            )
          ),

        CONSTRAINT "FK_devices_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_devices_serial_number"
      ON "devices" ("serial_number")
      WHERE "serial_number" IS NOT NULL
        AND "serial_number" <> '';
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_devices_customer_id"
      ON "devices" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_devices_status"
      ON "devices" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_devices_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_devices_customer_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_devices_serial_number";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "devices";
    `);
  }
}
