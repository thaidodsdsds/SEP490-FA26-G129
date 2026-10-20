import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateAccounts1792510000000 implements MigrationInterface {
  name = 'CreateAccounts1792510000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" SERIAL NOT NULL,
        "role_id" integer NOT NULL,
        "customer_id" integer,
        "full_name" character varying(255) NOT NULL,
        "email" character varying(320) NOT NULL,
        "phone" character varying(30),
        "password_hash" character varying(255) NOT NULL,
        "is_2fa_enabled" boolean NOT NULL DEFAULT false,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_accounts_email" UNIQUE ("email"),
        CONSTRAINT "PK_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_role_id" FOREIGN KEY ("role_id")
          REFERENCES "roles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_accounts_customer_id" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE SET NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "accounts"');
  }
}
