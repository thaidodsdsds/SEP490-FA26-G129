import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateRolesAndCustomers1792500000000 implements MigrationInterface {
  name = 'CreateRolesAndCustomers1792500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" SERIAL NOT NULL,
        "company_name" character varying(255) NOT NULL,
        "tax_code" character varying(50),
        "address" text NOT NULL,
        "industry" character varying(100) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("name")
      VALUES
        ('Admin'),
        ('Sales'),
        ('Technician'),
        ('Reviewer'),
        ('Signatory'),
        ('Warehouse'),
        ('Accountant'),
        ('Customer')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "customers"');
    await queryRunner.query('DROP TABLE "roles"');
  }
}
