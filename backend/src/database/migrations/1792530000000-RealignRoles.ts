import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Realigns the roles table so that role IDs match the seed account data:
 *   1=Admin, 2=Sales, 3=Accountant, 4=Technician, 5=HeadTechnician, 6=CEO, 7=Customer
 *
 * The original migration created:
 *   1=Admin, 2=Sales, 3=Technician, 4=Reviewer, 5=Signatory, 6=Warehouse, 7=Accountant, 8=Customer
 *
 * We remap the accounts to the new role scheme and rebuild the roles table.
 */
export default class RealignRoles1792530000000 implements MigrationInterface {
  name = 'RealignRoles1792530000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop FK constraint temporarily
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "FK_accounts_role_id"`);

    // Step 2: Map all existing accounts to their NEW role_ids based on role NAME
    // Admin(1->1), Sales(2->2), Technician(3->4), Reviewer(4->5=HeadTechnician), Signatory(5->5=HeadTechnician),
    // Warehouse(6->6=CEO temp), Accountant(7->3), Customer(8->7)
    await queryRunner.query(`
      UPDATE "accounts" SET "role_id" = CASE
        WHEN "role_id" = 1 THEN 101  -- Admin -> temp
        WHEN "role_id" = 2 THEN 102  -- Sales -> temp
        WHEN "role_id" = 3 THEN 104  -- Technician -> temp 4
        WHEN "role_id" = 4 THEN 105  -- Reviewer -> temp HeadTechnician
        WHEN "role_id" = 5 THEN 105  -- Signatory -> temp HeadTechnician
        WHEN "role_id" = 6 THEN 106  -- Warehouse -> temp CEO
        WHEN "role_id" = 7 THEN 103  -- Accountant -> temp 3
        WHEN "role_id" = 8 THEN 107  -- Customer -> temp 7
        ELSE "role_id"
      END
    `);

    // Step 3: Delete all old roles
    await queryRunner.query(`DELETE FROM "roles"`);

    // Step 4: Reset the sequence
    await queryRunner.query(`ALTER SEQUENCE roles_id_seq RESTART WITH 1`);

    // Step 5: Insert new roles in the correct order
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name")
      VALUES
        (1, 'Admin'),
        (2, 'Sales'),
        (3, 'Accountant'),
        (4, 'Technician'),
        (5, 'HeadTechnician'),
        (6, 'CEO'),
        (7, 'Customer')
    `);

    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('"roles"', 'id'), 7)`);

    // Step 6: Map temp role_ids back to final role_ids
    await queryRunner.query(`
      UPDATE "accounts" SET "role_id" = CASE
        WHEN "role_id" = 101 THEN 1
        WHEN "role_id" = 102 THEN 2
        WHEN "role_id" = 103 THEN 3
        WHEN "role_id" = 104 THEN 4
        WHEN "role_id" = 105 THEN 5
        WHEN "role_id" = 106 THEN 6
        WHEN "role_id" = 107 THEN 7
        ELSE "role_id"
      END
    `);

    // Step 7: Re-add FK constraint
    await queryRunner.query(`
      ALTER TABLE "accounts"
      ADD CONSTRAINT "FK_accounts_role_id"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original 8 roles
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "FK_accounts_role_id"`);

    // Map back to temp ids
    await queryRunner.query(`
      UPDATE "accounts" SET "role_id" = CASE
        WHEN "role_id" = 1 THEN 101
        WHEN "role_id" = 2 THEN 102
        WHEN "role_id" = 3 THEN 107  -- Accountant -> 7
        WHEN "role_id" = 4 THEN 103  -- Technician -> 3
        WHEN "role_id" = 5 THEN 104  -- HeadTechnician -> 4 (Reviewer)
        WHEN "role_id" = 6 THEN 106  -- CEO -> 6 (Warehouse)
        WHEN "role_id" = 7 THEN 108  -- Customer -> 8
        ELSE "role_id"
      END
    `);

    await queryRunner.query(`DELETE FROM "roles"`);
    await queryRunner.query(`ALTER SEQUENCE roles_id_seq RESTART WITH 1`);

    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name")
      VALUES
        (1, 'Admin'),
        (2, 'Sales'),
        (3, 'Technician'),
        (4, 'Reviewer'),
        (5, 'Signatory'),
        (6, 'Warehouse'),
        (7, 'Accountant'),
        (8, 'Customer')
    `);

    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('"roles"', 'id'), 8)`);

    await queryRunner.query(`
      UPDATE "accounts" SET "role_id" = CASE
        WHEN "role_id" = 101 THEN 1
        WHEN "role_id" = 102 THEN 2
        WHEN "role_id" = 103 THEN 3
        WHEN "role_id" = 104 THEN 4
        WHEN "role_id" = 106 THEN 6
        WHEN "role_id" = 107 THEN 7
        WHEN "role_id" = 108 THEN 8
        ELSE "role_id"
      END
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts"
      ADD CONSTRAINT "FK_accounts_role_id"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
    `);
  }
}
