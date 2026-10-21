import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix the seeded account role assignments after role realignment.
 * The seed data inserted accounts with role_ids based on user intent:
 *   role_id 3 = Accountant, role_id 4 = Technician, role_id 5 = HeadTechnician, etc.
 * But since the original roles table had different IDs, the realignment migration
 * double-remapped some accounts. This migration fixes them by email identity.
 */
export default class FixSeedAccountRoles1792540000000 implements MigrationInterface {
  name = 'FixSeedAccountRoles1792540000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Fix each seeded account to the correct role based on their intended role
    // Account 1: admin@isocal.com → Admin (role_id=1) ✓ already correct
    // Account 2: sale@isocal.com → Sales (role_id=2) ✓ already correct

    // Account 3: accountant@isocal.com → Accountant (role_id=3)
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 3 WHERE "email" = 'accountant@isocal.com'`);

    // Account 4: technician@isocal.com → Technician (role_id=4)
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 4 WHERE "email" = 'technician@isocal.com'`);

    // Account 5: head.technician@isocal.com → HeadTechnician (role_id=5)
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 5 WHERE "email" = 'head.technician@isocal.com'`);

    // Account 6: ceo@isocal.com → CEO (role_id=6) ✓ already correct
    
    // Customer accounts (7-10) → Customer (role_id=7)
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 7 WHERE "email" IN ('long@abc-calibration.com', 'huy@vietnamprecision.com', 'mai@mekongfood.com', 'ha@danangmedical.com')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the broken state (from RealignRoles migration output)
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 4 WHERE "email" = 'accountant@isocal.com'`);
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 5 WHERE "email" = 'technician@isocal.com'`);
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 5 WHERE "email" = 'head.technician@isocal.com'`);
    await queryRunner.query(`UPDATE "accounts" SET "role_id" = 3 WHERE "email" IN ('long@abc-calibration.com', 'huy@vietnamprecision.com', 'mai@mekongfood.com', 'ha@danangmedical.com')`);
  }
}
