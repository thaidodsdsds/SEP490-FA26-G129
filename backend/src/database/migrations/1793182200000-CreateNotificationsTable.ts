import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1793182200000 implements MigrationInterface {
  name = 'CreateNotificationsTable1793182200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL NOT NULL,
        "account_id" INTEGER NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "content" TEXT NOT NULL,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "read_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_account_id"
          FOREIGN KEY ("account_id")
          REFERENCES "accounts" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_notifications_type"
          CHECK ("type" IN ('InspectionFail', 'Quotation', 'Payment', 'DueDate', 'ChatMessage', 'System'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_account_id"
      ON "notifications" ("account_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
  }
}
