
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
  `"status" IN ('Draft', 'Sent', 'Approved', 'Rejected')`,
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

  @Column({ type: 'varchar', length: 20, default: 'Draft' })
  status!: string;

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
@Index('IDX_digital_signatures_status', ['status'])
export class DigitalSignature {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Contract, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'contract_id',
    foreignKeyConstraintName: 'FK_digital_signatures_contract',
  })
  contract!: Contract;

  @Column({ type: 'integer' })
  contract_id!: number;

  @Column({ type: 'varchar', length: 30 })
  purpose!: string;

  @Column({ type: 'integer' })
  signer_id!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_transaction_id!: string | null;

  @Column({ type: 'varchar', length: 255 })
  document_hash!: string;

  @Column({ type: 'text', nullable: true })
  signed_file_url!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  signed_at!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
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
];
