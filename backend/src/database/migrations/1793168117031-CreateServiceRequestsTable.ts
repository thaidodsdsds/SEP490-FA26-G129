
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateServiceRequestsTable1793168117031
  implements MigrationInterface
{
  name = "CreateServiceRequestsTable1793168117031";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_requests" (
        "id" SERIAL PRIMARY KEY,

        "customer_id" INTEGER NOT NULL,

        "created_by" INTEGER NOT NULL,

        "location_type" VARCHAR(20) NOT NULL
          CHECK (
            "location_type" IN ('In-lab', 'On-site')
          ),

        "status" VARCHAR(20) NOT NULL DEFAULT 'New'
          CHECK (
            "status" IN (
              'New',
              'Quoted',
              'Confirmed',
              'InProgress',
              'Completed',
              'Cancelled'
            )
          ),

        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "FK_service_requests_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_service_requests_created_by"
          FOREIGN KEY ("created_by")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_requests_customer_id"
      ON "service_requests" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_requests_created_by"
      ON "service_requests" ("created_by");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_requests_created_by";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_requests_customer_id";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "service_requests";
    `);
  }
}
