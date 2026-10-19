import { Check, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('accounts')
@Check("CHK_accounts_ref_type", "\"ref_type\" IS NULL OR \"ref_type\" IN ('Customer', 'Staff')")
@Check("CHK_accounts_ref_pair", "(\"ref_type\" IS NULL AND \"ref_id\" IS NULL) OR (\"ref_type\" IS NOT NULL AND \"ref_id\" IS NOT NULL)")
@Check("CHK_accounts_status", "\"status\" IN ('Active', 'Locked')")
@Check("CHK_accounts_failed_login_attempts", "\"failed_login_attempts\" >= 0")
export class Account {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "username", "type": "varchar", "length": 100, "unique": true, "nullable": false })
  username!: string;

  @Column({ "name": "email", "type": "varchar", "length": 255, "unique": true, "nullable": false })
  email!: string;

  @Column({ "name": "password_hash", "type": "varchar", "length": 255, "nullable": false })
  passwordHash!: string;

  @Column({ "name": "role_id", "type": "int", "nullable": false })
  roleId!: number;

  @Column({ "name": "ref_type", "type": "varchar", "length": 20, "nullable": true })
  refType!: string | null;

  @Column({ "name": "ref_id", "type": "int", "nullable": true })
  refId!: number | null;

  @Column({ "name": "is_2fa_enabled", "type": "boolean", "default": false })
  is2faEnabled!: boolean;

  @Column({ "name": "failed_login_attempts", "type": "int", "default": 0 })
  failedLoginAttempts!: number;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Active" })
  status!: string;

  @ManyToOne(() => Role, (role) => role.accounts, { "nullable": false })
  @JoinColumn({ "name": "role_id", "referencedColumnName": "id" })
  role!: Role;

  @OneToMany(() => ServiceRequest, (serviceRequest) => serviceRequest.requestedByAccount)
  serviceRequests!: ServiceRequest[];

  @OneToMany(() => Notification, (notification) => notification.account)
  notifications!: Notification[];

  @OneToMany(() => ChatThread, (chatThread) => chatThread.createdBy)
  createdChatThreads!: ChatThread[];

  @OneToMany(() => ChatParticipant, (chatParticipant) => chatParticipant.account)
  chatParticipants!: ChatParticipant[];

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.senderAccount)
  chatMessages!: ChatMessage[];

}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "code", "type": "varchar", "length": 50, "unique": true, "nullable": false })
  code!: string;

  @Column({ "name": "name", "type": "varchar", "length": 100, "nullable": false })
  name!: string;

  @OneToMany(() => Account, (account) => account.role)
  accounts!: Account[];

}

@Entity('staffs')
export class Staff {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "name", "type": "varchar", "length": 150, "nullable": false })
  name!: string;

  @Column({ "name": "email", "type": "varchar", "length": 255, "nullable": false })
  email!: string;

  @Column({ "name": "wallet_address", "type": "varchar", "length": 255, "nullable": true })
  walletAddress!: string | null;

  @Column({ "name": "department_id", "type": "int", "nullable": false })
  departmentId!: number;

  @ManyToOne(() => Department, (department) => department.staff, { "nullable": false })
  @JoinColumn({ "name": "department_id", "referencedColumnName": "id" })
  department!: Department;

  @OneToMany(() => DeviceOwnershipHistory, (deviceOwnershipHistory) => deviceOwnershipHistory.performedBy)
  ownershipTransfers!: DeviceOwnershipHistory[];

  @OneToMany(() => Department, (department) => department.manager)
  managedDepartments!: Department[];

  @OneToMany(() => WarehouseTransaction, (warehouseTransaction) => warehouseTransaction.handledBy)
  handledWarehouseTransactions!: WarehouseTransaction[];

  @OneToMany(() => WorkOrderAssignment, (workOrderAssignment) => workOrderAssignment.technician)
  workOrderAssignments!: WorkOrderAssignment[];

  @OneToMany(() => WorkOrderAssignment, (workOrderAssignment) => workOrderAssignment.assignedBy)
  assignedWorkOrders!: WorkOrderAssignment[];

  @OneToMany(() => InitialInspection, (initialInspection) => initialInspection.inspectedBy)
  inspections!: InitialInspection[];

  @OneToMany(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.technician)
  calibrationRecords!: CalibrationRecord[];

  @OneToMany(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.reviewer)
  reviewedCalibrationRecords!: CalibrationRecord[];

  @OneToMany(() => ReviewLog, (reviewLog) => reviewLog.reviewer)
  reviews!: ReviewLog[];

  @OneToMany(() => Certificate, (certificate) => certificate.technicianSignature)
  technicianCertificates!: Certificate[];

  @OneToMany(() => Certificate, (certificate) => certificate.headLabSignature)
  issuedCertificates!: Certificate[];

  @OneToMany(() => Seal, (seal) => seal.revokedBy)
  revokedSeals!: Seal[];

  @OneToMany(() => Contract, (contract) => contract.approvedBy)
  approvedContracts!: Contract[];

  @OneToMany(() => CalibrationProcedure, (calibrationProcedure) => calibrationProcedure.createdBy)
  createdProcedures!: CalibrationProcedure[];

  @OneToMany(() => CalibrationProcedure, (calibrationProcedure) => calibrationProcedure.approvedBy)
  approvedProcedures!: CalibrationProcedure[];

}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "company_name", "type": "varchar", "length": 255, "nullable": false })
  companyName!: string;

  @Column({ "name": "tax_code", "type": "varchar", "length": 30, "nullable": true })
  taxCode!: string | null;

  @Column({ "name": "address", "type": "text", "nullable": false })
  address!: string;

  @Column({ "name": "industry", "type": "varchar", "length": 150, "nullable": false })
  industry!: string;

  @Column({ "name": "created_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToMany(() => Device, (device) => device.customer)
  devices!: Device[];

  @OneToMany(() => DeviceOwnershipHistory, (deviceOwnershipHistory) => deviceOwnershipHistory.fromCustomer)
  transfersFrom!: DeviceOwnershipHistory[];

  @OneToMany(() => DeviceOwnershipHistory, (deviceOwnershipHistory) => deviceOwnershipHistory.toCustomer)
  transfersTo!: DeviceOwnershipHistory[];

  @OneToMany(() => ServiceRequest, (serviceRequest) => serviceRequest.customer)
  serviceRequests!: ServiceRequest[];

  @OneToMany(() => Contract, (contract) => contract.customer)
  contracts!: Contract[];

}

@Entity('devices')
@Check("CHK_devices_status", "\"status\" IN ('Active', 'ExpiringSoon', 'Expired', 'InRepair')")
@Check("CHK_devices_calibration_interval", "\"calibration_interval_months\" IS NULL OR \"calibration_interval_months\" > 0")
export class Device {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "customer_id", "type": "int", "nullable": false })
  customerId!: number;

  @Column({ "name": "device_type_id", "type": "int", "nullable": true })
  deviceTypeId!: number | null;

  @Column({ "name": "model", "type": "varchar", "length": 150, "nullable": true })
  model!: string | null;

  @Column({ "name": "manufacturer", "type": "varchar", "length": 150, "nullable": true })
  manufacturer!: string | null;

  @Column({ "name": "serial_number", "type": "varchar", "length": 100, "unique": true, "nullable": true })
  serialNumber!: string | null;

  @Column({ "name": "internal_code", "type": "varchar", "length": 100, "unique": true, "nullable": true })
  internalCode!: string | null;

  @Column({ "name": "calibration_interval_months", "type": "int", "nullable": true })
  calibrationIntervalMonths!: number | null;

  @Column({ "name": "due_date", "type": "date", "nullable": true })
  dueDate!: string | null;

  @Column({ "name": "status", "type": "varchar", "length": 30, "default": "Active" })
  status!: string;

  @ManyToOne(() => Customer, (customer) => customer.devices, { "nullable": false })
  @JoinColumn({ "name": "customer_id", "referencedColumnName": "id" })
  customer!: Customer;

  @ManyToOne(() => DeviceType, (deviceType) => deviceType.devices, { "nullable": true })
  @JoinColumn({ "name": "device_type_id", "referencedColumnName": "id" })
  deviceType!: DeviceType | null;

  @OneToMany(() => DeviceOwnershipHistory, (deviceOwnershipHistory) => deviceOwnershipHistory.device)
  ownershipHistories!: DeviceOwnershipHistory[];

  @OneToMany(() => WarehouseTransaction, (warehouseTransaction) => warehouseTransaction.device)
  warehouseTransactions!: WarehouseTransaction[];

  @OneToMany(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.device)
  serviceRequestItems!: ServiceRequestItem[];

  @OneToMany(() => Seal, (seal) => seal.device)
  seals!: Seal[];

}

@Entity('device_types')
@Check("CHK_device_types_default_service_type", "\"default_service_type\" IN ('Calibration', 'Verification')")
@Check("CHK_device_types_calibration_interval", "\"calibration_interval_months\" IS NULL OR \"calibration_interval_months\" > 0")
export class DeviceType {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "code", "type": "varchar", "length": 100, "unique": true, "nullable": false })
  code!: string;

  @Column({ "name": "name", "type": "varchar", "length": 150, "nullable": false })
  name!: string;

  @Column({ "name": "is_group2", "type": "boolean", "default": false })
  isGroup2!: boolean;

  @Column({ "name": "default_service_type", "type": "varchar", "length": 20, "nullable": false })
  defaultServiceType!: string;

  @Column({ "name": "calibration_interval_months", "type": "int", "nullable": true })
  calibrationIntervalMonths!: number | null;

  @Column({ "name": "inspection_checklist", "type": "jsonb", "default": {  } })
  inspectionChecklist!: unknown;

  @Column({ "name": "field_id", "type": "int", "nullable": false })
  fieldId!: number;

  @ManyToOne(() => CalibrationField, (calibrationField) => calibrationField.deviceTypes, { "nullable": false })
  @JoinColumn({ "name": "field_id", "referencedColumnName": "id" })
  field!: CalibrationField;

  @OneToMany(() => Device, (device) => device.deviceType)
  devices!: Device[];

  @OneToMany(() => ServicePrice, (servicePrice) => servicePrice.deviceType)
  servicePrices!: ServicePrice[];

  @OneToMany(() => CalibrationProcedure, (calibrationProcedure) => calibrationProcedure.deviceType)
  calibrationProcedures!: CalibrationProcedure[];

}

@Entity('device_ownership_histories')
@Check("CHK_device_ownership_histories_reason", "\"reason\" IN ('Sale', 'Liquidation', 'InternalTransfer')")
export class DeviceOwnershipHistory {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "device_id", "type": "int", "nullable": false })
  deviceId!: number;

  @Column({ "name": "from_customer_id", "type": "int", "nullable": false })
  fromCustomerId!: number;

  @Column({ "name": "to_customer_id", "type": "int", "nullable": false })
  toCustomerId!: number;

  @Column({ "name": "reason", "type": "varchar", "length": 40, "nullable": false })
  reason!: string;

  @Column({ "name": "transferred_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  transferredAt!: Date;

  @Column({ "name": "performed_by", "type": "int", "nullable": false })
  performedById!: number;

  @ManyToOne(() => Device, (device) => device.ownershipHistories, { "nullable": false })
  @JoinColumn({ "name": "device_id", "referencedColumnName": "id" })
  device!: Device;

  @ManyToOne(() => Customer, (customer) => customer.transfersFrom, { "nullable": false })
  @JoinColumn({ "name": "from_customer_id", "referencedColumnName": "id" })
  fromCustomer!: Customer;

  @ManyToOne(() => Customer, (customer) => customer.transfersTo, { "nullable": false })
  @JoinColumn({ "name": "to_customer_id", "referencedColumnName": "id" })
  toCustomer!: Customer;

  @ManyToOne(() => Staff, (staff) => staff.ownershipTransfers, { "nullable": false })
  @JoinColumn({ "name": "performed_by", "referencedColumnName": "id" })
  performedBy!: Staff;

}

@Entity('master_standards')
export class MasterStandard {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "name", "type": "varchar", "length": 150, "nullable": false })
  name!: string;

  @Column({ "name": "serial_number", "type": "varchar", "length": 100, "nullable": false })
  serialNumber!: string;

  @Column({ "name": "calibration_expiry", "type": "date", "nullable": false })
  calibrationExpiry!: string;

  @Column({ "name": "accuracy_class", "type": "varchar", "length": 50, "nullable": true })
  accuracyClass!: string | null;

  @Column({ "name": "department_id", "type": "int", "nullable": false })
  departmentId!: number;

  @Column({ "name": "field_id", "type": "int", "nullable": false })
  fieldId!: number;

  @ManyToOne(() => Department, (department) => department.masterStandards, { "nullable": false })
  @JoinColumn({ "name": "department_id", "referencedColumnName": "id" })
  department!: Department;

  @ManyToOne(() => CalibrationField, (calibrationField) => calibrationField.masterStandards, { "nullable": false })
  @JoinColumn({ "name": "field_id", "referencedColumnName": "id" })
  field!: CalibrationField;

  @OneToMany(() => WorkOrderAssignment, (workOrderAssignment) => workOrderAssignment.masterStandard)
  workOrderAssignments!: WorkOrderAssignment[];

  @OneToMany(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.masterStandard)
  calibrationRecords!: CalibrationRecord[];

}

@Entity('warehouse_transactions')
@Check("CHK_warehouse_transactions_type", "\"type\" IN ('Inbound', 'Outbound')")
export class WarehouseTransaction {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "device_id", "type": "int", "nullable": false })
  deviceId!: number;

  @Column({ "name": "service_request_item_id", "type": "int", "nullable": true })
  serviceRequestItemId!: number | null;

  @Column({ "name": "type", "type": "varchar", "length": 20, "nullable": false })
  type!: string;

  @Column({ "name": "condition_note", "type": "text", "nullable": true })
  conditionNote!: string | null;

  @Column({ "name": "photo_ipfs_hash", "type": "varchar", "length": 255, "nullable": true })
  photoIpfsHash!: string | null;

  @Column({ "name": "handled_by", "type": "int", "nullable": false })
  handledById!: number;

  @Column({ "name": "transaction_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  transactionAt!: Date;

  @ManyToOne(() => Device, (device) => device.warehouseTransactions, { "nullable": false })
  @JoinColumn({ "name": "device_id", "referencedColumnName": "id" })
  device!: Device;

  @ManyToOne(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.warehouseTransactions, { "nullable": true })
  @JoinColumn({ "name": "service_request_item_id", "referencedColumnName": "id" })
  serviceRequestItem!: ServiceRequestItem | null;

  @ManyToOne(() => Staff, (staff) => staff.handledWarehouseTransactions, { "nullable": false })
  @JoinColumn({ "name": "handled_by", "referencedColumnName": "id" })
  handledBy!: Staff;

}

@Entity('service_requests')
@Check("CHK_service_requests_location_type", "\"location_type\" IN ('In-lab', 'On-site')")
@Check("CHK_service_requests_status", "\"status\" IN ('New', 'Quoted', 'Confirmed', 'InProgress', 'Completed', 'Cancelled')")
export class ServiceRequest {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "customer_id", "type": "int", "nullable": false })
  customerId!: number;

  @Column({ "name": "requested_by_account_id", "type": "int", "nullable": false })
  requestedByAccountId!: number;

  @Column({ "name": "location_type", "type": "varchar", "length": 20, "nullable": false })
  locationType!: string;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "New" })
  status!: string;

  @Column({ "name": "created_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => Customer, (customer) => customer.serviceRequests, { "nullable": false })
  @JoinColumn({ "name": "customer_id", "referencedColumnName": "id" })
  customer!: Customer;

  @ManyToOne(() => Account, (account) => account.serviceRequests, { "nullable": false })
  @JoinColumn({ "name": "requested_by_account_id", "referencedColumnName": "id" })
  requestedByAccount!: Account;

  @OneToMany(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.serviceRequest)
  items!: ServiceRequestItem[];

  @OneToMany(() => Quotation, (quotation) => quotation.serviceRequest)
  quotations!: Quotation[];

  @OneToMany(() => Payment, (payment) => payment.serviceRequest)
  payments!: Payment[];

  @OneToMany(() => Invoice, (invoice) => invoice.serviceRequest)
  invoices!: Invoice[];

}

@Entity('service_request_items')
@Check("CHK_service_request_items_service_type", "\"service_type\" IN ('Calibration', 'Verification')")
@Check("CHK_service_request_items_status", "\"status\" IN ('Pending', 'Inspected', 'Done', 'Rejected')")
export class ServiceRequestItem {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "service_request_id", "type": "int", "nullable": false })
  serviceRequestId!: number;

  @Column({ "name": "device_id", "type": "int", "nullable": false })
  deviceId!: number;

  @Column({ "name": "service_type", "type": "varchar", "length": 20, "nullable": false })
  serviceType!: string;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Pending" })
  status!: string;

  @Column({ "name": "procedure_id", "type": "int", "nullable": true })
  procedureId!: number | null;

  @ManyToOne(() => ServiceRequest, (serviceRequest) => serviceRequest.items, { "nullable": false })
  @JoinColumn({ "name": "service_request_id", "referencedColumnName": "id" })
  serviceRequest!: ServiceRequest;

  @ManyToOne(() => Device, (device) => device.serviceRequestItems, { "nullable": false })
  @JoinColumn({ "name": "device_id", "referencedColumnName": "id" })
  device!: Device;

  @ManyToOne(() => CalibrationProcedure, (calibrationProcedure) => calibrationProcedure.serviceRequestItems, { "nullable": true })
  @JoinColumn({ "name": "procedure_id", "referencedColumnName": "id" })
  procedure!: CalibrationProcedure | null;

  @OneToMany(() => WarehouseTransaction, (warehouseTransaction) => warehouseTransaction.serviceRequestItem)
  warehouseTransactions!: WarehouseTransaction[];

  @OneToMany(() => QuotationLineItem, (quotationLineItem) => quotationLineItem.serviceRequestItem)
  quotationLineItems!: QuotationLineItem[];

  @OneToMany(() => WorkOrderAssignment, (workOrderAssignment) => workOrderAssignment.serviceRequestItem)
  workOrderAssignments!: WorkOrderAssignment[];

  @OneToMany(() => InitialInspection, (initialInspection) => initialInspection.serviceRequestItem)
  initialInspections!: InitialInspection[];

  @OneToMany(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.serviceRequestItem)
  calibrationRecords!: CalibrationRecord[];

}

@Entity('service_prices')
@Check("CHK_service_prices_service_type", "\"service_type\" IN ('Calibration', 'Verification')")
@Check("CHK_service_prices_location_type", "\"location_type\" IN ('In-lab', 'On-site')")
@Check("CHK_service_prices_price_nonnegative", "\"unit_price\" >= 0")
@Check("CHK_service_prices_effective_range", "\"effective_to\" IS NULL OR \"effective_to\" >= \"effective_from\"")
export class ServicePrice {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "device_type_id", "type": "int", "nullable": false })
  deviceTypeId!: number;

  @Column({ "name": "service_type", "type": "varchar", "length": 20, "nullable": false })
  serviceType!: string;

  @Column({ "name": "location_type", "type": "varchar", "length": 20, "nullable": false })
  locationType!: string;

  @Column({ "name": "unit_price", "type": "decimal", "precision": 15, "scale": 2, "nullable": false })
  unitPrice!: string;

  @Column({ "name": "effective_from", "type": "date", "nullable": false })
  effectiveFrom!: string;

  @Column({ "name": "effective_to", "type": "date", "nullable": true })
  effectiveTo!: string | null;

  @Column({ "name": "is_active", "type": "boolean", "default": true })
  isActive!: boolean;

  @ManyToOne(() => DeviceType, (deviceType) => deviceType.servicePrices, { "nullable": false })
  @JoinColumn({ "name": "device_type_id", "referencedColumnName": "id" })
  deviceType!: DeviceType;

}

@Entity('quotations')
@Check("CHK_quotations_status", "\"status\" IN ('Draft', 'Sent', 'Approved', 'Rejected')")
@Check("CHK_quotations_amounts_nonnegative", "\"travel_fee\" >= 0 AND \"total_amount\" >= 0")
export class Quotation {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "service_request_id", "type": "int", "nullable": false })
  serviceRequestId!: number;

  @Column({ "name": "travel_fee", "type": "decimal", "precision": 15, "scale": 2, "default": 0 })
  travelFee!: string;

  @Column({ "name": "total_amount", "type": "decimal", "precision": 15, "scale": 2, "nullable": false })
  totalAmount!: string;

  @Column({ "name": "estimated_completion_date", "type": "date", "nullable": true })
  estimatedCompletionDate!: string | null;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Draft" })
  status!: string;

  @ManyToOne(() => ServiceRequest, (serviceRequest) => serviceRequest.quotations, { "nullable": false })
  @JoinColumn({ "name": "service_request_id", "referencedColumnName": "id" })
  serviceRequest!: ServiceRequest;

  @OneToMany(() => QuotationLineItem, (quotationLineItem) => quotationLineItem.quotation)
  lineItems!: QuotationLineItem[];

  @OneToMany(() => WorkOrder, (workOrder) => workOrder.quotation)
  workOrders!: WorkOrder[];

  @OneToMany(() => Invoice, (invoice) => invoice.quotation)
  invoices!: Invoice[];

  @OneToMany(() => Contract, (contract) => contract.quotation)
  contracts!: Contract[];

  @Column({ name: 'approved_by_account_id', type: 'int', nullable: true })
  approvedByAccountId!: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'approved_by_account_id', referencedColumnName: 'id' })
  approvedByAccount!: Account | null;

}

@Entity('quotation_line_items')
@Check("CHK_quotation_line_items_unit_price_nonnegative", "\"unit_price\" >= 0")
export class QuotationLineItem {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "quotation_id", "type": "int", "nullable": false })
  quotationId!: number;

  @Column({ "name": "service_request_item_id", "type": "int", "nullable": false })
  serviceRequestItemId!: number;

  @Column({ "name": "description", "type": "varchar", "length": 255, "nullable": false })
  description!: string;

  @Column({ "name": "unit_price", "type": "decimal", "precision": 15, "scale": 2, "nullable": false })
  unitPrice!: string;

  @ManyToOne(() => Quotation, (quotation) => quotation.lineItems, { "nullable": false })
  @JoinColumn({ "name": "quotation_id", "referencedColumnName": "id" })
  quotation!: Quotation;

  @ManyToOne(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.quotationLineItems, { "nullable": false })
  @JoinColumn({ "name": "service_request_item_id", "referencedColumnName": "id" })
  serviceRequestItem!: ServiceRequestItem;

}

@Entity('work_orders')
@Check("CHK_work_orders_status", "\"status\" IN ('Open', 'Assigned', 'InProgress', 'Done', 'Cancelled')")
export class WorkOrder {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "contract_id", "type": "int", "nullable": false })
  contractId!: number;

  @Column({ "name": "quotation_id", "type": "int", "nullable": true })
  quotationId!: number | null;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Open" })
  status!: string;

  @Column({ "name": "created_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => Contract, (contract) => contract.workOrders, { "nullable": false })
  @JoinColumn({ "name": "contract_id", "referencedColumnName": "id" })
  contract!: Contract;

  @ManyToOne(() => Quotation, (quotation) => quotation.workOrders, { "nullable": true })
  @JoinColumn({ "name": "quotation_id", "referencedColumnName": "id" })
  quotation!: Quotation | null;

  @OneToMany(() => WorkOrderAssignment, (workOrderAssignment) => workOrderAssignment.workOrder)
  assignments!: WorkOrderAssignment[];

}

@Entity('work_order_assignments')
@Check("CHK_work_order_assignments_status", "\"status\" IN ('Assigned', 'InProgress', 'Done', 'Cancelled')")
@Check("CHK_work_order_assignments_schedule", "\"scheduled_end\" IS NULL OR \"scheduled_start\" IS NULL OR \"scheduled_end\" >= \"scheduled_start\"")
export class WorkOrderAssignment {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "service_request_item_id", "type": "int", "nullable": false })
  serviceRequestItemId!: number;

  @Column({ "name": "work_order_id", "type": "int", "nullable": false })
  workOrderId!: number;

  @Column({ "name": "technician_id", "type": "int", "nullable": false })
  technicianId!: number;

  @Column({ "name": "master_standard_id", "type": "int", "nullable": false })
  masterStandardId!: number;

  @Column({ "name": "assigned_by", "type": "int", "nullable": false })
  assignedById!: number;

  @Column({ "name": "scheduled_start", "type": "timestamp", "nullable": true })
  scheduledStart!: Date | null;

  @Column({ "name": "scheduled_end", "type": "timestamp", "nullable": true })
  scheduledEnd!: Date | null;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Assigned" })
  status!: string;

  @Column({ "name": "assigned_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  assignedAt!: Date;

  @ManyToOne(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.workOrderAssignments, { "nullable": false })
  @JoinColumn({ "name": "service_request_item_id", "referencedColumnName": "id" })
  serviceRequestItem!: ServiceRequestItem;

  @ManyToOne(() => WorkOrder, (workOrder) => workOrder.assignments, { "nullable": false })
  @JoinColumn({ "name": "work_order_id", "referencedColumnName": "id" })
  workOrder!: WorkOrder;

  @ManyToOne(() => Staff, (staff) => staff.workOrderAssignments, { "nullable": false })
  @JoinColumn({ "name": "technician_id", "referencedColumnName": "id" })
  technician!: Staff;

  @ManyToOne(() => MasterStandard, (masterStandard) => masterStandard.workOrderAssignments, { "nullable": false })
  @JoinColumn({ "name": "master_standard_id", "referencedColumnName": "id" })
  masterStandard!: MasterStandard;

  @ManyToOne(() => Staff, (staff) => staff.assignedWorkOrders, { "nullable": false })
  @JoinColumn({ "name": "assigned_by", "referencedColumnName": "id" })
  assignedBy!: Staff;

}

@Entity('initial_inspections')
@Check("CHK_initial_inspections_result", "\"result\" IN ('Pass', 'Fail')")
export class InitialInspection {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "service_request_item_id", "type": "int", "unique": true, "nullable": false })
  serviceRequestItemId!: number;

  @Column({ "name": "result", "type": "varchar", "length": 10, "nullable": false })
  result!: string;

  @Column({ "name": "defect_note", "type": "text", "nullable": true })
  defectNote!: string | null;

  @Column({ "name": "photo_ipfs_hash", "type": "varchar", "length": 255, "nullable": true })
  photoIpfsHash!: string | null;

  @Column({ "name": "customer_written_consent", "type": "boolean", "default": false })
  customerWrittenConsent!: boolean;

  @Column({ "name": "inspected_by", "type": "int", "nullable": false })
  inspectedById!: number;

  @Column({ "name": "inspected_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  inspectedAt!: Date;

  @Column({ "name": "checklist_result", "type": "jsonb", "default": {  } })
  checklistResult!: unknown;

  @ManyToOne(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.initialInspections, { "nullable": false })
  @JoinColumn({ "name": "service_request_item_id", "referencedColumnName": "id" })
  serviceRequestItem!: ServiceRequestItem;

  @ManyToOne(() => Staff, (staff) => staff.inspections, { "nullable": false })
  @JoinColumn({ "name": "inspected_by", "referencedColumnName": "id" })
  inspectedBy!: Staff;

}

@Entity('calibration_records')
@Check("CHK_calibration_records_result_status", "\"result_status\" IS NULL OR \"result_status\" IN ('Pass', 'Fail')")
@Check("CHK_calibration_records_review_status", "\"review_status\" IN ('Pending', 'Approved', 'Rejected')")
export class CalibrationRecord {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "service_request_item_id", "type": "int", "nullable": false })
  serviceRequestItemId!: number;

  @Column({ "name": "technician_id", "type": "int", "nullable": false })
  technicianId!: number;

  @Column({ "name": "master_standard_id", "type": "int", "nullable": false })
  masterStandardId!: number;

  @Column({ "name": "environment_temp", "type": "decimal", "precision": 6, "scale": 2, "nullable": true })
  environmentTemp!: string | null;

  @Column({ "name": "environment_humidity", "type": "decimal", "precision": 6, "scale": 2, "nullable": true })
  environmentHumidity!: string | null;

  @Column({ "name": "result_status", "type": "varchar", "length": 10, "nullable": true })
  resultStatus!: string | null;

  @Column({ "name": "review_status", "type": "varchar", "length": 10, "default": "Pending" })
  reviewStatus!: string;

  @Column({ "name": "reviewer_id", "type": "int", "nullable": true })
  reviewerId!: number | null;

  @Column({ "name": "measured_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  measuredAt!: Date;

  @Column({ "name": "procedure_id", "type": "int", "nullable": false })
  procedureId!: number;

  @Column({ "name": "result_data", "type": "jsonb", "default": {  } })
  resultData!: unknown;

  @ManyToOne(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.calibrationRecords, { "nullable": false })
  @JoinColumn({ "name": "service_request_item_id", "referencedColumnName": "id" })
  serviceRequestItem!: ServiceRequestItem;

  @ManyToOne(() => Staff, (staff) => staff.calibrationRecords, { "nullable": false })
  @JoinColumn({ "name": "technician_id", "referencedColumnName": "id" })
  technician!: Staff;

  @ManyToOne(() => MasterStandard, (masterStandard) => masterStandard.calibrationRecords, { "nullable": false })
  @JoinColumn({ "name": "master_standard_id", "referencedColumnName": "id" })
  masterStandard!: MasterStandard;

  @ManyToOne(() => Staff, (staff) => staff.reviewedCalibrationRecords, { "nullable": true })
  @JoinColumn({ "name": "reviewer_id", "referencedColumnName": "id" })
  reviewer!: Staff | null;

  @ManyToOne(() => CalibrationProcedure, (calibrationProcedure) => calibrationProcedure.calibrationRecords, { "nullable": false })
  @JoinColumn({ "name": "procedure_id", "referencedColumnName": "id" })
  procedure!: CalibrationProcedure;

  @OneToMany(() => MeasurementDetail, (measurementDetail) => measurementDetail.calibrationRecord)
  measurementDetails!: MeasurementDetail[];

  @OneToMany(() => ReviewLog, (reviewLog) => reviewLog.calibrationRecord)
  reviewLogs!: ReviewLog[];

  @OneToMany(() => Certificate, (certificate) => certificate.calibrationRecord)
  certificates!: Certificate[];

}

@Entity('measurement_details')
@Check("CHK_measurement_details_extra_point_note", "\"template_key\" IS NOT NULL OR \"note\" IS NOT NULL")
export class MeasurementDetail {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "calibration_record_id", "type": "int", "nullable": false })
  calibrationRecordId!: number;

  @Column({ "name": "parameter_name", "type": "varchar", "length": 150, "nullable": false })
  parameterName!: string;

  @Column({ "name": "measured_value", "type": "decimal", "precision": 20, "scale": 8, "nullable": true })
  measuredValue!: string | null;

  @Column({ "name": "reference_value", "type": "decimal", "precision": 20, "scale": 8, "nullable": true })
  referenceValue!: string | null;

  @Column({ "name": "deviation", "type": "decimal", "precision": 20, "scale": 8, "nullable": true })
  deviation!: string | null;

  @Column({ "name": "uncertainty", "type": "decimal", "precision": 20, "scale": 8, "nullable": true })
  uncertainty!: string | null;

  @Column({ "name": "template_key", "type": "varchar", "length": 255, "nullable": true })
  templateKey!: string | null;

  @Column({ "name": "unit", "type": "varchar", "length": 50, "nullable": true })
  unit!: string | null;

  @Column({ "name": "is_within_limit", "type": "boolean", "nullable": true })
  isWithinLimit!: boolean | null;

  @Column({ "name": "note", "type": "text", "nullable": true })
  note!: string | null;

  @ManyToOne(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.measurementDetails, { "nullable": false })
  @JoinColumn({ "name": "calibration_record_id", "referencedColumnName": "id" })
  calibrationRecord!: CalibrationRecord;

}

@Entity('review_logs')
@Check("CHK_review_logs_action", "\"action\" IN ('Approve', 'Reject')")
@Check("CHK_review_logs_reject_reason", "\"action\" <> 'Reject' OR \"reject_reason\" IS NOT NULL")
export class ReviewLog {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "calibration_record_id", "type": "int", "nullable": false })
  calibrationRecordId!: number;

  @Column({ "name": "reviewer_id", "type": "int", "nullable": false })
  reviewerId!: number;

  @Column({ "name": "action", "type": "varchar", "length": 10, "nullable": false })
  action!: string;

  @Column({ "name": "reject_reason", "type": "text", "nullable": true })
  rejectReason!: string | null;

  @Column({ "name": "reviewed_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  reviewedAt!: Date;

  @ManyToOne(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.reviewLogs, { "nullable": false })
  @JoinColumn({ "name": "calibration_record_id", "referencedColumnName": "id" })
  calibrationRecord!: CalibrationRecord;

  @ManyToOne(() => Staff, (staff) => staff.reviews, { "nullable": false })
  @JoinColumn({ "name": "reviewer_id", "referencedColumnName": "id" })
  reviewer!: Staff;

}

@Entity('certificates')
@Check("CHK_certificates_type", "\"cert_type\" IN ('Calibration', 'Verification')")
@Check("CHK_certificates_status", "\"status\" IN ('Draft', 'PendingPayment', 'Released')")
export class Certificate {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "calibration_record_id", "type": "int", "nullable": false })
  calibrationRecordId!: number;

  @Column({ "name": "cert_type", "type": "varchar", "length": 20, "nullable": false })
  certType!: string;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Draft" })
  status!: string;

  @Column({ "name": "technician_signature_id", "type": "int", "nullable": false })
  technicianSignatureId!: number;

  @Column({ "name": "head_lab_signature_id", "type": "int", "nullable": false })
  headLabSignatureId!: number;

  @Column({ "name": "note", "type": "text", "nullable": true })
  note!: string | null;

  @Column({ "name": "issued_at", "type": "timestamp", "nullable": true })
  issuedAt!: Date | null;

  @ManyToOne(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.certificates, { "nullable": false })
  @JoinColumn({ "name": "calibration_record_id", "referencedColumnName": "id" })
  calibrationRecord!: CalibrationRecord;

  @ManyToOne(() => Staff, (staff) => staff.technicianCertificates, { "nullable": false })
  @JoinColumn({ "name": "technician_signature_id", "referencedColumnName": "id" })
  technicianSignature!: Staff;

  @ManyToOne(() => Staff, (staff) => staff.issuedCertificates, { "nullable": false })
  @JoinColumn({ "name": "head_lab_signature_id", "referencedColumnName": "id" })
  headLabSignature!: Staff;

  @OneToMany(() => Seal, (seal) => seal.certificate)
  seals!: Seal[];

}

@Entity('seals')
@Check("CHK_seals_status", "\"status\" IN ('PendingPayment', 'Active', 'Expired', 'Revoked')")
@Check("CHK_seals_due_date", "\"due_date\" IS NULL OR \"due_date\" >= \"cal_date\"")
export class Seal {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "device_id", "type": "int", "nullable": false })
  deviceId!: number;

  @Column({ "name": "certificate_id", "type": "int", "unique": true, "nullable": false })
  certificateId!: number;

  @Column({ "name": "seal_code", "type": "varchar", "length": 100, "unique": true, "nullable": false })
  sealCode!: string;

  @Column({ "name": "cal_date", "type": "date", "nullable": false })
  calDate!: string;

  @Column({ "name": "due_date", "type": "date", "nullable": true })
  dueDate!: string | null;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "PendingPayment" })
  status!: string;

  @Column({ "name": "ipfs_hash", "type": "varchar", "length": 255, "nullable": true })
  ipfsHash!: string | null;

  @Column({ "name": "onchain_tx_hash", "type": "varchar", "length": 255, "nullable": true })
  onchainTxHash!: string | null;

  @Column({ "name": "onchain_seal_id", "type": "varchar", "length": 100, "nullable": true })
  onchainSealId!: string | null;

  @Column({ "name": "revocation_reason", "type": "varchar", "length": 150, "nullable": true })
  revocationReason!: string | null;

  @Column({ "name": "revocation_note", "type": "text", "nullable": true })
  revocationNote!: string | null;

  @Column({ "name": "revoked_by", "type": "int", "nullable": true })
  revokedById!: number | null;

  @Column({ "name": "revoked_at", "type": "timestamp", "nullable": true })
  revokedAt!: Date | null;

  @ManyToOne(() => Device, (device) => device.seals, { "nullable": false })
  @JoinColumn({ "name": "device_id", "referencedColumnName": "id" })
  device!: Device;

  @ManyToOne(() => Certificate, (certificate) => certificate.seals, { "nullable": false })
  @JoinColumn({ "name": "certificate_id", "referencedColumnName": "id" })
  certificate!: Certificate;

  @ManyToOne(() => Staff, (staff) => staff.revokedSeals, { "nullable": true })
  @JoinColumn({ "name": "revoked_by", "referencedColumnName": "id" })
  revokedBy!: Staff | null;

  @OneToMany(() => SmartContractSealEvent, (smartContractSealEvent) => smartContractSealEvent.seal)
  smartContractEvents!: SmartContractSealEvent[];

  @OneToMany(() => SealVerificationLog, (sealVerificationLog) => sealVerificationLog.seal)
  verificationLogs!: SealVerificationLog[];

}

@Entity('smart_contract_seal_events')
@Check("CHK_smart_contract_seal_events_event_type", "\"event_type\" IN ('Minted', 'Revoked')")
export class SmartContractSealEvent {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "seal_id", "type": "int", "nullable": false })
  sealId!: number;

  @Column({ "name": "onchain_seal_id", "type": "varchar", "length": 100, "nullable": false })
  onchainSealId!: string;

  @Column({ "name": "data_hash", "type": "varchar", "length": 255, "nullable": false })
  dataHash!: string;

  @Column({ "name": "technician_wallet", "type": "varchar", "length": 255, "nullable": true })
  technicianWallet!: string | null;

  @Column({ "name": "director_wallet", "type": "varchar", "length": 255, "nullable": true })
  directorWallet!: string | null;

  @Column({ "name": "tx_hash", "type": "varchar", "length": 255, "nullable": false })
  txHash!: string;

  @Column({ "name": "block_number", "type": "varchar", "length": 100, "nullable": true })
  blockNumber!: string | null;

  @Column({ "name": "event_type", "type": "varchar", "length": 20, "nullable": false })
  eventType!: string;

  @Column({ "name": "synced_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  syncedAt!: Date;

  @ManyToOne(() => Seal, (seal) => seal.smartContractEvents, { "nullable": false })
  @JoinColumn({ "name": "seal_id", "referencedColumnName": "id" })
  seal!: Seal;

}

@Entity('seal_verification_logs')
@Check("CHK_seal_verification_logs_result", "\"result\" IN ('Valid', 'Invalid', 'Expired', 'Revoked')")
export class SealVerificationLog {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "seal_id", "type": "int", "nullable": false })
  sealId!: number;

  @Column({ "name": "seal_code", "type": "varchar", "length": 100, "nullable": false })
  sealCode!: string;

  @Column({ "name": "verified_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  verifiedAt!: Date;

  @Column({ "name": "result", "type": "varchar", "length": 20, "nullable": false })
  result!: string;

  @Column({ "name": "source_ip", "type": "varchar", "length": 45, "nullable": true })
  sourceIp!: string | null;

  @ManyToOne(() => Seal, (seal) => seal.verificationLogs, { "nullable": false })
  @JoinColumn({ "name": "seal_id", "referencedColumnName": "id" })
  seal!: Seal;

}

@Entity('contracts')
@Check("CHK_contracts_status", "\"status\" IN ('Draft', 'PendingApproval', 'Approved', 'Active', 'Expired')")
@Check("CHK_contracts_value_nonnegative", "\"contract_value\" >= 0")
@Check("CHK_contracts_term_positive", "\"committed_years\" > 0")
@Check("CHK_contracts_date_range", "\"expire_date\" >= \"start_date\"")
export class Contract {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "contract_code", "type": "varchar", "length": 100, "unique": true, "nullable": false })
  contractCode!: string;

  @Column({ "name": "customer_id", "type": "int", "nullable": false })
  customerId!: number;

  @Column({ name: 'quotation_id', type: 'int', nullable: true })
  quotationId!: number | null;

  @Column({ "name": "title", "type": "varchar", "length": 255, "nullable": false })
  title!: string;

  @Column({ "name": "contract_value", "type": "decimal", "precision": 15, "scale": 2, "nullable": false })
  contractValue!: string;

  @Column({ "name": "start_date", "type": "date", "nullable": false })
  startDate!: string;

  @Column({ "name": "expire_date", "type": "date", "nullable": false })
  expireDate!: string;

  @Column({ "name": "committed_years", "type": "int", "nullable": false })
  committedYears!: number;

  @Column({ "name": "approved_by", "type": "int", "nullable": true })
  approvedById!: number | null;

  @Column({ "name": "approved_at", "type": "timestamp", "nullable": true })
  approvedAt!: Date | null;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Draft" })
  status!: string;

  @ManyToOne(() => Customer, (customer) => customer.contracts, { "nullable": false })
  @JoinColumn({ "name": "customer_id", "referencedColumnName": "id" })
  customer!: Customer;

  @ManyToOne(() => Quotation, (quotation) => quotation.contracts, { nullable: true })
  @JoinColumn({ name: 'quotation_id', referencedColumnName: 'id' })
  quotation!: Quotation | null;

  @ManyToOne(() => Staff, (staff) => staff.approvedContracts, { "nullable": true })
  @JoinColumn({ "name": "approved_by", "referencedColumnName": "id" })
  approvedBy!: Staff | null;

  @OneToMany(() => WorkOrder, (workOrder) => workOrder.contract)
  workOrders!: WorkOrder[];

  @OneToMany(() => Payment, (payment) => payment.contract)
  payments!: Payment[];

}

@Entity('payments')
@Check("CHK_payments_type", "\"payment_type\" IN ('ContractBased', 'OrderBased')")
@Check("CHK_payments_status", "\"status\" IN ('Pending', 'Success', 'Failed')")
@Check("CHK_payments_amount_nonnegative", "\"amount\" >= 0")
@Check("CHK_payments_reference", "(\"payment_type\" = 'ContractBased' AND \"contract_id\" IS NOT NULL AND \"service_request_id\" IS NULL) OR (\"payment_type\" = 'OrderBased' AND \"service_request_id\" IS NOT NULL AND \"contract_id\" IS NULL)")
export class Payment {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "payment_type", "type": "varchar", "length": 20, "nullable": false })
  paymentType!: string;

  @Column({ "name": "contract_id", "type": "int", "nullable": true })
  contractId!: number | null;

  @Column({ "name": "service_request_id", "type": "int", "nullable": true })
  serviceRequestId!: number | null;

  @Column({ "name": "amount", "type": "decimal", "precision": 15, "scale": 2, "nullable": false })
  amount!: string;

  @Column({ "name": "status", "type": "varchar", "length": 10, "default": "Pending" })
  status!: string;

  @Column({ "name": "paid_at", "type": "timestamp", "nullable": true })
  paidAt!: Date | null;

  @ManyToOne(() => Contract, (contract) => contract.payments, { "nullable": true })
  @JoinColumn({ "name": "contract_id", "referencedColumnName": "id" })
  contract!: Contract | null;

  @ManyToOne(() => ServiceRequest, (serviceRequest) => serviceRequest.payments, { "nullable": true })
  @JoinColumn({ "name": "service_request_id", "referencedColumnName": "id" })
  serviceRequest!: ServiceRequest | null;

  @OneToMany(() => WebhookLog, (webhookLog) => webhookLog.relatedPayment)
  webhookLogs!: WebhookLog[];

}

@Entity('invoices')
@Check("CHK_invoices_status", "\"status\" IN ('Unpaid', 'Paid')")
@Check("CHK_invoices_amount_nonnegative", "\"amount\" >= 0")
export class Invoice {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "service_request_id", "type": "int", "nullable": false })
  serviceRequestId!: number;

  @Column({ "name": "quotation_id", "type": "int", "nullable": false })
  quotationId!: number;

  @Column({ "name": "amount", "type": "decimal", "precision": 15, "scale": 2, "nullable": false })
  amount!: string;

  @Column({ "name": "status", "type": "varchar", "length": 10, "default": "Unpaid" })
  status!: string;

  @Column({ "name": "issued_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  issuedAt!: Date;

  @ManyToOne(() => ServiceRequest, (serviceRequest) => serviceRequest.invoices, { "nullable": false })
  @JoinColumn({ "name": "service_request_id", "referencedColumnName": "id" })
  serviceRequest!: ServiceRequest;

  @ManyToOne(() => Quotation, (quotation) => quotation.invoices, { "nullable": false })
  @JoinColumn({ "name": "quotation_id", "referencedColumnName": "id" })
  quotation!: Quotation;

}

@Entity('webhook_logs')
@Check("CHK_webhook_logs_processing_status", "\"processing_status\" IN ('Success', 'Failed')")
export class WebhookLog {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "source", "type": "varchar", "length": 100, "nullable": false })
  source!: string;

  @Column({ "name": "payload", "type": "jsonb", "nullable": false })
  payload!: unknown;

  @Column({ "name": "related_payment_id", "type": "int", "nullable": true })
  relatedPaymentId!: number | null;

  @Column({ "name": "received_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  receivedAt!: Date;

  @Column({ "name": "processing_status", "type": "varchar", "length": 10, "nullable": false })
  processingStatus!: string;

  @ManyToOne(() => Payment, (payment) => payment.webhookLogs, { "nullable": true })
  @JoinColumn({ "name": "related_payment_id", "referencedColumnName": "id" })
  relatedPayment!: Payment | null;

}

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "owner_type", "type": "varchar", "length": 100, "nullable": false })
  ownerType!: string;

  @Column({ "name": "owner_id", "type": "int", "nullable": false })
  ownerId!: number;

  @Column({ "name": "file_name", "type": "varchar", "length": 255, "nullable": false })
  fileName!: string;

  @Column({ "name": "ipfs_hash", "type": "varchar", "length": 255, "nullable": false })
  ipfsHash!: string;

  @Column({ "name": "uploaded_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  uploadedAt!: Date;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.attachment)
  chatMessages!: ChatMessage[];

}

@Entity('notifications')
@Check("CHK_notifications_type", "\"type\" IN ('InspectionFail', 'Quotation', 'Payment', 'DueDate', 'ChatMessage', 'System')")
export class Notification {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "account_id", "type": "int", "nullable": true })
  accountId!: number | null;

  @Column({ "name": "type", "type": "varchar", "length": 30, "nullable": false })
  type!: string;

  @Column({ "name": "title", "type": "varchar", "length": 200, "nullable": false })
  title!: string;

  @Column({ "name": "content", "type": "text", "nullable": false })
  content!: string;

  @Column({ "name": "ref_type", "type": "varchar", "length": 100, "nullable": true })
  refType!: string | null;

  @Column({ "name": "ref_id", "type": "int", "nullable": true })
  refId!: number | null;

  @Column({ "name": "is_read", "type": "boolean", "default": false })
  isRead!: boolean;

  @Column({ "name": "created_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ "name": "read_at", "type": "timestamp", "nullable": true })
  readAt!: Date | null;

  @ManyToOne(() => Account, (account) => account.notifications, { "nullable": true })
  @JoinColumn({ "name": "account_id", "referencedColumnName": "id" })
  account!: Account | null;

}

@Entity('departments')
@Check("CHK_departments_type", "\"type\" IN ('Sales', 'TechnicalLab', 'Accounting', 'Warehouse', 'Management')")
export class Department {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "code", "type": "varchar", "length": 50, "unique": true, "nullable": false })
  code!: string;

  @Column({ "name": "name", "type": "varchar", "length": 150, "nullable": false })
  name!: string;

  @Column({ "name": "type", "type": "varchar", "length": 20, "nullable": false })
  type!: string;

  @Column({ "name": "manager_id", "type": "int", "nullable": true })
  managerId!: number | null;

  @Column({ "name": "parent_department_id", "type": "int", "nullable": true })
  parentDepartmentId!: number | null;

  @Column({ "name": "created_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => Staff, (staff) => staff.managedDepartments, { "nullable": true })
  @JoinColumn({ "name": "manager_id", "referencedColumnName": "id" })
  manager!: Staff | null;

  @ManyToOne(() => Department, (department) => department.childDepartments, { "nullable": true })
  @JoinColumn({ "name": "parent_department_id", "referencedColumnName": "id" })
  parentDepartment!: Department | null;

  @OneToMany(() => Department, (department) => department.parentDepartment)
  childDepartments!: Department[];

  @OneToMany(() => Department, (department) => department.manager)
  managedDepartments!: Department[];

  @OneToMany(() => Staff, (staff) => staff.department)
  staff!: Staff[];

  @OneToMany(() => MasterStandard, (masterStandard) => masterStandard.department)
  masterStandards!: MasterStandard[];

}

@Entity('chat_threads')
@Check("CHK_chat_threads_type", "\"type\" IN ('CustomerSupport', 'ServiceRequestDiscussion', 'CalibrationDispute', 'RepairDiscussion')")
@Check("CHK_chat_threads_status", "\"status\" IN ('Open', 'Closed')")
export class ChatThread {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "type", "type": "varchar", "length": 30, "nullable": false })
  type!: string;

  @Column({ "name": "ref_type", "type": "varchar", "length": 100, "nullable": true })
  refType!: string | null;

  @Column({ "name": "ref_id", "type": "int", "nullable": true })
  refId!: number | null;

  @Column({ "name": "status", "type": "varchar", "length": 10, "default": "Open" })
  status!: string;

  @Column({ "name": "created_by", "type": "int", "nullable": false })
  createdById!: number;

  @Column({ "name": "created_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ "name": "closed_at", "type": "timestamp", "nullable": true })
  closedAt!: Date | null;

  @ManyToOne(() => Account, (account) => account.createdChatThreads, { "nullable": false })
  @JoinColumn({ "name": "created_by", "referencedColumnName": "id" })
  createdBy!: Account;

  @OneToMany(() => ChatParticipant, (chatParticipant) => chatParticipant.chatThread)
  participants!: ChatParticipant[];

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.chatThread)
  messages!: ChatMessage[];

}

@Entity('chat_participants')
@Unique("UQ_chat_participants_thread_account", ["chatThreadId", "accountId"])
export class ChatParticipant {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "chat_thread_id", "type": "int", "nullable": false })
  chatThreadId!: number;

  @Column({ "name": "account_id", "type": "int", "nullable": false })
  accountId!: number;

  @Column({ "name": "last_read_at", "type": "timestamp", "nullable": true })
  lastReadAt!: Date | null;

  @Column({ "name": "joined_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  joinedAt!: Date;

  @Column({ "name": "left_at", "type": "timestamp", "nullable": true })
  leftAt!: Date | null;

  @ManyToOne(() => ChatThread, (chatThread) => chatThread.participants, { "nullable": false })
  @JoinColumn({ "name": "chat_thread_id", "referencedColumnName": "id" })
  chatThread!: ChatThread;

  @ManyToOne(() => Account, (account) => account.chatParticipants, { "nullable": false })
  @JoinColumn({ "name": "account_id", "referencedColumnName": "id" })
  account!: Account;

}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "chat_thread_id", "type": "int", "nullable": false })
  chatThreadId!: number;

  @Column({ "name": "sender_account_id", "type": "int", "nullable": false })
  senderAccountId!: number;

  @Column({ "name": "content", "type": "text", "nullable": false })
  content!: string;

  @Column({ "name": "attachment_id", "type": "int", "nullable": true })
  attachmentId!: number | null;

  @Column({ "name": "sent_at", "type": "timestamp", "default": () => 'CURRENT_TIMESTAMP' })
  sentAt!: Date;

  @ManyToOne(() => ChatThread, (chatThread) => chatThread.messages, { "nullable": false })
  @JoinColumn({ "name": "chat_thread_id", "referencedColumnName": "id" })
  chatThread!: ChatThread;

  @ManyToOne(() => Account, (account) => account.chatMessages, { "nullable": false })
  @JoinColumn({ "name": "sender_account_id", "referencedColumnName": "id" })
  senderAccount!: Account;

  @ManyToOne(() => Attachment, (attachment) => attachment.chatMessages, { "nullable": true })
  @JoinColumn({ "name": "attachment_id", "referencedColumnName": "id" })
  attachment!: Attachment | null;

}

@Entity('calibration_fields')
@Check("CHK_calibration_fields_display_order", "\"display_order\" BETWEEN 1 AND 8")
export class CalibrationField {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "code", "type": "varchar", "length": 30, "unique": true, "nullable": false })
  code!: string;

  @Column({ "name": "name", "type": "varchar", "length": 150, "nullable": false })
  name!: string;

  @Column({ "name": "description", "type": "text", "nullable": true })
  description!: string | null;

  @Column({ "name": "display_order", "type": "int", "nullable": false })
  displayOrder!: number;

  @Column({ "name": "is_active", "type": "boolean", "default": true })
  isActive!: boolean;

  @OneToMany(() => DeviceType, (deviceType) => deviceType.field)
  deviceTypes!: DeviceType[];

  @OneToMany(() => MasterStandard, (masterStandard) => masterStandard.field)
  masterStandards!: MasterStandard[];

}

@Entity('calibration_procedures')
@Check("CHK_calibration_procedures_type", "\"procedure_type\" IN ('Calibration', 'Verification')")
@Check("CHK_calibration_procedures_location", "\"applicable_location\" IN ('In-lab', 'On-site', 'Both')")
@Check("CHK_calibration_procedures_status", "\"status\" IN ('Draft', 'PendingApproval', 'Active', 'Obsolete')")
@Check("CHK_calibration_procedures_standard_ratio", "\"min_standard_ratio\" IS NULL OR \"min_standard_ratio\" > 0")
@Check("CHK_calibration_procedures_effective_range", "\"effective_to\" IS NULL OR \"effective_from\" IS NULL OR \"effective_to\" >= \"effective_from\"")
@Check("CHK_calibration_procedures_approver", "\"approved_by_id\" IS NULL OR \"approved_by_id\" <> \"created_by_id\"")
@Unique("UQ_calibration_procedures_code_version", ["procedureCode", "version"])
export class CalibrationProcedure {
  @PrimaryGeneratedColumn("increment", { "type": "int", "name": "id" })
  id!: number;

  @Column({ "name": "procedure_code", "type": "varchar", "length": 100, "nullable": false })
  procedureCode!: string;

  @Column({ "name": "version", "type": "varchar", "length": 20, "nullable": false })
  version!: string;

  @Column({ "name": "name", "type": "varchar", "length": 255, "nullable": false })
  name!: string;

  @Column({ "name": "device_type_id", "type": "int", "nullable": false })
  deviceTypeId!: number;

  @Column({ "name": "procedure_type", "type": "varchar", "length": 20, "nullable": false })
  procedureType!: string;

  @Column({ "name": "applicable_location", "type": "varchar", "length": 10, "nullable": false })
  applicableLocation!: string;

  @Column({ "name": "reference_document", "type": "varchar", "length": 255, "nullable": true })
  referenceDocument!: string | null;

  @Column({ "name": "min_standard_ratio", "type": "decimal", "precision": 8, "scale": 3, "nullable": true })
  minStandardRatio!: string | null;

  @Column({ "name": "template_schema", "type": "jsonb", "nullable": false })
  templateSchema!: unknown;

  @Column({ "name": "template_engine_version", "type": "varchar", "length": 20, "nullable": false })
  templateEngineVersion!: string;

  @Column({ "name": "status", "type": "varchar", "length": 20, "default": "Draft" })
  status!: string;

  @Column({ "name": "effective_from", "type": "date", "nullable": true })
  effectiveFrom!: string | null;

  @Column({ "name": "effective_to", "type": "date", "nullable": true })
  effectiveTo!: string | null;

  @Column({ "name": "created_by", "type": "int", "nullable": false })
  createdById!: number;

  @Column({ "name": "approved_by", "type": "int", "nullable": true })
  approvedById!: number | null;

  @Column({ "name": "approved_at", "type": "timestamp", "nullable": true })
  approvedAt!: Date | null;

  @ManyToOne(() => DeviceType, (deviceType) => deviceType.calibrationProcedures, { "nullable": false })
  @JoinColumn({ "name": "device_type_id", "referencedColumnName": "id" })
  deviceType!: DeviceType;

  @ManyToOne(() => Staff, (staff) => staff.createdProcedures, { "nullable": false })
  @JoinColumn({ "name": "created_by", "referencedColumnName": "id" })
  createdBy!: Staff;

  @ManyToOne(() => Staff, (staff) => staff.approvedProcedures, { "nullable": true })
  @JoinColumn({ "name": "approved_by", "referencedColumnName": "id" })
  approvedBy!: Staff | null;

  @OneToMany(() => ServiceRequestItem, (serviceRequestItem) => serviceRequestItem.procedure)
  serviceRequestItems!: ServiceRequestItem[];

  @OneToMany(() => CalibrationRecord, (calibrationRecord) => calibrationRecord.procedure)
  calibrationRecords!: CalibrationRecord[];

}

export const entities = [Account, Role, Staff, Customer, Device, DeviceType, DeviceOwnershipHistory, MasterStandard, WarehouseTransaction, ServiceRequest, ServiceRequestItem, ServicePrice, Quotation, QuotationLineItem, WorkOrder, WorkOrderAssignment, InitialInspection, CalibrationRecord, MeasurementDetail, ReviewLog, Certificate, Seal, SmartContractSealEvent, SealVerificationLog, Contract, Payment, Invoice, WebhookLog, Attachment, Notification, Department, ChatThread, ChatParticipant, ChatMessage, CalibrationField, CalibrationProcedure];
