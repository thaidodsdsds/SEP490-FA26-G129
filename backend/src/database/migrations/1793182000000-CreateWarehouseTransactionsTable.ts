import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseTransactionsTable1793182000000 implements MigrationInterface {
  name = 'CreateWarehouseTransactionsTable1793182000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "warehouse_transactions" (
        "id" SERIAL NOT NULL,
        "device_id" INTEGER NOT NULL,
        "service_request_item_id" INTEGER,
        "type" VARCHAR(20) NOT NULL,
        "condition_note" TEXT,
        "photo_url" TEXT,
        "handled_by" INTEGER NOT NULL,
        "transaction_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warehouse_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_warehouse_transactions_device_id"
          FOREIGN KEY ("device_id")
          REFERENCES "devices" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "FK_warehouse_transactions_service_request_item_id"
          FOREIGN KEY ("service_request_item_id")
          REFERENCES "service_request_items" ("id")
          ON DELETE SET NULL,
        CONSTRAINT "FK_warehouse_transactions_handled_by"
          FOREIGN KEY ("handled_by")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "CHK_warehouse_transactions_type"
          CHECK ("type" IN ('Inbound', 'Outbound'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_warehouse_transactions_device_id"
      ON "warehouse_transactions" ("device_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_warehouse_transactions_service_request_item_id"
      ON "warehouse_transactions" ("service_request_item_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouse_transactions";`);
  }
}
