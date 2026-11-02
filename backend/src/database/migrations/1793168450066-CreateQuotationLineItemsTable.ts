
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuotationLineItemsTable1793168450066
  implements MigrationInterface
{
  name = 'CreateQuotationLineItemsTable1793168450066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE quotation_line_items (
        id SERIAL PRIMARY KEY,

        quotation_id INTEGER NOT NULL,
        service_request_item_id INTEGER NOT NULL,

        description TEXT NOT NULL,

        unit_price NUMERIC(15, 2) NOT NULL,
        discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,

        CONSTRAINT fk_quotation_line_items_quotation
          FOREIGN KEY (quotation_id)
          REFERENCES quotations(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_quotation_line_items_service_request_item
          FOREIGN KEY (service_request_item_id)
          REFERENCES service_request_items(id)
          ON DELETE RESTRICT,

        CONSTRAINT chk_quotation_line_items_unit_price
          CHECK (unit_price >= 0),

        CONSTRAINT chk_quotation_line_items_discount
          CHECK (
            discount_amount >= 0
            AND discount_amount <= unit_price
          ),

        CONSTRAINT uq_quotation_line_items_quotation_request_item
          UNIQUE (quotation_id, service_request_item_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_quotation_line_items_quotation_id
      ON quotation_line_items (quotation_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_quotation_line_items_service_request_item_id
      ON quotation_line_items (service_request_item_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE quotation_line_items;
    `);
  }
}
