import { MigrationInterface, QueryRunner } from 'typeorm';

export default class AddQuotationContractLink1792410000000
  implements MigrationInterface
{
  public name = 'AddQuotationContractLink1792410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safe if the columns were already added manually in pgAdmin.
    await queryRunner.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS quotation_id INTEGER
    `);

    await queryRunner.query(`
      ALTER TABLE quotations
      ADD COLUMN IF NOT EXISTS approved_by_account_id INTEGER
    `);

    await queryRunner.query(`
      ALTER TABLE quotations
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);

    // Add foreign keys only if the named constraints do not already exist.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_contracts_quotation'
        ) THEN
          ALTER TABLE contracts
          ADD CONSTRAINT fk_contracts_quotation
          FOREIGN KEY (quotation_id)
          REFERENCES quotations(id);
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_quotations_approved_by_account'
        ) THEN
          ALTER TABLE quotations
          ADD CONSTRAINT fk_quotations_approved_by_account
          FOREIGN KEY (approved_by_account_id)
          REFERENCES accounts(id);
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE quotations
      DROP CONSTRAINT IF EXISTS fk_quotations_approved_by_account
    `);

    await queryRunner.query(`
      ALTER TABLE contracts
      DROP CONSTRAINT IF EXISTS fk_contracts_quotation
    `);

    await queryRunner.query(`
      ALTER TABLE quotations
      DROP COLUMN IF EXISTS approved_at,
      DROP COLUMN IF EXISTS approved_by_account_id
    `);

    await queryRunner.query(`
      ALTER TABLE contracts
      DROP COLUMN IF EXISTS quotation_id
    `);
  }
}
