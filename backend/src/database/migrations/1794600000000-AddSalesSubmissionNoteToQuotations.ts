import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesSubmissionNoteToQuotations1794600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD COLUMN IF NOT EXISTS "sales_submission_note" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "submission_count" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "last_rejected_total" NUMERIC(15, 2) NULL,
      ADD COLUMN IF NOT EXISTS "last_rejected_discount" NUMERIC(15, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP COLUMN IF EXISTS "sales_submission_note",
      DROP COLUMN IF EXISTS "submission_count",
      DROP COLUMN IF EXISTS "last_rejected_total",
      DROP COLUMN IF EXISTS "last_rejected_discount"
    `);
  }
}

