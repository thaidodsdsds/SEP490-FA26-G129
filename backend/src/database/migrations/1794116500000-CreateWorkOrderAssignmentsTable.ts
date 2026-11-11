import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateWorkOrderAssignmentsTable1794116500000
  implements MigrationInterface
{
  name = 'CreateWorkOrderAssignmentsTable1794116500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "work_order_assignments" (
        "id" SERIAL PRIMARY KEY,
        "work_order_id" INTEGER NOT NULL,
        "service_request_item_id" INTEGER NOT NULL,
        "technician_id" INTEGER NOT NULL,
        "master_standard_id" INTEGER NOT NULL,
        "assigned_by" INTEGER NOT NULL,
        "scheduled_start" TIMESTAMPTZ NOT NULL,
        "scheduled_end" TIMESTAMPTZ NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Assigned'
          CHECK ("status" IN ('Assigned', 'InProgress', 'Done', 'Cancelled')),

        CONSTRAINT "CHK_work_order_assignments_schedule"
          CHECK ("scheduled_end" > "scheduled_start"),

        CONSTRAINT "UQ_work_order_assignments_work_order_item"
          UNIQUE ("work_order_id", "service_request_item_id"),

        CONSTRAINT "FK_work_order_assignments_work_order"
          FOREIGN KEY ("work_order_id")
          REFERENCES "work_orders" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_work_order_assignments_service_request_item"
          FOREIGN KEY ("service_request_item_id")
          REFERENCES "service_request_items" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_work_order_assignments_technician"
          FOREIGN KEY ("technician_id")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_work_order_assignments_master_standard"
          FOREIGN KEY ("master_standard_id")
          REFERENCES "masterstandard" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_work_order_assignments_assigned_by"
          FOREIGN KEY ("assigned_by")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_order_assignments_technician_id"
      ON "work_order_assignments" ("technician_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_order_assignments_master_standard_id"
      ON "work_order_assignments" ("master_standard_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_order_assignments_status"
      ON "work_order_assignments" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "work_order_assignments";
    `);
  }
}
