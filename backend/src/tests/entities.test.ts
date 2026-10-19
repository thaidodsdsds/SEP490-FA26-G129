import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { entities } from '../database/entities.js';
import AlignIsocalSchema from '../database/migrations/1792400000000-AlignIsocalSchemaV14.js';
import AddQuotationContractLink from '../database/migrations/1792410000000-AddQuotationContractLink.js';
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
const migrationSql: string[] = [];

const documentedTables = [
  'roles',
  'accounts',
  'staffs',
  'customers',
  'device_types',
  'devices',
  'device_ownership_histories',
  'master_standards',
  'warehouse_transactions',
  'service_requests',
  'service_request_items',
  'service_prices',
  'quotations',
  'quotation_line_items',
  'work_orders',
  'work_order_assignments',
  'initial_inspections',
  'calibration_records',
  'measurement_details',
  'review_logs',
  'certificates',
  'seals',
  'smart_contract_seal_events',
  'seal_verification_logs',
  'contracts',
  'payments',
  'invoices',
  'webhook_logs',
  'attachments',
  'notifications',
  'departments',
  'chat_threads',
  'chat_participants',
  'chat_messages',
  'calibration_fields',
  'calibration_procedures',
];

describe('ISOCAL TypeORM entities', () => {
  beforeAll(async () => {
    await dataSource.buildTestMetadatas();
    const queryRunner = {
      query: async (sql: string) => {
        migrationSql.push(sql);
        return [];
      },
    } as QueryRunner;
    await new AlignIsocalSchema().up(queryRunner);
    await new AddQuotationContractLink().up(queryRunner);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('defines all 36 documented tables without removed tables', () => {
    const tableNames = dataSource.entityMetadatas.map(({ tableName }) => tableName);

    expect(entities).toHaveLength(36);
    expect(entities.every((entity) => typeof entity === 'function')).toBe(true);
    expect(tableNames).toHaveLength(36);
    expect(new Set(tableNames).size).toBe(36);
    expect(tableNames.sort()).toEqual(documentedTables.sort());
    expect(tableNames).toContain('customers');
    expect(tableNames).toContain('calibration_procedures');
    expect(tableNames).not.toContain('contacts');
    expect(tableNames).not.toContain('repair_orders');
    expect(tableNames).not.toContain('login_sessions');
  });

  it('registers the consolidated schema and quotation-contract migrations in order', () => {
    const migrations = configuredDataSource.options.migrations ?? [];

    expect(migrations).toEqual([AlignIsocalSchema, AddQuotationContractLink]);
  });

  it('maps account, customer, device and technical-catalog fields to the revised document', () => {
    const customerColumns = dataSource.getMetadata('Customer').columns.map(({ databaseName }) => databaseName);
    const accountColumns = dataSource.getMetadata('Account').columns.map(({ databaseName }) => databaseName);
    const staffColumns = dataSource.getMetadata('Staff').columns.map(({ databaseName }) => databaseName);
    const deviceColumns = dataSource.getMetadata('Device').columns.map(({ databaseName }) => databaseName);
    const procedureColumns = dataSource.getMetadata('CalibrationProcedure').columns.map(({ databaseName }) => databaseName);
    const contractColumns = dataSource.getMetadata('Contract').columns.map(({ databaseName }) => databaseName);
    const quotationColumns = dataSource.getMetadata('Quotation').columns.map(({ databaseName }) => databaseName);

    expect(customerColumns).toContain('company_name');
    expect(customerColumns).toContain('industry');
    expect(customerColumns).not.toContain('name');
    expect(customerColumns).not.toContain('contact_email');
    expect(accountColumns).toEqual(expect.arrayContaining([
      'ref_type',
      'ref_id',
      'is_2fa_enabled',
      'failed_login_attempts',
    ]));
    expect(accountColumns).not.toContain('token_version');
    expect(staffColumns).not.toContain('role_id');
    expect(staffColumns).toContain('wallet_address');
    expect(deviceColumns).toContain('internal_code');
    expect(procedureColumns).toEqual(expect.arrayContaining([
      'device_type_id',
      'procedure_type',
      'template_engine_version',
      'approved_by',
    ]));
    expect(contractColumns).toContain('quotation_id');
    expect(quotationColumns).toEqual(expect.arrayContaining(['approved_by_account_id', 'approved_at']));
    expect(dataSource.getMetadata('CalibrationProcedure').uniques).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'UQ_calibration_procedures_code_version' })]),
    );
  });

  it('registers the documented foreign-key relationships', () => {
    expect(dataSource.getMetadata('ServiceRequestItem').relations.map(({ propertyName }) => propertyName))
      .toEqual(expect.arrayContaining(['serviceRequest', 'device', 'procedure']));
    expect(dataSource.getMetadata('CalibrationRecord').relations.map(({ propertyName }) => propertyName))
      .toEqual(expect.arrayContaining(['serviceRequestItem', 'procedure', 'masterStandard', 'reviewer']));
    expect(dataSource.getMetadata('Seal').relations.map(({ propertyName }) => propertyName))
      .toEqual(expect.arrayContaining(['device', 'certificate', 'smartContractEvents', 'verificationLogs']));
    expect(dataSource.getMetadata('Department').relations.map(({ propertyName }) => propertyName))
      .toEqual(expect.arrayContaining(['manager', 'parentDepartment', 'staff']));
    expect(dataSource.getMetadata('Contract').relations.map(({ propertyName }) => propertyName))
      .toContain('quotation');
  });

  it('does not model the documented polymorphic references as incorrect foreign keys', () => {
    const accountRelationNames = dataSource.getMetadata('Account').relations.map(({ propertyName }) => propertyName);
    const attachmentRelationNames = dataSource.getMetadata('Attachment').relations.map(({ propertyName }) => propertyName);

    expect(accountRelationNames).not.toContain('customer');
    expect(accountRelationNames).not.toContain('staff');
    expect(attachmentRelationNames).not.toContain('owner');
    expect(attachmentRelationNames).toContain('chatMessages');
  });

  it('creates all entity columns in the registered migrations', () => {
    const definitions = new Map<string, Set<string>>();
    const createTablePattern = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\n\s*\);/g;

    for (const sql of migrationSql) {
      for (const match of sql.matchAll(createTablePattern)) {
        const [, tableName, definition] = match;
        const columns = new Set(
          definition
            .split('\n')
            .flatMap((line) => {
              const column = line.trim().match(
                /^([a-z_][a-z0-9_]*)\s+(?:INTEGER|INT|VARCHAR|TEXT|BOOLEAN|JSONB|DECIMAL|DATE|TIMESTAMP)/i,
              );
              return column ? [column[1]] : [];
            }),
        );
        definitions.set(tableName, columns);
      }
    }

    for (const metadata of dataSource.entityMetadatas) {
      const migratedColumns = definitions.get(metadata.tableName);
      expect(migratedColumns, `${metadata.tableName} is created by a migration`).toBeDefined();

      const allMigratedColumns = new Set(migratedColumns);
      for (const sql of migrationSql) {
        const escapedTableName = metadata.tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const alterTable = new RegExp(
          `ALTER TABLE\\s+${escapedTableName}\\s+ADD COLUMN IF NOT EXISTS\\s+([a-z_][a-z0-9_]*)`,
          'gi',
        );
        for (const match of sql.matchAll(alterTable)) {
          allMigratedColumns.add(match[1].toLowerCase());
        }
      }

      for (const column of metadata.columns) {
        expect(allMigratedColumns, `${metadata.tableName}.${column.databaseName}`).toContain(column.databaseName);
      }
    }
  });

  it('creates the entity check constraints and omits the removed repair-order table', () => {
    const migration = migrationSql.join('\n');
    const constraintNames = new Set(
      [...migration.matchAll(/CONSTRAINT\s+"([^"]+)"\s+CHECK/g)].map((match) => match[1]),
    );
    const metadataChecks = dataSource.entityMetadatas.flatMap(({ checks }) => checks.map(({ name }) => name));

    expect(metadataChecks.every((name) => constraintNames.has(name))).toBe(true);
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS\s+repair_orders/i);
    expect(migration).toMatch(/ALTER TABLE contracts\s+ADD COLUMN IF NOT EXISTS quotation_id INTEGER/i);
    expect(migration).toMatch(/FOREIGN KEY \(quotation_id\)\s+REFERENCES quotations\(id\)/i);
  });
});
