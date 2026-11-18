import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CEO and Admin are a single role in this project.
 * Keep the `ceo@isocal.com` login as an alias of Admin instead of a separate CEO role.
 */
export default class MergeCeoAliasIntoAdmin1795600000000 implements MigrationInterface {
  name = 'MergeCeoAliasIntoAdmin1795600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "accounts"
      SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'Admin')
      WHERE "email" = 'ceo@isocal.com'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "accounts"
      SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'CEO')
      WHERE "email" = 'ceo@isocal.com'
    `);
  }
}
