
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
    () => ServiceTypeDeviceType,
    (link) => link.service_type,
  )
  device_type_links!: ServiceTypeDeviceType[];

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
@Index('IDX_devices_device_type_id', ['device_type_id'])
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

  @ManyToOne(
    () => DeviceType,
    (deviceType) => deviceType.devices,
    { nullable: true, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  )
  @JoinColumn({
    name: 'device_type_id',
    foreignKeyConstraintName: 'FK_devices_device_type',
  })
  device_type!: DeviceType | null;

  @Column({ type: 'integer', nullable: true })
  device_type_id!: number | null;

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
}

// ==================== DEVICE TYPE ====================

@Entity({ name: 'device_types' })
@Unique('UQ_device_types_code', ['code'])
@Check('CHK_device_types_status', `"status" IN ('Active', 'Inactive')`)
export class DeviceType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Active' })
  status!: string;

  @OneToMany(() => Device, (device) => device.device_type)
  devices!: Device[];

  @OneToMany(
    () => ServiceTypeDeviceType,
    (link) => link.device_type,
  )
  service_type_links!: ServiceTypeDeviceType[];
}

// ==================== SERVICE TYPE / DEVICE TYPE LINK ====================

@Entity({ name: 'service_type_device_types' })
@Index('IDX_stdt_device_type_id', ['device_type_id'])
export class ServiceTypeDeviceType {
  @PrimaryColumn({
    type: 'integer',
    name: 'service_type_id',
    primaryKeyConstraintName: 'PK_service_type_device_types',
  })
  service_type_id!: number;

  @ManyToOne(
    () => ServiceType,
    (serviceType) => serviceType.device_type_links,
    { nullable: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  )
  @JoinColumn({
    name: 'service_type_id',
    foreignKeyConstraintName: 'FK_stdt_service_type',
  })
  service_type!: ServiceType;

  @PrimaryColumn({
    type: 'integer',
    name: 'device_type_id',
    primaryKeyConstraintName: 'PK_service_type_device_types',
  })
  device_type_id!: number;

  @ManyToOne(
    () => DeviceType,
    (deviceType) => deviceType.service_type_links,
    { nullable: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  )
  @JoinColumn({
    name: 'device_type_id',
    foreignKeyConstraintName: 'FK_stdt_device_type',
  })
  device_type!: DeviceType;
}

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

// ==================== ENTITY REGISTRY ====================

export const entities = [
  Role,
  Customer,
  Account,
  ServiceType,
  Device,
  DeviceType,
  ServiceTypeDeviceType,
  CalibrationProcedure,
  ServiceRequest,
  ServiceRequestItem,
  Quotation,
  QuotationLineItem,
  Attachment,
];
