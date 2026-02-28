import { Request } from 'express';

// =====================================================
// USER TYPES
// =====================================================
export type UserRole = 'ap_staff' | 'ap_manager' | 'sr_ap_manager' | 'treasury' | 'cfo' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'terminated';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  workdayId?: string;
  title?: string;
  department?: string;
  costCenter?: string;
  managerName?: string;
  managerEmail?: string;
  pePartnerName?: string;
  pePartnerEmail?: string;
  paymentLimit?: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
}

// =====================================================
// PAYMENT TYPES
// =====================================================
export type PaymentType = 'ach' | 'wire' | 'check' | 'internal';
export type FundingType = 'internal' | 'external';
export type PaymentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'ready_to_execute'
  | 'pending_confirmation'
  | 'executed'
  | 'bank_rejected'
  | 'cancelled';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'SGD' | 'JPY';

export interface Payment {
  id: string;
  referenceNumber: string;
  requesterId: string;
  payeeId?: string;
  payeeName: string;
  amount: number;
  currency: Currency;
  fxRate?: number;
  usdEquivalent: number;
  accountId: string;
  paymentType: PaymentType;
  fundingType?: FundingType;
  destinationAccountId?: string;
  extBankName?: string;
  extRoutingNumber?: string;
  extBankAccount?: string;
  extRecipientAddress?: string;
  extSpecialInstructions?: string;
  status: PaymentStatus;
  businessJustification: string;
  requestedDate: Date;
  actualExecutionDate?: Date;
  bankReference?: string;
  bankRejectionReason?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  recurringEndDate?: Date;
  parentRecurringId?: string;
  templateId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  currentApprovalStep: number;
  totalApprovalSteps?: number;
  routingRuleId?: string;
  isDuplicateFlagged: boolean;
  duplicateReferenceId?: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  executedAt?: Date;
}

export interface CreatePaymentDTO {
  payeeId?: string;
  payeeName: string;
  amount: number;
  currency: Currency;
  accountId: string;
  paymentType: PaymentType;
  fundingType: FundingType;
  destinationAccountId?: string;
  extBankName?: string;
  extRoutingNumber?: string;
  extBankAccount?: string;
  extRecipientAddress?: string;
  extSpecialInstructions?: string;
  businessJustification: string;
  requestedDate: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  recurringEndDate?: string;
  templateId?: string;
}

// =====================================================
// APPROVAL TYPES
// =====================================================
export type ApprovalAction = 'pending' | 'approved' | 'rejected' | 'returned' | 'escalated';

export interface PaymentApproval {
  id: string;
  paymentId: string;
  approverId?: string;
  approverRole: UserRole;
  stepNumber: number;
  action: ApprovalAction;
  comment?: string;
  notifiedAt?: Date;
  actionedAt?: Date;
  escalatedAt?: Date;
  escalatedToId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ApprovalComment {
  id: string;
  paymentId: string;
  approvalId?: string;
  userId: string;
  comment: string;
  isInternal: boolean;
  createdAt: Date;
}

// =====================================================
// EXECUTION TYPES
// =====================================================
export type ConfirmationType = 'primary' | 'secondary';

export interface ExecutionConfirmation {
  id: string;
  paymentId: string;
  confirmerId: string;
  confirmationType: ConfirmationType;
  bankReference?: string;
  actualAmount?: number;
  actualDate?: Date;
  confirmedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isEmergencyHalt: boolean;
  haltReason?: string;
}

// =====================================================
// ACCOUNT TYPES
// =====================================================
export type AccountType = 'checking' | 'savings' | 'payroll' | 'operating';
export type DualControlMode = 'all' | 'wires_only' | 'above_threshold';

export interface Account {
  id: string;
  name: string;
  bankName: string;
  accountNumberEncrypted: Buffer;
  routingNumberEncrypted: Buffer;
  accountType: AccountType;
  currency: Currency;
  dailyLimit?: number;
  dualControlRequired: boolean;
  dualControlThreshold?: number;
  dualControlMode: DualControlMode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountDisplay {
  id: string;
  name: string;
  bankName: string;
  accountNumberMasked: string;
  routingNumberMasked: string;
  accountType: AccountType;
  currency: Currency;
  dailyLimit?: number;
  dualControlRequired: boolean;
  dualControlMode: DualControlMode;
  isActive: boolean;
}

// =====================================================
// PAYEE TYPES
// =====================================================
export interface SavedPayee {
  id: string;
  name: string;
  paymentType: PaymentType;
  bankName?: string;
  routingNumberEncrypted?: Buffer;
  accountNumberEncrypted?: Buffer;
  swiftCode?: string;
  iban?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  currency: Currency;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// ROUTING RULE TYPES
// =====================================================
export type TriggerType = 'account' | 'payment_type' | 'amount_range' | 'payee' | 'department' | 'combined';

export interface RoutingRule {
  id: string;
  priority: number;
  name: string;
  description?: string;
  triggerType: TriggerType;
  accountId?: string;
  paymentType?: PaymentType;
  minAmount?: number;
  maxAmount?: number;
  department?: string;
  payeePattern?: string;
  numApprovers: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalChain {
  id: string;
  ruleId: string;
  step: number;
  approverRole?: UserRole;
  specificApproverId?: string;
  escalationHours: number;
  escalationRole?: UserRole;
  escalationUserId?: string;
  createdAt: Date;
}

// =====================================================
// ACCESS REQUEST TYPES
// =====================================================
export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface AccessRequest {
  id: string;
  email: string;
  requestedRole: UserRole;
  adminId: string;
  workdayData?: Record<string, unknown>;
  managerEmail?: string;
  managerName?: string;
  approvalToken?: string;
  denialToken?: string;
  status: AccessRequestStatus;
  managerResponseAt?: Date;
  denialReason?: string;
  notes?: string;
  expiresAt: Date;
  createdAt: Date;
}

// =====================================================
// TEMPLATE TYPES
// =====================================================
export interface PaymentTemplate {
  id: string;
  userId: string;
  name: string;
  payeeId?: string;
  payeeName?: string;
  paymentType: PaymentType;
  accountId?: string;
  defaultAmount?: number;
  currency: Currency;
  defaultJustification?: string;
  isShared: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// CALENDAR TYPES
// =====================================================
export interface BankHoliday {
  id: string;
  date: Date;
  name: string;
  country: string;
  year: number;
  isFederal: boolean;
  createdAt: Date;
}

export interface BatchWindow {
  id: string;
  name: string;
  cutoffTime: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  paymentTypes?: PaymentType[];
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// AUDIT TYPES
// =====================================================
export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: Date;
}

// =====================================================
// NOTIFICATION TYPES
// =====================================================
export type NotificationChannel = 'email' | 'slack' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface Notification {
  id: string;
  userId?: string;
  paymentId?: string;
  type: string;
  channel: NotificationChannel;
  recipientEmail?: string;
  recipientSlackId?: string;
  subject?: string;
  body?: string;
  templateName?: string;
  templateData?: Record<string, unknown>;
  sentAt?: Date;
  status: NotificationStatus;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
}

// =====================================================
// FX TYPES
// =====================================================
export interface FxRate {
  id: string;
  baseCurrency: Currency;
  targetCurrency: Currency;
  rate: number;
  source: string;
  fetchedAt: Date;
  expiresAt?: Date;
}

// =====================================================
// SETTINGS TYPES
// =====================================================
export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  category?: string;
  updatedBy?: string;
  updatedAt: Date;
}

// =====================================================
// DATABASE ROW TYPES (snake_case matching DB columns)
// =====================================================

// Database row type for payments (snake_case from DB)
export interface PaymentRow {
  id: string;
  reference_number: string;
  requester_id: string;
  payee_id?: string;
  payee_name: string;
  amount: number;
  currency: string;
  fx_rate?: number;
  usd_equivalent: number;
  account_id: string;
  payment_type: string;
  funding_type?: string;
  destination_account_id?: string;
  ext_bank_name?: string;
  ext_routing_number?: string;
  ext_bank_account?: string;
  ext_recipient_address?: string;
  ext_special_instructions?: string;
  status: string;
  business_justification: string;
  requested_date: Date;
  actual_execution_date?: Date;
  bank_reference?: string;
  bank_rejection_reason?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  recurring_end_date?: Date;
  parent_recurring_id?: string;
  template_id?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  current_approval_step: number;
  total_approval_steps?: number;
  routing_rule_id?: string;
  is_duplicate_flagged: boolean;
  duplicate_reference_id?: string;
  created_at: Date;
  updated_at: Date;
  submitted_at?: Date;
  executed_at?: Date;
}

// Database row type for routing rules
export interface RoutingRuleRow {
  id: string;
  priority: number;
  name: string;
  description?: string;
  trigger_type: string;
  account_id?: string;
  payment_type?: string;
  min_amount?: number;
  max_amount?: number;
  department?: string;
  payee_pattern?: string;
  num_approvers: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Database row type for approval chains
export interface ApprovalChainRow {
  id: string;
  rule_id: string;
  step: number;
  approver_role?: string;
  specific_approver_id?: string;
  escalation_hours: number;
  escalation_role?: string;
  escalation_user_id?: string;
  created_at: Date;
}

// Database row type for payment approvals
export interface PaymentApprovalRow {
  id: string;
  payment_id: string;
  approver_id?: string;
  approver_role: string;
  step_number: number;
  action: string;
  comment?: string;
  notified_at?: Date;
  actioned_at?: Date;
  escalated_at?: Date;
  escalated_to_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Database row type for accounts
export interface AccountRow {
  id: string;
  name: string;
  bank_name: string;
  account_number_encrypted: Buffer;
  routing_number_encrypted: Buffer;
  account_type: string;
  currency: string;
  daily_limit?: number;
  dual_control_required: boolean;
  dual_control_threshold?: number;
  dual_control_mode: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Database row type for users
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  workday_id?: string;
  title?: string;
  department?: string;
  cost_center?: string;
  manager_name?: string;
  manager_email?: string;
  pe_partner_name?: string;
  pe_partner_email?: string;
  payment_limit?: number;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// DASHBOARD TYPES
// =====================================================
export interface DashboardSummary {
  mtdPaymentsCount: number;
  mtdPaymentsAmount: number;
  pendingApprovalsCount: number;
  readyToExecuteCount: number;
  onTimeRate: number;
  escalationsCount: number;
}

export interface PaymentVolumeData {
  date: string;
  count: number;
  amount: number;
}

export interface TopVendor {
  payeeName: string;
  totalAmount: number;
  paymentCount: number;
}

export interface ApprovalPipelineData {
  status: string;
  count: number;
}
