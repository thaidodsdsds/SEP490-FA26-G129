import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateReviewLogsTable1794700000000
  implements MigrationInterface
{
  name = 'CreateReviewLogsTable1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add audit columns to calibration_records if not exist
    await queryRunner.query(`
      ALTER TABLE "calibration_records"
      ADD COLUMN IF NOT EXISTS "reject_reason" TEXT,
      ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "reviewer_id" INTEGER;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calibration_records_reviewer'
        ) THEN
          ALTER TABLE "calibration_records"
          ADD CONSTRAINT "FK_calibration_records_reviewer"
          FOREIGN KEY ("reviewer_id")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 2. Create review_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_logs" (
        "id" SERIAL PRIMARY KEY,
        "calibration_record_id" INTEGER NOT NULL,
        "reviewer_id" INTEGER NOT NULL,
        "action" VARCHAR(20) NOT NULL
          CHECK ("action" IN ('Approve', 'Reject')),
        "reject_reason" TEXT,
        "comment" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "FK_review_logs_calibration_record"
          FOREIGN KEY ("calibration_record_id")
          REFERENCES "calibration_records" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_review_logs_reviewer"
          FOREIGN KEY ("reviewer_id")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_review_logs_calibration_record_id"
      ON "review_logs" ("calibration_record_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_review_logs_reviewer_id"
      ON "review_logs" ("reviewer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_review_logs_action"
      ON "review_logs" ("action");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "review_logs";
    `);

    await queryRunner.query(`
      ALTER TABLE "calibration_records"
      DROP CONSTRAINT IF EXISTS "FK_calibration_records_reviewer",
      DROP COLUMN IF EXISTS "reject_reason",
      DROP COLUMN IF EXISTS "reviewed_at",
      DROP COLUMN IF EXISTS "reviewer_id";
    `);
  }
}

