import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-enable 2FA for the seed accounts after the temporary local-testing disable.
 * These are the only seed accounts that were originally created with 2FA turned on.
 */
export default class ReEnable2FAForSeedAccounts1795700000000 implements MigrationInterface {
  name = 'ReEnable2FAForSeedAccounts1795700000000';

  private static readonly seedEmailsWith2FA = [
    'admin@isocal.com',
    'head.technician@isocal.com',
    'ceo@isocal.com',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "accounts" SET "is_2fa_enabled" = TRUE WHERE "email" IN ('${ReEnable2FAForSeedAccounts1795700000000.seedEmailsWith2FA.join("', '")}')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "accounts" SET "is_2fa_enabled" = FALSE WHERE "email" IN ('${ReEnable2FAForSeedAccounts1795700000000.seedEmailsWith2FA.join("', '")}')`,
    );
  }
}
