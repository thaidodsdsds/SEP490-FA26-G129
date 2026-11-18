import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyProfiles1793183000000 implements MigrationInterface {
  name = 'CreateCompanyProfiles1793183000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thông tin pháp lý của Bên B (đơn vị cung cấp dịch vụ) in trên hợp đồng.
    // Dùng CREATE TABLE IF NOT EXISTS để an toàn khi đồng đội đã tạo tay trước đó.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_profiles" (
        "id" SERIAL PRIMARY KEY,

        "name" VARCHAR(255) NOT NULL,
        "representative" VARCHAR(150),
        "position" VARCHAR(100),
        "address" TEXT,
        "phone" VARCHAR(50),
        "fax" VARCHAR(50),
        "tax_code" VARCHAR(50),
        "bank_account" VARCHAR(100),
        "bank_name" VARCHAR(255),

        "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed idempotent: chỉ chèn khi chưa có bản ghi cùng MST.
    await queryRunner.query(`
      INSERT INTO "company_profiles" (
        "name",
        "representative",
        "position",
        "address",
        "phone",
        "fax",
        "tax_code",
        "bank_account",
        "bank_name",
        "is_default"
      )
      SELECT
        'TRUNG TÂM KỸ THUẬT TIÊU CHUẨN ĐO LƯỜNG CHẤT LƯỢNG',
        'Nguyễn Hữu Hà',
        'Phụ trách Trung tâm',
        'Đường Kim Đồng, phường Việt Trì, tỉnh Phú Thọ',
        '0210.3851.668',
        '0210.3853.668',
        '2600706055',
        '118000066436',
        'Ngân hàng TMCP Công thương Việt Nam - Chi nhánh Hùng Vương',
        TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM "company_profiles" WHERE "tax_code" = '2600706055'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "company_profiles";`);
  }
}
