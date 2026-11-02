import bcrypt from 'bcryptjs';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class SeedSampleData1792520000000 implements MigrationInterface {
  name = 'SeedSampleData1792520000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Generate a single shared password hash for all seed accounts (password: "Isocal@123")
    const defaultPassword = 'Isocal@123';
    const hash = await bcrypt.hash(defaultPassword, 10);

    // Seed customers
    await queryRunner.query(`
      INSERT INTO "customers" ("id", "company_name", "tax_code", "address", "industry", "created_at")
      VALUES
        (1, 'ABC Calibration Company', '0312345678', '123 Nguyen Trai, District 1, Ho Chi Minh City', 'Manufacturing', NOW()),
        (2, 'Vietnam Precision Engineering Co., Ltd.', '0312345679', '45 Le Loi, District 3, Ho Chi Minh City', 'Mechanical Engineering', NOW()),
        (3, 'Mekong Food Processing JSC', '1801234567', '88 Tran Hung Dao, Ninh Kieu, Can Tho', 'Food Processing', NOW()),
        (4, 'GreenTech Environmental Solutions', '0109876543', '20 Cau Giay, Hanoi', 'Environmental Services', NOW()),
        (5, 'Da Nang Medical Equipment Co., Ltd.', '0401234567', '66 Nguyen Van Linh, Hai Chau, Da Nang', 'Medical Equipment', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // Reset sequence after manual id insert
    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('"customers"', 'id'), (SELECT MAX(id) FROM "customers"))`);

    // Seed accounts
    await queryRunner.query(`
      INSERT INTO "accounts" ("id", "role_id", "customer_id", "full_name", "email", "phone", "password_hash", "is_2fa_enabled", "failed_login_attempts")
      VALUES
        (1,  1, NULL, 'System Administrator',  'admin@isocal.com',            '0901000001', $1, TRUE,  0),
        (2,  2, NULL, 'Nguyen Van An',          'sale@isocal.com',             '0901000002', $1, FALSE, 0),
        (3,  3, NULL, 'Tran Thi Binh',          'accountant@isocal.com',       '0901000003', $1, FALSE, 0),
        (4,  4, NULL, 'Le Van Cuong',            'technician@isocal.com',       '0901000004', $1, FALSE, 0),
        (5,  5, NULL, 'Pham Minh Duc',           'head.technician@isocal.com',  '0901000005', $1, TRUE,  0),
        (6,  6, NULL, 'Hoang Thi Lan',           'ceo@isocal.com',              '0901000006', $1, TRUE,  0),
        (7,  7, 1,    'Nguyen Minh Long',         'long@abc-calibration.com',    '0911000001', $1, FALSE, 0),
        (8,  7, 2,    'Tran Quoc Huy',            'huy@vietnamprecision.com',    '0911000002', $1, FALSE, 0),
        (9,  7, 3,    'Vo Thanh Mai',             'mai@mekongfood.com',          '0911000003', $1, FALSE, 0),
        (10, 7, 5,    'Nguyen Thu Ha',            'ha@danangmedical.com',        '0911000004', $1, FALSE, 0)
      ON CONFLICT (id) DO NOTHING
    `, [hash]);

    // Reset sequence after manual id insert
    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('"accounts"', 'id'), (SELECT MAX(id) FROM "accounts"))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "accounts" WHERE id BETWEEN 1 AND 10`);
    await queryRunner.query(`DELETE FROM "customers" WHERE id BETWEEN 1 AND 5`);
  }
}
