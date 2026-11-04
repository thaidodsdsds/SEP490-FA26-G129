import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTechnicalNotesAndAccessoriesToServiceRequests1793182000000
  implements MigrationInterface
{
  name = 'AddTechnicalNotesAndAccessoriesToServiceRequests1793182000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_requests"
      ADD COLUMN IF NOT EXISTS "special_notes" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "accessories_note" TEXT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_requests"
      DROP COLUMN IF EXISTS "special_notes",
      DROP COLUMN IF EXISTS "accessories_note";
    `);
  }
}

