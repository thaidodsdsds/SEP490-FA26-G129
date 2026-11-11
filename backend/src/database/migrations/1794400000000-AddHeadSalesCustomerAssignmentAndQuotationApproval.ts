import bcrypt from 'bcryptjs';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHeadSalesCustomerAssignmentAndQuotationApproval1794400000000
  implements MigrationInterface
{
  name = 'AddHeadSalesCustomerAssignmentAndQuotationApproval1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Insert role HeadSales if not exists
    await queryRunner.query(`
      INSERT INTO "roles" ("name")
      VALUES ('HeadSales')
      ON CONFLICT ("name") DO NOTHING
    `);

    const headSalesRoleRows: Array<{ id: number }> = await queryRunner.query(`
      SELECT "id" FROM "roles" WHERE "name" = 'HeadSales' LIMIT 1
    `);
    const salesRoleRows: Array<{ id: number }> = await queryRunner.query(`
      SELECT "id" FROM "roles" WHERE "name" = 'Sales' LIMIT 1
    `);

    const headSalesRoleId = headSalesRoleRows[0]?.id;
    const salesRoleId = salesRoleRows[0]?.id;

    // 2. Seed demo HeadSales account and additional Sales account
    const defaultPasswordHash = await bcrypt.hash('Isocal@123', 10);

    if (headSalesRoleId) {
      await queryRunner.query(
        `
        INSERT INTO "accounts" ("role_id", "customer_id", "full_name", "email", "phone", "password_hash", "is_2fa_enabled", "failed_login_attempts")
        VALUES ($1, NULL, 'Le Hoang Bach (Head of Sales)', 'head.sales@isocal.com', '0901000008', $2, FALSE, 0)
        ON CONFLICT ("email") DO UPDATE SET "role_id" = EXCLUDED."role_id"
      `,
        [headSalesRoleId, defaultPasswordHash],
      );
    }

    if (salesRoleId) {
      await queryRunner.query(
        `
        INSERT INTO "accounts" ("role_id", "customer_id", "full_name", "email", "phone", "password_hash", "is_2fa_enabled", "failed_login_attempts")
        VALUES ($1, NULL, 'Tran Minh Quan (Sales)', 'sale2@isocal.com', '0901000009', $2, FALSE, 0)
        ON CONFLICT ("email") DO NOTHING
      `,
        [salesRoleId, defaultPasswordHash],
      );
    }

    // 3. Add assignment columns to customers (1 customer -> 1 assigned sales staff)
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "assigned_sales_id" INTEGER NULL REFERENCES "accounts"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "assigned_by" INTEGER NULL REFERENCES "accounts"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_assigned_sales_id"
      ON "customers" ("assigned_sales_id")
    `);

    // Seed initial customer assignments so demo Sales accounts immediately have assigned customers
    const primarySalesRows: Array<{ id: number }> = await queryRunner.query(`
      SELECT "id" FROM "accounts" WHERE "email" = 'sale@isocal.com' LIMIT 1
    `);
    const secondarySalesRows: Array<{ id: number }> = await queryRunner.query(`
      SELECT "id" FROM "accounts" WHERE "email" = 'sale2@isocal.com' LIMIT 1
    `);
    const headSalesAccountRows: Array<{ id: number }> = await queryRunner.query(`
      SELECT "id" FROM "accounts" WHERE "email" = 'head.sales@isocal.com' LIMIT 1
    `);

    const primarySalesId = primarySalesRows[0]?.id ?? null;
    const secondarySalesId = secondarySalesRows[0]?.id ?? null;
    const headSalesAccountId = headSalesAccountRows[0]?.id ?? null;

    if (primarySalesId) {
      await queryRunner.query(
        `
        UPDATE "customers"
        SET
          "assigned_sales_id" = $1,
          "assigned_by" = $2,
          "assigned_at" = NOW()
        WHERE "assigned_sales_id" IS NULL
          AND (
            "id" IN (1, 2, 3)
            OR "id" IN (SELECT DISTINCT "customer_id" FROM "service_requests" WHERE "created_by" = $1)
          )
      `,
        [primarySalesId, headSalesAccountId],
      );
    }

    if (secondarySalesId) {
      await queryRunner.query(
        `
        UPDATE "customers"
        SET
          "assigned_sales_id" = $1,
          "assigned_by" = $2,
          "assigned_at" = NOW()
        WHERE "assigned_sales_id" IS NULL
          AND "id" = 4
      `,
        [secondarySalesId, headSalesAccountId],
      );
    }

    // 4. Extend quotations table for 2-step approval (Sales -> HeadSales -> Customer)
    await queryRunner.query(`
      ALTER TABLE "quotations"
      ALTER COLUMN "status" TYPE VARCHAR(30)
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP CONSTRAINT IF EXISTS "quotations_status_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD CONSTRAINT "quotations_status_check"
      CHECK ("status" IN ('Draft', 'PendingApproval', 'Sent', 'Approved', 'Rejected'))
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD COLUMN IF NOT EXISTS "created_by" INTEGER NULL REFERENCES "accounts"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "head_sales_reviewed_by" INTEGER NULL REFERENCES "accounts"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "head_sales_reviewed_at" TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS "head_sales_note" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "head_sales_decision" VARCHAR(30) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP COLUMN IF EXISTS "head_sales_decision",
      DROP COLUMN IF EXISTS "head_sales_note",
      DROP COLUMN IF EXISTS "head_sales_reviewed_at",
      DROP COLUMN IF EXISTS "head_sales_reviewed_by",
      DROP COLUMN IF EXISTS "created_by"
    `);

    await queryRunner.query(`
      UPDATE "quotations" SET "status" = 'Draft' WHERE "status" = 'PendingApproval'
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP CONSTRAINT IF EXISTS "quotations_status_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD CONSTRAINT "quotations_status_check"
      CHECK ("status" IN ('Draft', 'Sent', 'Approved', 'Rejected'))
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_customers_assigned_sales_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "assigned_at",
      DROP COLUMN IF EXISTS "assigned_by",
      DROP COLUMN IF EXISTS "assigned_sales_id"
    `);
  }
}

