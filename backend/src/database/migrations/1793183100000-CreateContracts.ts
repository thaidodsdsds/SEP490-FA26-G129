import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContracts1793183100000 implements MigrationInterface {
  name = 'CreateContracts1793183100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contracts" (
        "id" SERIAL PRIMARY KEY,

        "contract_code" VARCHAR(50) NOT NULL,
        "contract_type" VARCHAR(20) NOT NULL DEFAULT 'Service'
          CHECK ("contract_type" IN ('Service', 'Framework')),

        "quotation_id" INTEGER,
        "customer_id" INTEGER NOT NULL,

        "title" VARCHAR(255) NOT NULL DEFAULT '',

        "sign_date" DATE,
        "start_date" DATE,
        "end_date" DATE,
        "duration_days" INTEGER,
        "location" TEXT,

        "subtotal" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("subtotal" >= 0),
        "discount_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("discount_amount" >= 0),
        "travel_fee" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("travel_fee" >= 0),
        "tax_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("tax_amount" >= 0),
        "total_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("total_amount" >= 0),
        "total_in_words" TEXT,

        "payment_term_days" INTEGER NOT NULL DEFAULT 30
          CHECK ("payment_term_days" >= 0),

        "legal_basis" TEXT,
        "notes" TEXT,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Draft'
          CHECK (
            "status" IN (
              'Draft',
              'PendingApproval',
              'Approved',
              'Signed',
              'Liquidated',
              'Cancelled'
            )
          ),

        -- Snapshot Bên A tại thời điểm ký (không phụ thuộc dữ liệu customers sau này)
        "party_a_name" VARCHAR(255) NOT NULL DEFAULT '',
        "party_a_representative" VARCHAR(150),
        "party_a_position" VARCHAR(100),
        "party_a_address" TEXT,
        "party_a_phone" VARCHAR(50),
        "party_a_fax" VARCHAR(50),
        "party_a_tax_code" VARCHAR(50),
        "party_a_bank_account" VARCHAR(100),
        "party_a_bank_name" VARCHAR(255),
        "party_a_budget_code" VARCHAR(50),

        -- Snapshot Bên B
        "party_b_name" VARCHAR(255) NOT NULL DEFAULT '',
        "party_b_representative" VARCHAR(150),
        "party_b_position" VARCHAR(100),
        "party_b_address" TEXT,
        "party_b_phone" VARCHAR(50),
        "party_b_fax" VARCHAR(50),
        "party_b_tax_code" VARCHAR(50),
        "party_b_bank_account" VARCHAR(100),
        "party_b_bank_name" VARCHAR(255),

        "created_by" INTEGER NOT NULL,
        "submitted_at" TIMESTAMPTZ,

        "approved_by" INTEGER,
        "approved_at" TIMESTAMPTZ,

        "liquidated_by" INTEGER,
        "liquidated_at" TIMESTAMPTZ,

        "draft_file_url" TEXT,
        "signed_file_url" TEXT,

        -- Chỉ dùng cho contract_type = 'Framework', để trống với 'Service'
        "committed_years" INTEGER,
        "credit_limit" NUMERIC(15, 2),

        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "UQ_contracts_contract_code" UNIQUE ("contract_code"),

        CONSTRAINT "FK_contracts_quotation"
          FOREIGN KEY ("quotation_id")
          REFERENCES "quotations" ("id")
          ON DELETE SET NULL,

        CONSTRAINT "FK_contracts_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_contracts_created_by"
          FOREIGN KEY ("created_by")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_contracts_approved_by"
          FOREIGN KEY ("approved_by")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL,

        CONSTRAINT "FK_contracts_liquidated_by"
          FOREIGN KEY ("liquidated_by")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contracts_customer_id"
      ON "contracts" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contracts_status"
      ON "contracts" ("status");
    `);

    // Mỗi báo giá chỉ sinh tối đa 1 hợp đồng (bỏ qua các bản ghi quotation_id NULL).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_contracts_quotation_id"
      ON "contracts" ("quotation_id")
      WHERE "quotation_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_contracts_quotation_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contracts_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contracts_customer_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contracts";`);
  }
}
