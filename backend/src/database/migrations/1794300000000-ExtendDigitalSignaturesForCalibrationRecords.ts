import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendDigitalSignaturesForCalibrationRecords1794300000000
  implements MigrationInterface
{
  name = 'ExtendDigitalSignaturesForCalibrationRecords1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        r_con RECORD;
      BEGIN
        -- 1. Cho phép contract_id nullable để hỗ trợ ký số trực tiếp trên calibration_records
        ALTER TABLE "digital_signatures"
        ALTER COLUMN "contract_id" DROP NOT NULL;

        -- 2. Xóa constraint CHECK cũ trên cột purpose (nếu có) để mở rộng thêm purpose cho KTV & Trưởng phòng
        FOR r_con IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE nsp.nspname = 'public'
            AND rel.relname = 'digital_signatures'
            AND con.contype = 'c'
            AND pg_get_constraintdef(con.oid) ILIKE '%purpose%'
        LOOP
          EXECUTE format('ALTER TABLE "digital_signatures" DROP CONSTRAINT IF EXISTS %I', r_con.conname);
        END LOOP;

        -- 3. Thêm ràng buộc CHECK mới cho purpose hỗ trợ đầy đủ luồng Hợp đồng & Hiệu chuẩn
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

        -- 4. Bổ sung các cột phục vụ ký số biên bản hiệu chuẩn (calibration_records)
        ALTER TABLE "digital_signatures"
        ADD COLUMN IF NOT EXISTS "calibration_record_id" INTEGER,
        ADD COLUMN IF NOT EXISTS "signer_name" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "signature_value" TEXT,
        ADD COLUMN IF NOT EXISTS "signature_metadata" JSONB;

        -- 5. Thêm khóa ngoại tới bảng calibration_records (nếu chưa có)
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_digital_signatures_calibration_record'
        ) THEN
          ALTER TABLE "digital_signatures"
          ADD CONSTRAINT "FK_digital_signatures_calibration_record"
          FOREIGN KEY ("calibration_record_id")
          REFERENCES "calibration_records" ("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_signatures_calibration_record_id"
      ON "digital_signatures" ("calibration_record_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_digital_signatures_calibration_record_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "digital_signatures"
      DROP CONSTRAINT IF EXISTS "FK_digital_signatures_calibration_record",
      DROP COLUMN IF EXISTS "signature_metadata",
      DROP COLUMN IF EXISTS "signature_value",
      DROP COLUMN IF EXISTS "signer_name",
      DROP COLUMN IF EXISTS "calibration_record_id";
    `);
  }
}

