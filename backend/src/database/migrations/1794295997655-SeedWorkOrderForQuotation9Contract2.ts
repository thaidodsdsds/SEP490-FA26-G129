import { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedWorkOrderForQuotation9Contract21794295997655
  implements MigrationInterface
{
  name = 'SeedWorkOrderForQuotation9Contract21794295997655';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "work_orders" ("contract_id", "quotation_id", "status")
      SELECT 2, 9, 'Open'
      WHERE EXISTS (SELECT 1 FROM "contracts" WHERE "id" = 2)
        AND EXISTS (SELECT 1 FROM "quotations" WHERE "id" = 9)
        AND NOT EXISTS (
          SELECT 1
          FROM "work_orders"
          WHERE "contract_id" = 2 AND "quotation_id" = 9
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "work_orders"
      WHERE "contract_id" = 2 AND "quotation_id" = 9;
    `);
  }
}
