// User types
export type UserRole = 'staff' | 'manager' | 'sr_manager' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'terminated';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  title?: string;
  department?: string;
  costCenter?: string;
  paymentLimit?: number;
  managerName?: string;
  managerEmail?: string;
  lastLoginAt?: string;
  created_at: string;
  last_login_at?: string;
  payment_limit?: number;
  manager_name?: string;
  manager_email?: string;
}

// Payment types
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
  reference_number: string;
  requester_id: string;
  requester_name?: string;
  payee_id?: string;
  payee_name: string;
  amount: number;
  currency: Currency;
  fx_rate?: number;
  usd_equivalent: number;
  account_id: string;
  account_name?: string;
  payment_type: PaymentType;
  funding_type?: FundingType;
  destination_account_id?: string;
  destination_account_name?: string;
  ext_bank_name?: string;
  ext_routing_number?: string;
  ext_bank_account?: string;
  ext_recipient_address?: string;
  ext_special_instructions?: string;
  status: PaymentStatus;
  business_justification: string;
  requested_date: string;
  actual_execution_date?: string;
  bank_reference?: string;
  bank_rejection_reason?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  recurring_end_date?: string;
  attachment_url?: string;
  attachment_name?: string;
  current_approval_step: number;
  total_approval_steps?: number;
  is_duplicate_flagged: boolean;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  executed_at?: string;
  notified_at?: string;
}

export interface CreatePaymentData {
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

// Approval types
export type ApprovalAction = 'pending' | 'approved' | 'rejected' | 'returned' | 'escalated';

export interface PaymentApproval {
  id: string;
  payment_id: string;
  approver_id?: string;
  approver_name?: string;
  approver_role: UserRole;
  step_number: number;
  action: ApprovalAction;
  comment?: string;
  notified_at?: string;
  actioned_at?: string;
  created_at: string;
}

export interface ApprovalComment {
  id: string;
  payment_id: string;
  user_id: string;
  user_name?: string;
  user_role?: UserRole;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

// Account types
export type AccountType = 'checking' | 'savings' | 'payroll' | 'operating';
export type DualControlMode = 'all' | 'wires_only' | 'above_threshold';

export interface Account {
  id: string;
  name: string;
  bank_name: string;
  account_number_masked?: string;
  routing_number_masked?: string;
  account_type: AccountType;
  currency: Currency;
  daily_limit?: number;
  dual_control_required: boolean;
  dual_control_threshold?: number;
  dual_control_mode: DualControlMode;
  is_active: boolean;
}

// Payee types
export interface SavedPayee {
  id: string;
  name: string;
  payment_type: PaymentType;
  bank_name?: string;
  account_number_masked?: string;
  routing_number_masked?: string;
  swift_code?: string;
  country: string;
  currency: Currency;
  is_active: boolean;
}

// Template types
export interface PaymentTemplate {
  id: string;
  user_id: string;
  name: string;
  payee_id?: string;
  payee_name?: string;
  payment_type: PaymentType;
  account_id?: string;
  default_amount?: number;
  currency: Currency;
  default_justification?: string;
  is_shared: boolean;
  usage_count: number;
}

// Routing types
export type TriggerType = 'account' | 'payment_type' | 'amount_range' | 'payee' | 'department' | 'combined';

export interface RoutingRule {
  id: string;
  priority: number;
  name: string;
  description?: string;
  trigger_type: TriggerType;
  account_id?: string;
  account_name?: string;
  payment_type?: PaymentType;
  min_amount?: number;
  max_amount?: number;
  num_approvers: number;
  is_active: boolean;
}

export interface ApprovalChain {
  id: string;
  rule_id: string;
  step: number;
  approver_role?: UserRole;
  specific_approver_id?: string;
  escalation_hours: number;
}

// Calendar types
export interface BankHoliday {
  date: string;
  name: string;
  country: string;
  is_federal: boolean;
}

export interface BatchWindow {
  id: string;
  name: string;
  cutoff_time: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  days_of_week?: number[];
  payment_types?: PaymentType[];
  is_active: boolean;
}

// Dashboard types
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
  payee_name: string;
  total_amount: number;
  payment_count: number;
}

// API response types
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
  warnings?: Array<{ code: string; message: string }>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
