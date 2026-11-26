import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class UnifyMasterStandardsTable1795800000000
  implements MigrationInterface
{
  name = 'UnifyMasterStandardsTable1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        v_target_id INTEGER;
      BEGIN
        -- 1. Gỡ khóa ngoại cũ đang trỏ nhầm sang bảng "masterstandard"
        IF to_regclass('public.work_order_assignments') IS NOT NULL THEN
          ALTER TABLE "work_order_assignments"
            DROP CONSTRAINT IF EXISTS "FK_work_order_assignments_master_standard";
        END IF;

        -- 2. Gộp toàn bộ dữ liệu từ bảng "masterstandard" (nếu có) sang bảng chuẩn "master_standards"
        IF to_regclass('public.masterstandard') IS NOT NULL THEN
          PERFORM setval(
            pg_get_serial_sequence('"master_standards"', 'id'),
            COALESCE((SELECT MAX(id) FROM "master_standards"), 1),
            true
          );

          FOR rec IN SELECT * FROM "masterstandard" ORDER BY "id" ASC LOOP
            SELECT "id" INTO v_target_id
            FROM "master_standards"
            WHERE "serial_number" = rec.serial_number
            LIMIT 1;

            IF v_target_id IS NULL THEN
              IF NOT EXISTS (SELECT 1 FROM "master_standards" WHERE "id" = rec.id) THEN
                INSERT INTO "master_standards" (
                  "id",
                  "name",
                  "serial_number",
                  "accuracy_class",
                  "calibration_expiry",
                  "status"
                ) VALUES (
                  rec.id,
                  rec.name,
                  rec.serial_number,
                  rec.accuracy_class,
                  rec.calibration_expiry,
                  rec.status
                );
                v_target_id := rec.id;
              ELSE
                INSERT INTO "master_standards" (
                  "name",
                  "serial_number",
                  "accuracy_class",
                  "calibration_expiry",
                  "status"
                ) VALUES (
                  rec.name,
                  rec.serial_number,
                  rec.accuracy_class,
                  rec.calibration_expiry,
                  rec.status
                )
                RETURNING "id" INTO v_target_id;
              END IF;
            END IF;

            IF v_target_id IS NOT NULL
               AND v_target_id <> rec.id
               AND to_regclass('public.work_order_assignments') IS NOT NULL THEN
              UPDATE "work_order_assignments"
              SET "master_standard_id" = v_target_id
              WHERE "master_standard_id" = rec.id;
            END IF;
          END LOOP;

          PERFORM setval(
            pg_get_serial_sequence('"master_standards"', 'id'),
            COALESCE((SELECT MAX(id) FROM "master_standards"), 1),
            true
          );

          DROP TABLE "masterstandard";
        END IF;

        -- 3. Tạo lại khóa ngoại chuẩn trỏ về bảng "master_standards"
        IF to_regclass('public.work_order_assignments') IS NOT NULL THEN
          ALTER TABLE "work_order_assignments"
            ADD CONSTRAINT "FK_work_order_assignments_master_standard"
            FOREIGN KEY ("master_standard_id")
            REFERENCES "master_standards" ("id")
            ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "masterstandard" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(150) NOT NULL,
        "serial_number" VARCHAR(100) NOT NULL,
        "accuracy_class" VARCHAR(50) NOT NULL,
        "calibration_expiry" DATE NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Active'
          CHECK ("status" IN ('Active', 'Inactive', 'Expired'))
      );
    `);

    await queryRunner.query(`
      INSERT INTO "masterstandard" ("id", "name", "serial_number", "accuracy_class", "calibration_expiry", "status")
      SELECT
        "id",
        LEFT("name", 150),
        "serial_number",
        COALESCE(LEFT("accuracy_class", 50), ''),
        "calibration_expiry",
        "status"
      FROM "master_standards"
      ON CONFLICT ("id") DO NOTHING;
    `);

    await queryRunner.query(`
      ALTER TABLE "work_order_assignments"
        DROP CONSTRAINT IF EXISTS "FK_work_order_assignments_master_standard";
      ALTER TABLE "work_order_assignments"
        ADD CONSTRAINT "FK_work_order_assignments_master_standard"
        FOREIGN KEY ("master_standard_id")
        REFERENCES "masterstandard" ("id")
        ON DELETE RESTRICT;
    `);
  }
}

