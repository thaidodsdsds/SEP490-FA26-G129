import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SRS v1.5 màn 14: Admin/CEO có thể từ chối hợp đồng ở trạng thái PendingApproval.
 * Thêm trạng thái Rejected và lưu lại lý do/người/from thời gian từ chối.
 */
export default class AddContractRejection1795400000000 implements MigrationInterface {
  name = 'AddContractRejection1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contracts"
      DROP CONSTRAINT IF EXISTS "contracts_status_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "rejected_by" INTEGER NULL,
      ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD CONSTRAINT "contracts_status_check"
      CHECK (
        "status" IN (
          'Draft',
          'PendingApproval',
          'Approved',
          'Signed',
          'Liquidated',
          'Cancelled',
          'Rejected'
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contracts"
      DROP CONSTRAINT IF EXISTS "contracts_status_check"
    `);

    await queryRunner.query(`
      UPDATE "contracts"
      SET "status" = 'Cancelled'
      WHERE "status" = 'Rejected'
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD CONSTRAINT "contracts_status_check"
      CHECK (
        "status" IN (
          'Draft',
          'PendingApproval',
          'Approved',
          'Signed',
          'Liquidated',
          'Cancelled'
        )
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
      DROP COLUMN IF EXISTS "rejection_reason",
      DROP COLUMN IF EXISTS "rejected_by",
      DROP COLUMN IF EXISTS "rejected_at"
    `);
  }
}
