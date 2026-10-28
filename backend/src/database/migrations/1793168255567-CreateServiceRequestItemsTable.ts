
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateServiceRequestItemsTable1793168255567
  implements MigrationInterface
{
  name = "CreateServiceRequestItemsTable1793168255567";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_request_items" (
        "id" SERIAL PRIMARY KEY,

        "service_request_id" INTEGER NOT NULL,

        "device_id" INTEGER NOT NULL,

        "service_type_id" INTEGER NOT NULL,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Pending'
          CHECK (
            "status" IN (
              'Pending',
              'Inspected',
              'Done',
              'Rejected'
            )
          ),

        CONSTRAINT "FK_service_request_items_service_request"
          FOREIGN KEY ("service_request_id")
          REFERENCES "service_requests" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_service_request_items_device"
          FOREIGN KEY ("device_id")
          REFERENCES "devices" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_service_request_items_service_type"
          FOREIGN KEY ("service_type_id")
          REFERENCES "service_types" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_request_items_service_request_id"
      ON "service_request_items" ("service_request_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_request_items_device_id"
      ON "service_request_items" ("device_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_request_items_service_type_id"
      ON "service_request_items" ("service_type_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_request_items_service_type_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_request_items_device_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_request_items_service_request_id";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "service_request_items";
    `);
  }
}
