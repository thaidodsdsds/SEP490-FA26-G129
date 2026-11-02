
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQuotationsTable1793168352014
  implements MigrationInterface
{
  name = "CreateQuotationsTable1793168352014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "quotations" (
        "id" SERIAL PRIMARY KEY,

        "service_request_id" INTEGER NOT NULL,

        "subtotal" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("subtotal" >= 0),

        "discount_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("discount_amount" >= 0),

        "travel_fee" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("travel_fee" >= 0),

        "total_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("total_amount" >= 0),

        "estimated_completion_date" DATE,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Draft'
          CHECK (
            "status" IN (
              'Draft',
              'Sent',
              'Approved',
              'Rejected'
            )
          ),

        CONSTRAINT "FK_quotations_service_request"
          FOREIGN KEY ("service_request_id")
          REFERENCES "service_requests" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "CHK_quotations_discount_not_exceed_subtotal"
          CHECK ("discount_amount" <= "subtotal"),

        CONSTRAINT "CHK_quotations_total_amount"
          CHECK (
            "total_amount" =
            "subtotal" - "discount_amount" + "travel_fee"
          )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_quotations_service_request_id"
      ON "quotations" ("service_request_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_quotations_status"
      ON "quotations" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_quotations_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_quotations_service_request_id";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "quotations";
    `);
  }
}
