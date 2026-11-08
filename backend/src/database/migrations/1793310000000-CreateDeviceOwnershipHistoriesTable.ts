import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateDeviceOwnershipHistoriesTable1793310000000
  implements MigrationInterface
{
  name = 'CreateDeviceOwnershipHistoriesTable1793310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_ownership_histories" (
        "id" SERIAL PRIMARY KEY,
        "device_id" INTEGER NOT NULL,
        "previous_customer_id" INTEGER,
        "new_customer_id" INTEGER NOT NULL,
        "transferred_by" INTEGER,
        "transferred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "transfer_reason" TEXT NOT NULL,
        "notes" TEXT,
        "status" VARCHAR(50) NOT NULL DEFAULT 'Completed',

        CONSTRAINT "FK_device_ownership_histories_device"
          FOREIGN KEY ("device_id")
          REFERENCES "devices" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_device_ownership_histories_prev_customer"
          FOREIGN KEY ("previous_customer_id")
          REFERENCES "customers" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_device_ownership_histories_new_customer"
          FOREIGN KEY ("new_customer_id")
          REFERENCES "customers" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_device_ownership_histories_transferred_by"
          FOREIGN KEY ("transferred_by")
          REFERENCES "accounts" ("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_ownership_histories_device_id"
      ON "device_ownership_histories" ("device_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_ownership_histories_prev_customer"
      ON "device_ownership_histories" ("previous_customer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_ownership_histories_new_customer"
      ON "device_ownership_histories" ("new_customer_id");
    `);

    // Seed sample ownership history records for demonstration
    // Device 4: Ban đầu thuộc Customer 2 (Vietnam Precision), chuyển sang Customer 1 (ABC Calibration)
    // Device 8: Ban đầu thuộc Customer 5 (Da Nang Medical), chuyển sang Customer 2 (Vietnam Precision)
    await queryRunner.query(`
      INSERT INTO "device_ownership_histories" (
        "device_id",
        "previous_customer_id",
        "new_customer_id",
        "transferred_by",
        "transferred_at",
        "transfer_reason",
        "notes",
        "status"
      ) VALUES
        (
          4,
          2,
          1,
          2,
          NOW() - INTERVAL '45 days',
          'Chuyển giao quyền sở hữu theo hợp đồng sáp nhập và phân tách tài sản phòng đo lường',
          'Biên bản bàn giao số BB-BG-2026-081 ký ngày 22/09/2026. Thiết bị được kiểm định trước khi nhận.',
          'Completed'
        ),
        (
          8,
          5,
          2,
          2,
          NOW() - INTERVAL '90 days',
          'Thanh lý và điều chuyển tài sản nội bộ giữa các đối tác liên kết',
          'Hợp đồng chuyển nhượng thiết bị đo CMM số HD-CN-2026-012.',
          'Completed'
        )
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('"device_ownership_histories"', 'id'),
        COALESCE((SELECT MAX(id) FROM "device_ownership_histories"), 1)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "device_ownership_histories";`);
  }
}
