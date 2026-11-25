import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class CreateMeasurementDetailsTable1794117300000
  implements MigrationInterface
{
  name = 'CreateMeasurementDetailsTable1794117300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "measurement_details" (
        "id" SERIAL PRIMARY KEY,
        "calibration_record_id" INTEGER NOT NULL,
        "test_point_id" INTEGER NOT NULL,
        "repeat_no" INTEGER NOT NULL,
        "measured_value" NUMERIC NOT NULL,
        "reference_value" NUMERIC NOT NULL,
        "deviation" NUMERIC GENERATED ALWAYS AS ("measured_value" - "reference_value") STORED,
        "uncertainty" NUMERIC NOT NULL,
        "pass_fail" BOOLEAN,

        CONSTRAINT "CHK_measurement_details_repeat_no"
          CHECK ("repeat_no" > 0),

        CONSTRAINT "CHK_measurement_details_uncertainty"
          CHECK ("uncertainty" >= 0),

        CONSTRAINT "UQ_measurement_details_record_point_repeat"
          UNIQUE ("calibration_record_id", "test_point_id", "repeat_no"),

        CONSTRAINT "FK_measurement_details_calibration_record"
          FOREIGN KEY ("calibration_record_id")
          REFERENCES "calibration_records" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_measurement_details_test_point"
          FOREIGN KEY ("test_point_id")
          REFERENCES "procedure_test_points" ("id")
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE FUNCTION "check_measurement_detail_procedure"()
      RETURNS TRIGGER AS $$
      DECLARE
        parameter_repeat_count INTEGER;
        parameter_procedure_id INTEGER;
        record_procedure_id INTEGER;
      BEGIN
        SELECT pp."repeat_count", pp."procedure_id"
        INTO parameter_repeat_count, parameter_procedure_id
        FROM "procedure_test_points" ptp
        JOIN "procedure_parameters" pp ON pp."id" = ptp."parameter_id"
        WHERE ptp."id" = NEW."test_point_id";

        SELECT cr."procedure_id"
        INTO record_procedure_id
        FROM "calibration_records" cr
        WHERE cr."id" = NEW."calibration_record_id";

        IF parameter_procedure_id IS DISTINCT FROM record_procedure_id THEN
          RAISE EXCEPTION
            'Test point % does not belong to the procedure used by calibration record %',
            NEW."test_point_id", NEW."calibration_record_id";
        END IF;

        IF NEW."repeat_no" > parameter_repeat_count THEN
          RAISE EXCEPTION
            'repeat_no % exceeds configured repeat_count % for test point %',
            NEW."repeat_no", parameter_repeat_count, NEW."test_point_id";
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER "TRG_measurement_details_check_procedure"
      BEFORE INSERT OR UPDATE ON "measurement_details"
      FOR EACH ROW
      EXECUTE FUNCTION "check_measurement_detail_procedure"();
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_measurement_details_test_point_id"
      ON "measurement_details" ("test_point_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "measurement_details";
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS "check_measurement_detail_procedure"();
    `);
  }
}
