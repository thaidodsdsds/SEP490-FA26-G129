import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { entities } from '../database/entities.js';
import configuredDataSource from '../database/dataSource.js';

class TestDataSource extends DataSource {
  async buildTestMetadatas() {
    return this.buildMetadatas();
  }
}

const dataSource = new TestDataSource({
  type: 'postgres',
  entities,
});

const expectedTables = [
  'roles',
  'customers',
  'accounts',
  'service_types',
  'devices',
  'calibration_procedures',
  'service_requests',
  'service_request_items',
  'quotations',
  'quotation_line_items',
  'attachments',
  'company_profiles',
  'contracts',
  'contract_items',
  'digital_signatures',
  'work_orders',
  'work_order_assignments',
];

describe('ISOCAL TypeORM entities', () => {
  beforeAll(async () => {
    await dataSource.buildTestMetadatas();
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('registers every table currently used by the application', () => {
    const tableNames = dataSource.entityMetadatas
      .map(({ tableName }) => tableName)
      .sort();

    expect(entities.length).toBe(expectedTables.length);
    expect(tableNames).toEqual([...expectedTables].sort());
  });

  it('models the contract signing and work-order workflow', () => {
    const contractRelations = dataSource
      .getMetadata('Contract')
      .relations.map(({ propertyName }) => propertyName);
    const signatureColumns = dataSource
      .getMetadata('DigitalSignature')
      .columns.map(({ databaseName }) => databaseName);
    const workOrderColumns = dataSource
      .getMetadata('WorkOrder')
      .columns.map(({ databaseName }) => databaseName);
    const assignmentColumns = dataSource
      .getMetadata('WorkOrderAssignment')
      .columns.map(({ databaseName }) => databaseName);
    const assignmentRelations = dataSource
      .getMetadata('WorkOrderAssignment')
      .relations.map(({ propertyName }) => propertyName);

    expect(contractRelations).toEqual(expect.arrayContaining(['quotation', 'customer', 'items']));
    expect(signatureColumns).toEqual(
      expect.arrayContaining([
        'contract_id',
        'purpose',
        'signer_id',
        'document_hash',
        'signed_file_url',
        'signed_at',
      ]),
    );
    expect(workOrderColumns).toEqual(
      expect.arrayContaining(['work_order_code', 'contract_id', 'customer_id', 'status']),
    );
    expect(assignmentColumns).toEqual(
      expect.arrayContaining([
        'work_order_id',
        'contract_item_id',
        'technician_id',
        'scheduled_start',
        'scheduled_end',
        'assigned_by',
        'status',
      ]),
    );
    expect(assignmentRelations).toEqual(
      expect.arrayContaining(['work_order', 'contract_item', 'technician']),
    );
  });

  it('keeps the migration directory configured for the CLI', () => {
    const migrations = configuredDataSource.options.migrations ?? [];
    expect(JSON.stringify(migrations)).toContain('src/database/migrations/*.ts');
  });
});
