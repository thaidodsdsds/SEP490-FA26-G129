import bcrypt from 'bcryptjs';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class AddHeadOfWarehouseRoleAndAccount1795800000000 implements MigrationInterface {
  name = 'AddHeadOfWarehouseRoleAndAccount1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure roles exist
    await queryRunner.query(`
      INSERT INTO "roles" ("name")
      VALUES ('HeadOfWarehouse')
      ON CONFLICT ("name") DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("name")
      VALUES ('Warehouse')
      ON CONFLICT ("name") DO NOTHING;
    `);

    const headWarehouseRoleRows: Array<{ id: number }> = await queryRunner.query(`
      SELECT "id" FROM "roles" WHERE "name" = 'HeadOfWarehouse' LIMIT 1
    `);
    const warehouseRoleRows: Array<{ id: number }> = await queryRunner.query(`
      SELECT "id" FROM "roles" WHERE "name" = 'Warehouse' LIMIT 1
    `);

    const headWarehouseRoleId = headWarehouseRoleRows[0]?.id;
    const warehouseRoleId = warehouseRoleRows[0]?.id;

    const defaultPasswordHash = await bcrypt.hash('Isocal@123', 10);

    // 2. Seed HeadOfWarehouse accounts (both head.warehouse@isocal.com and headofwarehouse@isocal.com)
    if (headWarehouseRoleId) {
      await queryRunner.query(
        `
        INSERT INTO "accounts" ("role_id", "customer_id", "full_name", "email", "phone", "password_hash", "is_2fa_enabled", "failed_login_attempts")
        VALUES ($1, NULL, 'Tran Van Khoa (Head of Warehouse)', 'head.warehouse@isocal.com', '0901000010', $2, FALSE, 0)
        ON CONFLICT ("email") DO UPDATE SET "role_id" = EXCLUDED."role_id", "password_hash" = EXCLUDED."password_hash";
      `,
        [headWarehouseRoleId, defaultPasswordHash],
      );

      await queryRunner.query(
        `
        INSERT INTO "accounts" ("role_id", "customer_id", "full_name", "email", "phone", "password_hash", "is_2fa_enabled", "failed_login_attempts")
        VALUES ($1, NULL, 'Tran Van Khoa (Head of Warehouse)', 'headofwarehouse@isocal.com', '0901000010', $2, FALSE, 0)
        ON CONFLICT ("email") DO UPDATE SET "role_id" = EXCLUDED."role_id", "password_hash" = EXCLUDED."password_hash";
      `,
        [headWarehouseRoleId, defaultPasswordHash],
      );
    }

    // 3. Seed regular Warehouse staff account
    if (warehouseRoleId) {
      await queryRunner.query(
        `
        INSERT INTO "accounts" ("role_id", "customer_id", "full_name", "email", "phone", "password_hash", "is_2fa_enabled", "failed_login_attempts")
        VALUES ($1, NULL, 'Nguyen Van Kho (Warehouse Staff)', 'warehouse@isocal.com', '0901000011', $2, FALSE, 0)
        ON CONFLICT ("email") DO UPDATE SET "role_id" = EXCLUDED."role_id", "password_hash" = EXCLUDED."password_hash";
      `,
        [warehouseRoleId, defaultPasswordHash],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "accounts" WHERE "email" IN ('head.warehouse@isocal.com', 'headofwarehouse@isocal.com', 'warehouse@isocal.com');
    `);
  }
}
