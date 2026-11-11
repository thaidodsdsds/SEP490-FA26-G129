import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - Mỗi hợp đồng chỉ có tối đa 1 chữ ký cho mỗi mục đích
 *   (CompanyApproval / CustomerApproval / Liquidation).
 * - Thêm bảng work_orders + work_order_assignments để lưu lệnh công việc
 *   sinh ra từ hợp đồng sau khi cả hai bên đã ký.
 */
export class AddWorkOrdersAndSignatureConstraints1793183400000
  implements MigrationInterface
{
  name = 'AddWorkOrdersAndSignatureConstraints1793183400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_digital_signatures_contract_purpose"
      ON "digital_signatures" ("contract_id", "purpose");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_orders" (
        "id" SERIAL PRIMARY KEY,

        "work_order_code" VARCHAR(50) NOT NULL,
        "contract_id" INTEGER NOT NULL,
        "customer_id" INTEGER NOT NULL,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Open'
          CHECK (
            "status" IN (
              'Open',
              'Assigned',
              'InProgress',
              'Done',
              'Cancelled'
            )
          ),

        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "UQ_work_orders_work_order_code" UNIQUE ("work_order_code"),

        CONSTRAINT "FK_work_orders_contract"
          FOREIGN KEY ("contract_id")
          REFERENCES "contracts" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_work_orders_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_orders_contract_id"
      ON "work_orders" ("contract_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_orders_customer_id"
      ON "work_orders" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_orders_status"
      ON "work_orders" ("status");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_order_assignments" (
        "id" SERIAL PRIMARY KEY,

        "work_order_id" INTEGER NOT NULL,
        "contract_item_id" INTEGER NOT NULL,
        "service_request_item_id" INTEGER,

        "device_name" VARCHAR(255) NOT NULL DEFAULT '',

        "technician_id" INTEGER,
        "standard_name" VARCHAR(255),

        "scheduled_start" TIMESTAMPTZ,
        "scheduled_end" TIMESTAMPTZ,

        "assigned_by" INTEGER,

        "status" VARCHAR(20) NOT NULL DEFAULT 'Pending'
          CHECK (
            "status" IN (
              'Pending',
              'Assigned',
              'InProgress',
              'Done',
              'Cancelled'
            )
          ),

        "notes" TEXT,

        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "UQ_work_order_assignments_work_order_item"
          UNIQUE ("work_order_id", "contract_item_id"),

        CONSTRAINT "FK_work_order_assignments_work_order"
          FOREIGN KEY ("work_order_id")
          REFERENCES "work_orders" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_work_order_assignments_contract_item"
          FOREIGN KEY ("contract_item_id")
          REFERENCES "contract_items" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_work_order_assignments_service_request_item"
          FOREIGN KEY ("service_request_item_id")
          REFERENCES "service_request_items" ("id")
          ON DELETE SET NULL,

        CONSTRAINT "FK_work_order_assignments_technician"
          FOREIGN KEY ("technician_id")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL,

        CONSTRAINT "FK_work_order_assignments_assigned_by"
          FOREIGN KEY ("assigned_by")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_order_assignments_work_order_id"
      ON "work_order_assignments" ("work_order_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_order_assignments_technician_id"
      ON "work_order_assignments" ("technician_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_order_assignments_status"
      ON "work_order_assignments" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_order_assignments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_orders";`);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_digital_signatures_contract_purpose";
    `);
  }
}
