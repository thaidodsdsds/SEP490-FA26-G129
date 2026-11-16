import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerRejectReasonToQuotations1794500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD COLUMN IF NOT EXISTS "customer_reject_reason" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "customer_responded_at" TIMESTAMPTZ NULL
    `);

    // Backfill historical rejection reasons from service_requests.special_notes if available
    await queryRunner.query(`
      UPDATE "quotations" q
      SET
        "customer_reject_reason" = TRIM(
          SUBSTRING(
            sr.special_notes FROM '\\[Khách từ chối báo giá (?:QT-\\d{4}-\\d{4}|QT-' || q.id || '):\\s*([^\\]]+)\\]'
          )
        ),
        "customer_responded_at" = COALESCE(sr.created_at, NOW())
      FROM "service_requests" sr
      WHERE q.service_request_id = sr.id
        AND q.status = 'Rejected'
        AND q.customer_reject_reason IS NULL
        AND sr.special_notes ~ '\\[Khách từ chối báo giá';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP COLUMN IF EXISTS "customer_reject_reason",
      DROP COLUMN IF EXISTS "customer_responded_at"
    `);
  }
}
