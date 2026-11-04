import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractItems1793183200000 implements MigrationInterface {
  name = 'CreateContractItems1793183200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bảng hạng mục in trên hợp đồng: snapshot từ báo giá tại thời điểm lập hợp đồng.
    // Hợp đồng đã duyệt/ký là bất biến, nên không đọc trực tiếp quotation_line_items.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contract_items" (
        "id" SERIAL PRIMARY KEY,

        "contract_id" INTEGER NOT NULL,

        -- Truy vết nguồn (có thể NULL với dòng nhập tay như "Chi phí đi lại")
        "service_request_item_id" INTEGER,
        "quotation_line_item_id" INTEGER,

        "line_no" INTEGER NOT NULL DEFAULT 1,

        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "location" TEXT,
        "execution_time" VARCHAR(50),

        "quantity" NUMERIC(12, 3) NOT NULL DEFAULT 1
          CHECK ("quantity" > 0),
        "unit" VARCHAR(20),

        "unit_price" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("unit_price" >= 0),
        "discount_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("discount_amount" >= 0),

        "tax_rate" NUMERIC(5, 2) NOT NULL DEFAULT 5
          CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100),
        "tax_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("tax_amount" >= 0),

        -- Thành tiền đã gồm thuế: (unit_price * quantity) - discount_amount + tax_amount
        "amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
          CHECK ("amount" >= 0),

        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "FK_contract_items_contract"
          FOREIGN KEY ("contract_id")
          REFERENCES "contracts" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_contract_items_service_request_item"
          FOREIGN KEY ("service_request_item_id")
          REFERENCES "service_request_items" ("id")
          ON DELETE SET NULL,

        CONSTRAINT "FK_contract_items_quotation_line_item"
          FOREIGN KEY ("quotation_line_item_id")
          REFERENCES "quotation_line_items" ("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contract_items_contract_id"
      ON "contract_items" ("contract_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contract_items_contract_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contract_items";`);
  }
}
