import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - Thêm bảng digital_signatures (SRS v1.5) để sẵn sàng cho luồng ký số.
 * - Đổi ràng buộc "1 báo giá = 1 hợp đồng" thành unique một phần:
 *   chỉ chặn khi hợp đồng cũ chưa bị huỷ. Nhờ vậy có thể huỷ hợp đồng cũ
 *   rồi tạo hợp đồng mới từ cùng một báo giá (yêu cầu "không sửa, tạo cái mới").
 */
export class CreateDigitalSignaturesAndAdjustContractQuotationUnique1793183300000
  implements MigrationInterface
{
  name = 'CreateDigitalSignaturesAndAdjustContractQuotationUnique1793183300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_contracts_quotation_id";
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_contracts_quotation_id_active"
      ON "contracts" ("quotation_id")
      WHERE "quotation_id" IS NOT NULL AND "status" <> 'Cancelled';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "digital_signatures" (
        "id" SERIAL PRIMARY KEY,

        "contract_id" INTEGER NOT NULL,

        "purpose" VARCHAR(30) NOT NULL
          CHECK (
            "purpose" IN (
              'CustomerApproval',
              'CompanyApproval',
              'Liquidation'
            )
          ),

        "signer_id" INTEGER NOT NULL,

        "provider" VARCHAR(50),
        "provider_transaction_id" VARCHAR(255),

        "document_hash" VARCHAR(255) NOT NULL,
        "signed_file_url" TEXT,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Pending'
          CHECK (
            "status" IN (
              'Pending',
              'Signed',
              'Failed',
              'Revoked'
            )
          ),

        "signed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "FK_digital_signatures_contract"
          FOREIGN KEY ("contract_id")
          REFERENCES "contracts" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_digital_signatures_signer"
          FOREIGN KEY ("signer_id")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_signatures_contract_id"
      ON "digital_signatures" ("contract_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_signatures_signer_id"
      ON "digital_signatures" ("signer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_signatures_status"
      ON "digital_signatures" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "digital_signatures";`);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_contracts_quotation_id_active";
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_contracts_quotation_id"
      ON "contracts" ("quotation_id")
      WHERE "quotation_id" IS NOT NULL;
    `);
  }
}
