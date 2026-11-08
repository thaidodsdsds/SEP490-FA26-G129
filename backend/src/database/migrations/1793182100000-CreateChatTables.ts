import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatTables1793182100000 implements MigrationInterface {
  name = 'CreateChatTables1793182100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_threads" (
        "id" SERIAL NOT NULL,
        "thread_type" VARCHAR(50) NOT NULL,
        "service_request_id" INTEGER,
        "customer_id" INTEGER,
        "title" VARCHAR(255) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'Open',
        "created_by" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "closed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_chat_threads_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_threads_service_request_id"
          FOREIGN KEY ("service_request_id")
          REFERENCES "service_requests" ("id")
          ON DELETE SET NULL,
        CONSTRAINT "FK_chat_threads_customer_id"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers" ("id")
          ON DELETE SET NULL,
        CONSTRAINT "FK_chat_threads_created_by"
          FOREIGN KEY ("created_by")
          REFERENCES "accounts" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "CHK_chat_threads_type"
          CHECK ("thread_type" IN ('CustomerSupport', 'ServiceRequestDiscussion', 'CalibrationDispute')),
        CONSTRAINT "CHK_chat_threads_status"
          CHECK ("status" IN ('Open', 'Closed'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_threads_service_request_id"
      ON "chat_threads" ("service_request_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_threads_customer_id"
      ON "chat_threads" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_participants" (
        "id" SERIAL NOT NULL,
        "chat_thread_id" INTEGER NOT NULL,
        "account_id" INTEGER NOT NULL,
        "last_read_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "left_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_chat_participants_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_participants_chat_thread_id"
          FOREIGN KEY ("chat_thread_id")
          REFERENCES "chat_threads" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_chat_participants_account_id"
          FOREIGN KEY ("account_id")
          REFERENCES "accounts" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "UQ_chat_participants_thread_account"
          UNIQUE ("chat_thread_id", "account_id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" SERIAL NOT NULL,
        "chat_thread_id" INTEGER NOT NULL,
        "sender_account_id" INTEGER NOT NULL,
        "content" TEXT NOT NULL,
        "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_messages_chat_thread_id"
          FOREIGN KEY ("chat_thread_id")
          REFERENCES "chat_threads" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_chat_messages_sender_account_id"
          FOREIGN KEY ("sender_account_id")
          REFERENCES "accounts" ("id")
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_chat_thread_id"
      ON "chat_messages" ("chat_thread_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_participants";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_threads";`);
  }
}
