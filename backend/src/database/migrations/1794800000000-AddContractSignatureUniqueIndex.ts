import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mỗi hợp đồng chỉ có tối đa 1 chữ ký số cho mỗi mục đích
 * (CompanyApproval / CustomerApproval / Liquidation).
 *
 * Ràng buộc này nằm trong migration work_orders cũ của nhánh Certificate;
 * sau khi hợp nhất với schema work_orders của main, tách riêng ra đây.
 * Cột contract_id cho phép NULL (chữ ký cho calibration record / certificate),
 * PostgreSQL không so sánh các giá trị NULL nên không ảnh hưởng.
 */
export class AddContractSignatureUniqueIndex1794800000000
  implements MigrationInterface
{
  name = 'AddContractSignatureUniqueIndex1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_digital_signatures_contract_purpose"
      ON "digital_signatures" ("contract_id", "purpose");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_signatures_signer_id"
      ON "digital_signatures" ("signer_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_digital_signatures_contract_purpose";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_digital_signatures_signer_id";
    `);
  }
}
