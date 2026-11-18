import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SRS v1.5 FR-F11: kết quả tra cứu công khai là Valid / Invalid / Expired / Revoked.
 * Migration ban đầu dùng 'NotFound' thay vì 'Invalid' nên cần chuẩn hoá lại.
 */
export default class FixSealVerificationLogResult1795210000000
  implements MigrationInterface
{
  name = 'FixSealVerificationLogResult1795210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "seal_verification_logs"
      DROP CONSTRAINT IF EXISTS "CHK_seal_verification_logs_result";
    `);

    await queryRunner.query(`
      UPDATE "seal_verification_logs"
      SET "verification_result" = 'Invalid'
      WHERE "verification_result" = 'NotFound';
    `);

    await queryRunner.query(`
      ALTER TABLE "seal_verification_logs"
      ADD CONSTRAINT "CHK_seal_verification_logs_result"
      CHECK (
        "verification_result" IN ('Valid', 'Invalid', 'Expired', 'Revoked')
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "seal_verification_logs"
      DROP CONSTRAINT IF EXISTS "CHK_seal_verification_logs_result";
    `);

    await queryRunner.query(`
      UPDATE "seal_verification_logs"
      SET "verification_result" = 'NotFound'
      WHERE "verification_result" = 'Invalid';
    `);

    await queryRunner.query(`
      ALTER TABLE "seal_verification_logs"
      ADD CONSTRAINT "CHK_seal_verification_logs_result"
      CHECK (
        "verification_result" IN ('Valid', 'Expired', 'Revoked', 'NotFound')
      );
    `);
  }
}
