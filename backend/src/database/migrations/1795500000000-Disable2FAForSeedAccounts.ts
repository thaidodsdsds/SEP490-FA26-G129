import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Disable 2FA for the hard-coded seed accounts so they can be used for local testing.
 * Only the three accounts that were seeded with 2FA enabled are affected.
 */
export default class Disable2FAForSeedAccounts1795500000000 implements MigrationInterface {
  name = 'Disable2FAForSeedAccounts1795500000000';

  private static readonly seedEmailsWith2FA = [
    'admin@isocal.com',
    'head.technician@isocal.com',
    'ceo@isocal.com',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "accounts" SET "is_2fa_enabled" = FALSE WHERE "email" IN ('${Disable2FAForSeedAccounts1795500000000.seedEmailsWith2FA.join("', '")}')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "accounts" SET "is_2fa_enabled" = TRUE WHERE "email" IN ('${Disable2FAForSeedAccounts1795500000000.seedEmailsWith2FA.join("', '")}')`,
    );
  }
}
