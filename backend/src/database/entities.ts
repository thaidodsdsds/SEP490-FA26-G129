// ==================== WORK ORDER ====================

@Entity({ name: 'work_orders' })
@Index('IDX_work_orders_contract_id', ['contract_id'])
@Index('IDX_work_orders_quotation_id', ['quotation_id'])
@Index('IDX_work_orders_status', ['status'])
export class WorkOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'contract_id',
    foreignKeyConstraintName: 'FK_work_orders_contract',
  })
  contract!: Contract | null;

  @Column({ type: 'integer', nullable: true })
  contract_id!: number | null;

  @ManyToOne(() => Quotation, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'quotation_id',
    foreignKeyConstraintName: 'FK_work_orders_quotation',
  })
  quotation!: Quotation | null;

  @Column({ type: 'integer', nullable: true })
  quotation_id!: number | null;

  @Column({ type: 'varchar', length: 20, default: 'Open' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @OneToMany(() => WorkOrderAssignment, (assignment) => assignment.work_order)
  assignments!: WorkOrderAssignment[];
}

// ==================== MASTER STANDARD ====================

@Entity({ name: 'master_standards' })
@Index('IDX_master_standards_status', ['status'])
@Index('IDX_master_standards_calibration_expiry', ['calibration_expiry'])
@Unique('UQ_master_standards_serial_number', ['serial_number'])
export class MasterStandard {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  serial_number!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accuracy_class!: string | null;

  @Column({ type: 'date' })
  calibration_expiry!: string;

  @Column({ type: 'varchar', length: 20, default: 'Active' })
  status!: string;

  @OneToMany(() => WorkOrderAssignment, (assignment) => assignment.master_standard)
  assignments!: WorkOrderAssignment[];
}

// ==================== WORK ORDER ASSIGNMENT ====================

@Entity({ name: 'work_order_assignments' })
@Unique('UQ_work_order_assignments_work_order_item', [
  'work_order_id',
  'service_request_item_id',
])
@Index('IDX_work_order_assignments_technician_id', ['technician_id'])
@Index('IDX_work_order_assignments_master_standard_id', ['master_standard_id'])
@Index('IDX_work_order_assignments_status', ['status'])
export class WorkOrderAssignment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => WorkOrder, (workOrder) => workOrder.assignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'work_order_id',
    foreignKeyConstraintName: 'FK_work_order_assignments_work_order',
  })
  work_order!: WorkOrder;

  @Column({ type: 'integer' })
  work_order_id!: number;

  @ManyToOne(() => ServiceRequestItem, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'service_request_item_id',
    foreignKeyConstraintName: 'FK_work_order_assignments_service_request_item',
  })
  service_request_item!: ServiceRequestItem;

  @Column({ type: 'integer' })
  service_request_item_id!: number;

  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'technician_id',
    foreignKeyConstraintName: 'FK_work_order_assignments_technician',
  })
  technician!: Account;

  @Column({ type: 'integer' })
  technician_id!: number;

  @ManyToOne(() => MasterStandard, (standard) => standard.assignments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'master_standard_id',
    foreignKeyConstraintName: 'FK_work_order_assignments_master_standard',
  })
  master_standard!: MasterStandard;

  @Column({ type: 'integer' })
  master_standard_id!: number;

  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'assigned_by',
    foreignKeyConstraintName: 'FK_work_order_assignments_assigned_by',
  })
  assigned_by_account!: Account;

  @Column({ type: 'integer' })
  assigned_by!: number;

  @Column({ type: 'timestamptz' })
  scheduled_start!: Date;

  @Column({ type: 'timestamptz' })
  scheduled_end!: Date;

  @Column({ type: 'varchar', length: 20, default: 'Assigned' })
  status!: string;
}

// ==================== INITIAL INSPECTION ====================

@Entity({ name: 'initial_inspections' })
@Index('IDX_initial_inspections_inspected_by', ['inspected_by'])
export class InitialInspection {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ServiceRequestItem, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'service_request_item_id',
    foreignKeyConstraintName: 'FK_initial_inspections_service_request_item',
  })
  service_request_item!: ServiceRequestItem;

  @Column({ type: 'integer', unique: true })
  service_request_item_id!: number;

  @Column({ type: 'varchar', length: 10 })
  result!: 'Pass' | 'Fail';

  @Column({ type: 'text', nullable: true })
  defect_note!: string | null;

  @Column({ type: 'text', nullable: true })
  photo_url!: string | null;

  @Column({ type: 'boolean', default: false })
  customer_written_consent!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  customer_consent_status!: 'Pending' | 'Approved' | 'Rejected';

  @Column({ type: 'text', nullable: true })
  customer_consent_note!: string | null;

  @Column({ type: 'text', nullable: true })
  customer_consent_file!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  customer_consented_at!: Date | null;

  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'customer_consented_by',
    foreignKeyConstraintName: 'FK_initial_inspections_customer_consented_by',
  })
  customer_consented_by_account!: Account | null;

  @Column({ type: 'integer', nullable: true })
  customer_consented_by!: number | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  customer_consent_signer_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customer_consent_method!: string | null;

  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'inspected_by',
    foreignKeyConstraintName: 'FK_initial_inspections_inspected_by',
  })
  inspected_by_account!: Account;

  @Column({ type: 'integer' })
  inspected_by!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  inspected_at!: Date;
}

// ==================== PROCEDURE STEP ====================

@Entity({ name: 'procedure_steps' })
@Index('IDX_procedure_steps_procedure_id', ['procedure_id'])
@Unique('UQ_procedure_steps_proc_step_no', ['procedure_id', 'step_no'])
export class ProcedureStep {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => CalibrationProcedure,
    (proc) => proc.steps,
    { nullable: false, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  )
  @JoinColumn({
    name: 'procedure_id',
    foreignKeyConstraintName: 'FK_procedure_steps_procedure_id',
  })
  procedure!: CalibrationProcedure;

  @Column({ type: 'integer' })
  procedure_id!: number;

  @Column({ type: 'integer' })
  step_no!: number;

  @Column({ type: 'text' })
  instruction!: string;

  @Column({ type: 'boolean', default: false })
  requires_evidence!: boolean;
}

// ==================== PROCEDURE PARAMETER ====================

@Entity({ name: 'procedure_parameters' })
@Index('IDX_procedure_parameters_procedure_id', ['procedure_id'])
export class ProcedureParameter {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => CalibrationProcedure,
    (proc) => proc.parameters,
    { nullable: false, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  )
  @JoinColumn({
    name: 'procedure_id',
    foreignKeyConstraintName: 'FK_procedure_parameters_procedure_id',
  })
  procedure!: CalibrationProcedure;

  @Column({ type: 'integer' })
  procedure_id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  unit!: string;

  @Column({ type: 'integer', default: 1 })
  repeat_count!: number;

  @Column({ type: 'varchar', length: 255, default: 'mean' })
  calculation_method!: string;

  @OneToMany(() => ProcedureTestPoint, (tp) => tp.parameter)
  test_points!: ProcedureTestPoint[];
}

// ==================== PROCEDURE TEST POINT ====================

@Entity({ name: 'procedure_test_points' })
@Index('IDX_procedure_test_points_parameter_id', ['parameter_id'])
@Unique('UQ_procedure_test_points_param_point_no', ['parameter_id', 'point_no'])
export class ProcedureTestPoint {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => ProcedureParameter,
    (param) => param.test_points,
    { nullable: false, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  )
  @JoinColumn({
    name: 'parameter_id',
    foreignKeyConstraintName: 'FK_procedure_test_points_parameter_id',
  })
  parameter!: ProcedureParameter;

  @Column({ type: 'integer' })
  parameter_id!: number;

  @Column({ type: 'integer' })
  point_no!: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  nominal_value!: number | string;

  @Column({ type: 'numeric', precision: 15, scale: 4, nullable: true })
  tolerance!: number | string | null;

  @Column({ type: 'numeric', precision: 15, scale: 4, nullable: true })
  max_uncertainty!: number | string | null;
}

// ==================== CALIBRATION RECORD ====================

@Entity({ name: 'calibration_records' })
@Index('IDX_calibration_records_service_request_item_id', ['service_request_item_id'])
@Index('IDX_calibration_records_procedure_id', ['procedure_id'])
@Index('IDX_calibration_records_technician_id', ['technician_id'])
@Index('IDX_calibration_records_review_status', ['review_status'])
export class CalibrationRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ServiceRequestItem, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'service_request_item_id',
    foreignKeyConstraintName: 'FK_calibration_records_service_request_item',
  })
  service_request_item!: ServiceRequestItem;

  @Column({ type: 'integer' })
  service_request_item_id!: number;

  @ManyToOne(() => CalibrationProcedure, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'procedure_id',
    foreignKeyConstraintName: 'FK_calibration_records_procedure',
  })
  procedure!: CalibrationProcedure;

  @Column({ type: 'integer' })
  procedure_id!: number;

  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'technician_id',
    foreignKeyConstraintName: 'FK_calibration_records_technician',
  })
  technician!: Account;

  @Column({ type: 'integer' })
  technician_id!: number;

  @Column({ type: 'numeric', nullable: true })
  environment_temp!: string | null;

  @Column({ type: 'numeric', nullable: true })
  environment_humidity!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  result_status!: 'Pass' | 'Fail' | null;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  review_status!: 'Pending' | 'Approved' | 'Rejected';

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  reject_reason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at!: Date | null;

  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'reviewer_id',
    foreignKeyConstraintName: 'FK_calibration_records_reviewer',
  })
  reviewer!: Account | null;

  @Column({ type: 'integer', nullable: true })
  reviewer_id!: number | null;

  @OneToMany(() => ReviewLog, (reviewLog) => reviewLog.calibration_record)
  review_logs!: ReviewLog[];
}

// ==================== REVIEW LOG ====================

@Entity({ name: 'review_logs' })
@Index('IDX_review_logs_calibration_record_id', ['calibration_record_id'])
@Index('IDX_review_logs_reviewer_id', ['reviewer_id'])
@Index('IDX_review_logs_action', ['action'])
export class ReviewLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CalibrationRecord, (cr) => cr.review_logs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'calibration_record_id',
    foreignKeyConstraintName: 'FK_review_logs_calibration_record',
  })
  calibration_record!: CalibrationRecord;

  @Column({ type: 'integer' })
  calibration_record_id!: number;

  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'reviewer_id',
    foreignKeyConstraintName: 'FK_review_logs_reviewer',
  })
  reviewer!: Account;

  @Column({ type: 'integer' })
  reviewer_id!: number;

  @Column({ type: 'varchar', length: 20 })
  action!: 'Approve' | 'Reject';

  @Column({ type: 'text', nullable: true })
  reject_reason!: string | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

// ==================== STEP RESULT ====================

@Entity({ name: 'step_results' })
@Unique('UQ_step_results_record_procedure_step', ['calibration_record_id', 'procedure_step_id'])
@Index('IDX_step_results_procedure_step_id', ['procedure_step_id'])
export class StepResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CalibrationRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'calibration_record_id',
    foreignKeyConstraintName: 'FK_step_results_calibration_record',
  })
  calibration_record!: CalibrationRecord;

  @Column({ type: 'integer' })
  calibration_record_id!: number;

  @ManyToOne(() => ProcedureStep, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'procedure_step_id',
    foreignKeyConstraintName: 'FK_step_results_procedure_step',
  })
  procedure_step!: ProcedureStep;

  @Column({ type: 'integer' })
  procedure_step_id!: number;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status!: 'Pending' | 'Done' | 'Skipped' | 'Failed';

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  done_at!: Date | null;
}

// ==================== MEASUREMENT DETAIL ====================

@Entity({ name: 'measurement_details' })
@Unique('UQ_measurement_details_record_point_repeat', ['calibration_record_id', 'test_point_id', 'repeat_no'])
@Index('IDX_measurement_details_test_point_id', ['test_point_id'])
export class MeasurementDetail {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CalibrationRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'calibration_record_id',
    foreignKeyConstraintName: 'FK_measurement_details_calibration_record',
  })
  calibration_record!: CalibrationRecord;

  @Column({ type: 'integer' })
  calibration_record_id!: number;

  @ManyToOne(() => ProcedureTestPoint, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'test_point_id',
    foreignKeyConstraintName: 'FK_measurement_details_test_point',
  })
  test_point!: ProcedureTestPoint;

  @Column({ type: 'integer' })
  test_point_id!: number;

  @Column({ type: 'integer' })
  repeat_no!: number;

  @Column({ type: 'numeric' })
  measured_value!: string;

  @Column({ type: 'numeric' })
  reference_value!: string;

  @Column({ type: 'numeric', insert: false, update: false, nullable: true })
  deviation!: string | null;

  @Column({ type: 'numeric' })
  uncertainty!: string;

  @Column({ type: 'boolean', nullable: true })
  pass_fail!: boolean | null;
}

// ==================== ENTITY REGISTRY ====================

export const entities = [
  Role,
  Customer,
  Account,
  ServiceType,
  Device,
  DeviceOwnershipHistory,
  CalibrationProcedure,
  ServiceRequest,
  ServiceRequestItem,
  Quotation,
  QuotationLineItem,
  Attachment,
  CompanyProfile,
  Contract,
  ContractItem,
  DigitalSignature,
  WorkOrder,
  MasterStandard,
  WorkOrderAssignment,
  InitialInspection,
  ProcedureStep,
  ProcedureParameter,
  ProcedureTestPoint,
  CalibrationRecord,
  StepResult,
  MeasurementDetail,
  ReviewLog,
];