import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedWorkOrderForQuotation2Contract2179510000000
  implements MigrationInterface
{
  name = 'SeedWorkOrderForQuotation2Contract2179510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed dữ liệu cứng bảng work_orders với quotation_id = 2 và contract_id = 2
    await queryRunner.query(`
      INSERT INTO "work_orders" (
        "id",
        "contract_id",
        "quotation_id",
        "status",
        "created_at"
      ) VALUES (
        2,
        2,
        2,
        'Open',
        NOW()
      ) ON CONFLICT ("id") DO UPDATE SET
        "contract_id" = EXCLUDED."contract_id",
        "quotation_id" = EXCLUDED."quotation_id",
        "status" = EXCLUDED."status";

      SELECT setval(pg_get_serial_sequence('"work_orders"', 'id'), (SELECT MAX(id) FROM "work_orders"));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "work_orders" WHERE "id" = 2 OR ("contract_id" = 2 AND "quotation_id" = 2);
    `);
  }
}

