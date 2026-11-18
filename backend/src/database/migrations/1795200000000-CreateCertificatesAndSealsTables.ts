import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateCertificatesAndSealsTables1795200000000
  implements MigrationInterface
{
  name = 'CreateCertificatesAndSealsTables1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. certificates: chứng nhận hiệu chuẩn sinh ra từ calibration record đã duyệt
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "certificates" (
        "id" SERIAL PRIMARY KEY,
        "calibration_record_id" INTEGER NOT NULL,
        "certificate_no" VARCHAR(50) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Draft',
        "file_url" VARCHAR(255),
        "issued_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "UQ_certificates_certificate_no" UNIQUE ("certificate_no"),
        CONSTRAINT "CHK_certificates_status"
          CHECK ("status" IN ('Draft', 'PendingPayment', 'Released')),
        CONSTRAINT "FK_certificates_calibration_record"
          FOREIGN KEY ("calibration_record_id")
          REFERENCES "calibration_records" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_certificates_calibration_record_id"
      ON "certificates" ("calibration_record_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_certificates_status"
      ON "certificates" ("status");
    `);

    // 2. seals: tem hiệu chuẩn gắn 1-1 với certificate và thiết bị
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seals" (
        "id" SERIAL PRIMARY KEY,
        "device_id" INTEGER NOT NULL,
        "certificate_id" INTEGER NOT NULL,
        "seal_code" VARCHAR(50) NOT NULL,
        "cal_date" DATE NOT NULL,
        "due_date" DATE NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
        "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "UQ_seals_seal_code" UNIQUE ("seal_code"),
        CONSTRAINT "UQ_seals_certificate_id" UNIQUE ("certificate_id"),
        CONSTRAINT "CHK_seals_status"
          CHECK ("status" IN ('PendingPayment', 'Active', 'Expired', 'Revoked')),
        CONSTRAINT "CHK_seals_dates" CHECK ("due_date" >= "cal_date"),
        CONSTRAINT "FK_seals_device"
          FOREIGN KEY ("device_id")
          REFERENCES "devices" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "FK_seals_certificate"
          FOREIGN KEY ("certificate_id")
          REFERENCES "certificates" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seals_device_id"
      ON "seals" ("device_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seals_status"
      ON "seals" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seals_due_date"
      ON "seals" ("due_date");
    `);

    // 3. seal_revocations: yêu cầu thu hồi tem + người duyệt (khác người yêu cầu)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seal_revocations" (
        "id" SERIAL PRIMARY KEY,
        "seal_id" INTEGER NOT NULL,
        "requested_by" INTEGER NOT NULL,
        "reason" TEXT NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
        "decided_by" INTEGER,
        "decided_at" TIMESTAMPTZ,
        "decision_note" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "CHK_seal_revocations_status"
          CHECK ("status" IN ('Pending', 'Approved', 'Rejected')),
        CONSTRAINT "CHK_seal_revocations_distinct_actors"
          CHECK ("decided_by" IS NULL OR "decided_by" <> "requested_by"),
        CONSTRAINT "FK_seal_revocations_seal"
          FOREIGN KEY ("seal_id")
          REFERENCES "seals" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "FK_seal_revocations_requested_by"
          FOREIGN KEY ("requested_by")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "FK_seal_revocations_decided_by"
          FOREIGN KEY ("decided_by")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seal_revocations_seal_id"
      ON "seal_revocations" ("seal_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seal_revocations_status"
      ON "seal_revocations" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seal_revocations_requested_by"
      ON "seal_revocations" ("requested_by");
    `);

    // 4. seal_verification_logs: nhật ký tra cứu công khai (ghi source_ip)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seal_verification_logs" (
        "id" SERIAL PRIMARY KEY,
        "seal_id" INTEGER,
        "seal_code" VARCHAR(50) NOT NULL,
        "verification_result" VARCHAR(20) NOT NULL,
        "source_ip" VARCHAR(45),
        "user_agent" VARCHAR(255),
        "verified_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "CHK_seal_verification_logs_result"
          CHECK (
            "verification_result" IN ('Valid', 'Expired', 'Revoked', 'NotFound')
          ),
        CONSTRAINT "FK_seal_verification_logs_seal"
          FOREIGN KEY ("seal_id")
          REFERENCES "seals" ("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seal_verification_logs_seal_id"
      ON "seal_verification_logs" ("seal_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seal_verification_logs_seal_code"
      ON "seal_verification_logs" ("seal_code");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seal_verification_logs_verified_at"
      ON "seal_verification_logs" ("verified_at");
    `);

    // 5. digital_signatures: mở rộng cho chứng nhận + thu hồi tem
    await queryRunner.query(`
      ALTER TABLE "digital_signatures"
      ADD COLUMN IF NOT EXISTS "certificate_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "seal_revocation_id" INTEGER;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_digital_signatures_certificate'
        ) THEN
          ALTER TABLE "digital_signatures"
          ADD CONSTRAINT "FK_digital_signatures_certificate"
          FOREIGN KEY ("certificate_id")
          REFERENCES "certificates" ("id")
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_digital_signatures_seal_revocation'
        ) THEN
          ALTER TABLE "digital_signatures"
          ADD CONSTRAINT "FK_digital_signatures_seal_revocation"
          FOREIGN KEY ("seal_revocation_id")
          REFERENCES "seal_revocations" ("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_signatures_certificate_id"
      ON "digital_signatures" ("certificate_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_signatures_seal_revocation_id"
      ON "digital_signatures" ("seal_revocation_id");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_digital_signatures_certificate_purpose"
      ON "digital_signatures" ("certificate_id", "purpose")
      WHERE "certificate_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_digital_signatures_seal_revocation_purpose"
      ON "digital_signatures" ("seal_revocation_id", "purpose")
      WHERE "seal_revocation_id" IS NOT NULL;
    `);

    // 6. Bổ sung purpose SealRevocation cho luồng duyệt thu hồi tem
    await queryRunner.query(`
      ALTER TABLE "digital_signatures"
      DROP CONSTRAINT IF EXISTS "CHK_digital_signatures_purpose";
    `);

    await queryRunner.query(`
      ALTER TABLE "digital_signatures"
      ADD CONSTRAINT "CHK_digital_signatures_purpose"
      CHECK (
        "purpose" IN (
          'CustomerApproval',
          'CompanyApproval',
          'Liquidation',
          'TechnicianSubmission',
          'TechnicalReview',
          'CertificateRelease',
          'SealRevocation'
        )
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "digital_signatures"
      DROP CONSTRAINT IF EXISTS "CHK_digital_signatures_purpose";
    `);

    await queryRunner.query(`
      ALTER TABLE "digital_signatures"
      ADD CONSTRAINT "CHK_digital_signatures_purpose"
      CHECK (
        "purpose" IN (
          'CustomerApproval',
          'CompanyApproval',
          'Liquidation',
          'TechnicianSubmission',
          'TechnicalReview',
          'CertificateRelease'
        )
      );
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_digital_signatures_seal_revocation_purpose";
      DROP INDEX IF EXISTS "UQ_digital_signatures_certificate_purpose";
      DROP INDEX IF EXISTS "IDX_digital_signatures_seal_revocation_id";
      DROP INDEX IF EXISTS "IDX_digital_signatures_certificate_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "digital_signatures"
      DROP CONSTRAINT IF EXISTS "FK_digital_signatures_seal_revocation",
      DROP CONSTRAINT IF EXISTS "FK_digital_signatures_certificate",
      DROP COLUMN IF EXISTS "seal_revocation_id",
      DROP COLUMN IF EXISTS "certificate_id";
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "seal_verification_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seal_revocations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seals";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates";`);
  }
}
