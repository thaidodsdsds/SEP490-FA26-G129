import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequestCodeToServiceRequests1793180000000
  implements MigrationInterface
{
  name = "AddRequestCodeToServiceRequests1793180000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_requests"
      ADD COLUMN IF NOT EXISTS "request_code" VARCHAR(50);
    `);

    await queryRunner.query(`
      UPDATE "service_requests"
      SET "request_code" = 'SR-' || EXTRACT(YEAR FROM "created_at")::TEXT || '-' || LPAD("id"::TEXT, 3, '0')
      WHERE "request_code" IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_service_requests_request_code"
      ON "service_requests" ("request_code")
      WHERE "request_code" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_service_requests_request_code";
    `);

    await queryRunner.query(`
      ALTER TABLE "service_requests"
      DROP COLUMN IF EXISTS "request_code";
    `);
  }
}

