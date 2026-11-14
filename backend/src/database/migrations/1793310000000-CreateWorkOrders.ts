import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkOrders1793310000000 implements MigrationInterface {
  name = 'CreateWorkOrders1793310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "work_orders" (
        "id" SERIAL PRIMARY KEY,
        "contract_id" INTEGER,
        "quotation_id" INTEGER,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Open'
          CHECK ("status" IN ('Open', 'Assigned', 'InProgress', 'Done', 'Cancelled')),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "FK_work_orders_contract"
          FOREIGN KEY ("contract_id")
          REFERENCES "contracts" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_work_orders_quotation"
          FOREIGN KEY ("quotation_id")
          REFERENCES "quotations" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_orders_contract_id"
      ON "work_orders" ("contract_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_orders_quotation_id"
      ON "work_orders" ("quotation_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_orders_status"
      ON "work_orders" ("status");
    `);

    await queryRunner.query(`
      INSERT INTO "work_orders" ("contract_id", "quotation_id", "status")
      VALUES (2, 9, 'Open');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_orders";`);
  }
}
