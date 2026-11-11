import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateInitialInspectionsTable1794116600000
  implements MigrationInterface
{
  name = 'CreateInitialInspectionsTable1794116600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "initial_inspections" (
        "id" SERIAL PRIMARY KEY,
        "service_request_item_id" INTEGER NOT NULL UNIQUE,
        "result" VARCHAR(10) NOT NULL
          CHECK ("result" IN ('Pass', 'Fail')),
        "defect_note" TEXT,
        "photo_url" TEXT,
        "customer_written_consent" BOOLEAN NOT NULL DEFAULT FALSE,
        "customer_consent_status" VARCHAR(20) DEFAULT 'Pending',
        "customer_consent_note" TEXT,
        "customer_consent_file" TEXT,
        "customer_consented_at" TIMESTAMPTZ,
        "customer_consented_by" INTEGER,
        "customer_consent_signer_name" VARCHAR(150),
        "customer_consent_method" VARCHAR(50),
        "inspected_by" INTEGER NOT NULL,
        "inspected_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "FK_initial_inspections_service_request_item"
          FOREIGN KEY ("service_request_item_id")
          REFERENCES "service_request_items" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_initial_inspections_inspected_by"
          FOREIGN KEY ("inspected_by")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_initial_inspections_customer_consented_by"
          FOREIGN KEY ("customer_consented_by")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_initial_inspections_inspected_by"
      ON "initial_inspections" ("inspected_by");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "initial_inspections";
    `);
  }
}
