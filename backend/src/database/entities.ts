
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

// ==================== ROLE ====================

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @OneToMany(() => Account, (account) => account.role)
  accounts!: Account[];
}

// ==================== CUSTOMER ====================

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  company_name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_code!: string | null;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 100 })
  industry!: string;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_sales_id' })
  assigned_sales!: Account | null;

  @Column({ type: 'integer', nullable: true })
  assigned_sales_id!: number | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by' })
  assigned_by_account!: Account | null;

  @Column({ type: 'integer', nullable: true })
  assigned_by!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  assigned_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @OneToMany(() => Account, (account) => account.customer)
  accounts!: Account[];

  @OneToMany(() => Device, (device) => device.customer)
  devices!: Device[];

  @OneToMany(
    () => ServiceRequest,
    (serviceRequest) => serviceRequest.customer,
  )
  service_requests!: ServiceRequest[];
}

// ==================== ACCOUNT ====================

@Entity({ name: 'accounts' })
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Role, (role) => role.accounts, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ type: 'integer' })
  role_id!: number;

  @ManyToOne(() => Customer, (customer) => customer.accounts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  @Column({ type: 'integer', nullable: true })
  customer_id!: number | null;

  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'boolean', default: false })
  is_2fa_enabled!: boolean;

  @Column({ type: 'integer', default: 0 })
  failed_login_attempts!: number;

  @OneToMany(
    () => ServiceRequest,
    (serviceRequest) => serviceRequest.created_by_account,
  )
  created_service_requests!: ServiceRequest[];
}

// ==================== SERVICE TYPE ====================

@Entity({ name: 'service_types' })
@Index('IDX_service_types_field', ['field'])
@Index('IDX_service_types_status', ['status'])
@Unique('service_types_standard_code_key', ['standard_code'])
@Check('service_types_kind_check', `"kind" IN ('Calibration', 'Verification', 'Repair')`)
@Check(
  'service_types_field_check',
  `"field" IN ('DIEN', 'KHOILUONG', 'DODAI', 'APSUAT', 'NHIET', 'HOA', 'QUANG', 'DET')`,
)
@Check('service_types_status_check', `"status" IN ('Active', 'Inactive')`)
export class ServiceType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: string;

  @Column({ type: 'varchar', length: 20 })
  field!: string;

  @Column({ type: 'varchar', length: 100 })
  standard_code!: string;

  @Column({ type: 'text', nullable: true })
  measuring_range!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Active' })
  status!: string;

  @OneToMany(
    () => ServiceRequestItem,
    (item) => item.service_type,
  )
  service_request_items!: ServiceRequestItem[];

 

  @OneToMany(
    () => CalibrationProcedure,
    (procedure) => procedure.service_type,
  )
  calibration_procedures!: CalibrationProcedure[];
}

// ==================== DEVICE ====================

@Entity({ name: 'devices' })
@Index('IDX_devices_customer_id', ['customer_id'])
@Index('IDX_devices_status', ['status'])
@Index('UQ_devices_serial_number', ['serial_number'], {
  unique: true,
  where: `"serial_number" IS NOT NULL AND "serial_number" <> ''`,
})
@Check(
  'devices_status_check',
  `"status" IN ('Active', 'ExpiringSoon', 'Expired', 'InRepair')`,
)
export class Device {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Customer, (customer) => customer.devices, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_devices_customer' })
  customer!: Customer;

  @Column({ type: 'integer' })
  customer_id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  model!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  manufacturer!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number!: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  internal_code!: string;

  @Column({ type: 'text', nullable: true })
  measuring_range!: string | null;

  @Column({ type: 'boolean', default: false })
  is_group2!: boolean;

  @Column({ type: 'date', nullable: true })
  next_due_date!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Active' })
  status!: string;

  @OneToMany(
    () => ServiceRequestItem,
    (item) => item.device,
  )
  service_request_items!: ServiceRequestItem[];

  @OneToMany(
    () => DeviceOwnershipHistory,
    (history) => history.device,
  )
  ownership_histories!: DeviceOwnershipHistory[];
}

// ==================== DEVICE OWNERSHIP HISTORY ====================

@Entity({ name: 'device_ownership_histories' })
@Index('IDX_device_ownership_histories_device_id', ['device_id'])
@Index('IDX_device_ownership_histories_prev_customer', ['previous_customer_id'])
@Index('IDX_device_ownership_histories_new_customer', ['new_customer_id'])
export class DeviceOwnershipHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  device_id!: number;

  @ManyToOne(() => Device, (device) => device.ownership_histories, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'device_id', foreignKeyConstraintName: 'FK_device_ownership_histories_device' })
  device!: Device;

  @Column({ type: 'integer', nullable: true })
  previous_customer_id!: number | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'previous_customer_id',
    foreignKeyConstraintName: 'FK_device_ownership_histories_prev_customer',
  })
  previous_customer!: Customer | null;

  @Column({ type: 'integer' })
  new_customer_id!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'new_customer_id',
    foreignKeyConstraintName: 'FK_device_ownership_histories_new_customer',
  })
  new_customer!: Customer;

  @Column({ type: 'integer', nullable: true })
  transferred_by!: number | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'transferred_by',
    foreignKeyConstraintName: 'FK_device_ownership_histories_transferred_by',
  })
  transferred_by_account!: Account | null;

  @CreateDateColumn({ type: 'timestamptz' })
  transferred_at!: Date;

  @Column({ type: 'text' })
  transfer_reason!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Completed' })
  status!: string;
}

// ==================== DEVICE TYPE ====================



// ==================== CALIBRATION PROCEDURE ====================

@Entity({ name: 'calibration_procedures' })
@Index('IDX_calibration_procedures_service_type_id', ['service_type_id'])
@Index('IDX_calibration_procedures_status', ['status'])
@Index('UQ_calibration_procedures_one_active', ['service_type_id'], {
  unique: true,
  where: `"status" = 'Active'`,
})
@Unique(
  'UQ_calibration_procedures_service_version',
  ['service_type_id', 'version'],
)
@Check(
  'CHK_calibration_procedures_status',
  `"status" IN ('Draft', 'Active', 'Obsolete')`,
)
export class CalibrationProcedure {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => ServiceType,
    (serviceType) => serviceType.calibration_procedures,
    { nullable: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  )
  @JoinColumn({
    name: 'service_type_id',
    foreignKeyConstraintName: 'FK_calibration_procedures_service_type',
  })
  service_type!: ServiceType;

  @Column({ type: 'integer' })
  service_type_id!: number;

  @Column({ type: 'varchar', length: 20 })
  version!: string;

  @Column({ type: 'jsonb', nullable: true })
  environment_requirement!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  required_equipment!: Record<string, unknown> | null;

  @Column({ type: 'date', nullable: true })
  effective_from!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Draft' })
  status!: string;

}

// ==================== SERVICE REQUEST ====================

@Entity({ name: 'service_requests' })
@Index('IDX_service_requests_customer_id', ['customer_id'])
@Index('IDX_service_requests_created_by', ['created_by'])
@Check(
  'service_requests_location_type_check',
  `"location_type" IN ('In-lab', 'On-site')`,
)
@Check(
  'service_requests_status_check',
  `"status" IN ('New', 'Quoted', 'Confirmed', 'InProgress', 'Completed', 'Cancelled')`,
)
export class ServiceRequest {
  @Column({ type: 'varchar', length: 50, nullable: true })
  request_code!: string | null;
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => Customer,
    (customer) => customer.service_requests,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_service_requests_customer' })
  customer!: Customer;

  @Column({ type: 'integer' })
  customer_id!: number;

  @ManyToOne(
    () => Account,
    (account) => account.created_service_requests,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'FK_service_requests_created_by' })
  created_by_account!: Account;

  @Column({ type: 'integer' })
  created_by!: number;

  @Column({ type: 'varchar', length: 20 })
  location_type!: string;

  @Column({ type: 'date', nullable: true })
  preferred_date!: string | null;

  @Column({ type: 'text', nullable: true })
  special_notes!: string | null;

  @Column({ type: 'text', nullable: true })
  accessories_note!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'New' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(
    () => ServiceRequestItem,
    (item) => item.service_request,
  )
  items!: ServiceRequestItem[];

  @OneToMany(
    () => Quotation,
    (quotation) => quotation.service_request,
  )
  quotations!: Quotation[];

  @OneToMany(
    () => Attachment,
    (attachment) => attachment.service_request,
  )
  attachments!: Attachment[];
}

// ==================== SERVICE REQUEST ITEM ====================

@Entity({ name: 'service_request_items' })
@Index('IDX_service_request_items_service_request_id', ['service_request_id'])
@Index('IDX_service_request_items_device_id', ['device_id'])
@Index('IDX_service_request_items_service_type_id', ['service_type_id'])
@Check(
'service_request_items_status_check',
`"status" IN ('Pending', 'Inspected', 'Done', 'Rejected')`,
)
export class ServiceRequestItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => ServiceRequest,
    (serviceRequest) => serviceRequest.items,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({
    name: 'service_request_id',
    foreignKeyConstraintName: 'FK_service_request_items_service_request',
  })
  service_request!: ServiceRequest;

  @Column({ type: 'integer' })
  service_request_id!: number;

  @ManyToOne(
    () => Device,
    (device) => device.service_request_items,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'device_id', foreignKeyConstraintName: 'FK_service_request_items_device' })
  device!: Device;

  @Column({ type: 'integer' })
  device_id!: number;

  @ManyToOne(
    () => ServiceType,
    (serviceType) => serviceType.service_request_items,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'service_type_id', foreignKeyConstraintName: 'FK_service_request_items_service_type' })
  service_type!: ServiceType;

  @Column({ type: 'integer' })
  service_type_id!: number;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status!: string;

  @OneToMany(
    () => QuotationLineItem,
    (lineItem) => lineItem.service_request_item,
  )
  quotation_line_items!: QuotationLineItem[];
}

// ==================== QUOTATION ====================

@Entity({ name: 'quotations' })
@Index('IDX_quotations_service_request_id', ['service_request_id'])
@Index('IDX_quotations_status', ['status'])
@Check('quotations_subtotal_check', '"subtotal" >= 0')
@Check('quotations_discount_amount_check', '"discount_amount" >= 0')
@Check('quotations_travel_fee_check', '"travel_fee" >= 0')
@Check('quotations_total_amount_check', '"total_amount" >= 0')
@Check('CHK_quotations_discount_not_exceed_subtotal', '"discount_amount" <= "subtotal"')
@Check(
  'CHK_quotations_total_amount',
  '"total_amount" = "subtotal" - "discount_amount" + "travel_fee"',
)
@Check(
  'quotations_status_check',
  `"status" IN ('Draft', 'PendingApproval', 'Sent', 'Approved', 'Rejected')`,
)
export class Quotation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => ServiceRequest,
    (serviceRequest) => serviceRequest.quotations,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({
    name: 'service_request_id',
    foreignKeyConstraintName: 'FK_quotations_service_request',
  })
  service_request!: ServiceRequest;

  @Column({ type: 'integer' })
  service_request_id!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  subtotal!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  discount_amount!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  travel_fee!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  total_amount!: string;

  @Column({ type: 'date', nullable: true })
  estimated_completion_date!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'Draft' })
  status!: string;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  created_by_account!: Account | null;

  @Column({ type: 'integer', nullable: true })
  created_by!: number | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'head_sales_reviewed_by' })
  head_sales_reviewer!: Account | null;

  @Column({ type: 'integer', nullable: true })
  head_sales_reviewed_by!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  head_sales_reviewed_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  head_sales_note!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  head_sales_decision!: string | null;

  @Column({ type: 'text', nullable: true })
  customer_reject_reason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  customer_responded_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  sales_submission_note!: string | null;

  @Column({ type: 'integer', default: 0 })
  submission_count!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  last_rejected_total!: string | null;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  last_rejected_discount!: string | null;

  @OneToMany(
    () => QuotationLineItem,
    (lineItem) => lineItem.quotation,
  )
  line_items!: QuotationLineItem[];
}

// ==================== QUOTATION LINE ITEM ====================

@Entity({ name: 'quotation_line_items' })
@Unique(
  'uq_quotation_line_items_quotation_request_item',
  ['quotation_id', 'service_request_item_id'],
)
@Index('idx_quotation_line_items_quotation_id', ['quotation_id'])
@Index(
  'idx_quotation_line_items_service_request_item_id',
  ['service_request_item_id'],
)
@Check(
  'chk_quotation_line_items_unit_price',
  '"unit_price" >= 0',
)
@Check(
  'chk_quotation_line_items_discount',
  '"discount_amount" >= 0 AND "discount_amount" <= "unit_price"',
)
export class QuotationLineItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => Quotation,
    (quotation) => quotation.line_items,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'quotation_id', foreignKeyConstraintName: 'fk_quotation_line_items_quotation' })
  quotation!: Quotation;

  @Column({ type: 'integer' })
  quotation_id!: number;

  @ManyToOne(
    () => ServiceRequestItem,
    (item) => item.quotation_line_items,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({
    name: 'service_request_item_id',
    foreignKeyConstraintName: 'fk_quotation_line_items_service_request_item',
  })
  service_request_item!: ServiceRequestItem;

  @Column({ type: 'integer' })
  service_request_item_id!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  unit_price!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  discount_amount!: string;
}

// ==================== ATTACHMENT ====================

@Entity({ name: 'attachments' })
@Index('idx_attachments_service_request_id', ['service_request_id'])
export class Attachment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => ServiceRequest,
    (serviceRequest) => serviceRequest.attachments,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({
    name: 'service_request_id',
    foreignKeyConstraintName: 'fk_attachments_service_request',
  })
  service_request!: ServiceRequest;

  @Column({ type: 'integer' })
  service_request_id!: number;

  @Column({ type: 'varchar', length: 255 })
  file_name!: string;

  @Column({ type: 'text' })
  file_url!: string;

  @CreateDateColumn({ type: 'timestamp' })
  uploaded_at!: Date;
}

// ==================== COMPANY PROFILE (Bên B) ====================

@Entity({ name: 'company_profiles' })
export class CompanyProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  representative!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fax!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_code!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_account!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank_name!: string | null;

  @Column({ type: 'boolean', default: false })
  is_default!: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;
}

// ==================== CONTRACT ====================

@Entity({ name: 'contracts' })
@Unique('UQ_contracts_contract_code', ['contract_code'])
@Index('IDX_contracts_customer_id', ['customer_id'])
@Index('IDX_contracts_status', ['status'])
export class Contract {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  contract_code!: string;

  @Column({ type: 'varchar', length: 20, default: 'Service' })
  contract_type!: string;

  @ManyToOne(() => Quotation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'quotation_id',
    foreignKeyConstraintName: 'FK_contracts_quotation',
  })
  quotation!: Quotation | null;

  @Column({ type: 'integer', nullable: true })
  quotation_id!: number | null;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_contracts_customer',
  })
  customer!: Customer;

  @Column({ type: 'integer' })
  customer_id!: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  title!: string;

  @Column({ type: 'date', nullable: true })
  sign_date!: string | null;

  @Column({ type: 'date', nullable: true })
  start_date!: string | null;

  @Column({ type: 'date', nullable: true })
  end_date!: string | null;

  @Column({ type: 'integer', nullable: true })
  duration_days!: number | null;

  @Column({ type: 'text', nullable: true })
  location!: string | null;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  subtotal!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  discount_amount!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  travel_fee!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  tax_amount!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  total_amount!: string;

  @Column({ type: 'text', nullable: true })
  total_in_words!: string | null;

  @Column({ type: 'integer', default: 30 })
  payment_term_days!: number;

  @Column({ type: 'text', nullable: true })
  legal_basis!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Draft' })
  status!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  party_a_name!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  party_a_representative!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  party_a_position!: string | null;

  @Column({ type: 'text', nullable: true })
  party_a_address!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  party_a_phone!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  party_a_fax!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  party_a_tax_code!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  party_a_bank_account!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  party_a_bank_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  party_a_budget_code!: string | null;

  @Column({ type: 'varchar', length: 255, default: '' })
  party_b_name!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  party_b_representative!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  party_b_position!: string | null;

  @Column({ type: 'text', nullable: true })
  party_b_address!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  party_b_phone!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  party_b_fax!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  party_b_tax_code!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  party_b_bank_account!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  party_b_bank_name!: string | null;

  @Column({ type: 'integer' })
  created_by!: number;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at!: Date | null;

  @Column({ type: 'integer', nullable: true })
  approved_by!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at!: Date | null;

  @Column({ type: 'integer', nullable: true })
  liquidated_by!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  liquidated_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  draft_file_url!: string | null;

  @Column({ type: 'text', nullable: true })
  signed_file_url!: string | null;

  @Column({ type: 'integer', nullable: true })
  committed_years!: number | null;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  credit_limit!: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;

  @OneToMany(() => ContractItem, (item) => item.contract)
  items!: ContractItem[];
}

// ==================== CONTRACT ITEM ====================

@Entity({ name: 'contract_items' })
@Index('IDX_contract_items_contract_id', ['contract_id'])
export class ContractItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Contract, (contract) => contract.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'contract_id',
    foreignKeyConstraintName: 'FK_contract_items_contract',
  })
  contract!: Contract;

  @Column({ type: 'integer' })
  contract_id!: number;

  @Column({ type: 'integer', nullable: true })
  service_request_item_id!: number | null;

  @Column({ type: 'integer', nullable: true })
  quotation_line_item_id!: number | null;

  @Column({ type: 'integer', default: 1 })
  line_no!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  execution_time!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 1 })
  quantity!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit!: string | null;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  unit_price!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  discount_amount!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 5 })
  tax_rate!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  tax_amount!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}

// ==================== DIGITAL SIGNATURE ====================

@Entity({ name: 'digital_signatures' })
@Index('IDX_digital_signatures_contract_id', ['contract_id'])
@Index('IDX_digital_signatures_calibration_record_id', ['calibration_record_id'])
@Index('IDX_digital_signatures_status', ['status'])
export class DigitalSignature {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'contract_id',
    foreignKeyConstraintName: 'FK_digital_signatures_contract',
  })
  contract!: Contract | null;

  @Column({ type: 'integer', nullable: true })
  contract_id!: number | null;

  @Column({ type: 'integer', nullable: true })
  calibration_record_id!: number | null;

  @Column({ type: 'varchar', length: 30 })
  purpose!: string;

  @Column({ type: 'integer' })
  signer_id!: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  signer_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_transaction_id!: string | null;

  @Column({ type: 'varchar', length: 255 })
  document_hash!: string;

  @Column({ type: 'text', nullable: true })
  signature_value!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  signature_metadata!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  signed_file_url!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  signed_at!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}

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

@Entity({ name: 'masterstandard' })
@Index('IDX_masterstandard_assignment', ['status', 'calibration_expiry'])
export class MasterStandard {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  serial_number!: string;

  @Column({ type: 'varchar', length: 50 })
  accuracy_class!: string;

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
@Unique('UQ_procedure_steps_procedure_step_no', ['procedure_id', 'step_no'])
export class ProcedureStep {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CalibrationProcedure, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'procedure_id',
    foreignKeyConstraintName: 'FK_procedure_steps_procedure',
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

  @ManyToOne(() => CalibrationProcedure, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'procedure_id',
    foreignKeyConstraintName: 'FK_procedure_parameters_procedure',
  })
  procedure!: CalibrationProcedure;

  @Column({ type: 'integer' })
  procedure_id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  unit!: string;

  @Column({ type: 'integer' })
  repeat_count!: number;

  @Column({ type: 'varchar', length: 20 })
  calculation_method!: 'mean' | 'stdev' | 'max' | 'min' | 'sum' | 'abs';
}

// ==================== PROCEDURE TEST POINT ====================

@Entity({ name: 'procedure_test_points' })
@Unique('UQ_procedure_test_points_parameter_point_no', ['parameter_id', 'point_no'])
export class ProcedureTestPoint {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ProcedureParameter, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'parameter_id',
    foreignKeyConstraintName: 'FK_procedure_test_points_parameter',
  })
  parameter!: ProcedureParameter;

  @Column({ type: 'integer' })
  parameter_id!: number;

  @Column({ type: 'integer' })
  point_no!: number;

  @Column({ type: 'numeric' })
  nominal_value!: string;

  @Column({ type: 'numeric', nullable: true })
  tolerance!: string | null;

  @Column({ type: 'numeric' })
  max_uncertainty!: string;
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
