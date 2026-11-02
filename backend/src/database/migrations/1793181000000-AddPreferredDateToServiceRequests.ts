import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreferredDateToServiceRequests1793181000000
  implements MigrationInterface
{
  name = "AddPreferredDateToServiceRequests1793181000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_requests"
      ADD COLUMN IF NOT EXISTS "preferred_date" DATE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_requests"
      DROP COLUMN IF EXISTS "preferred_date";
    `);
  }
}

