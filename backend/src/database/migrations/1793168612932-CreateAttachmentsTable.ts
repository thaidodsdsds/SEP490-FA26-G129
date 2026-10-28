import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttachmentsTable1793168612932
  implements MigrationInterface
{
  name = 'CreateAttachmentsTable1793168612932';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE attachments (
        id SERIAL PRIMARY KEY,

        service_request_id INTEGER NOT NULL,

        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_attachments_service_request
          FOREIGN KEY (service_request_id)
          REFERENCES service_requests(id)
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_attachments_service_request_id
      ON attachments (service_request_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE attachments;
    `);
  }
}