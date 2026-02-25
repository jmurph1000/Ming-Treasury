import type {
  ApiResponse,
  User,
  Payment,
  CreatePaymentData,
  PaymentApproval,
  Account,
  SavedPayee,
  PaymentTemplate,
  RoutingRule,
  DashboardSummary,
  PaymentVolumeData,
  TopVendor,
  BankHoliday,
  PaginationParams,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || 'An error occurred',
      response.status,
      data.error
    );
  }

  return data;
}

// Auth
export const authApi = {
  login: (email: string, oktaToken?: string) =>
    fetchApi<{ user: User; accessToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, oktaToken }),
    }),

  logout: () =>
    fetchApi<void>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    fetchApi<User>('/api/auth/me'),

  validateAccessToken: (token: string) =>
    fetchApi<{ action: string; email: string; requestedRole: string }>(`/api/auth/access/${token}`),

  respondToAccess: (token: string, reason?: string) =>
    fetchApi<void>(`/api/auth/access/${token}/respond`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// Payments
export const paymentsApi = {
  list: (params?: PaginationParams & {
    status?: string;
    paymentType?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    minAmount?: number;
    maxAmount?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    return fetchApi<Payment[]>(`/api/payments?${searchParams}`);
  },

  get: (id: string) =>
    fetchApi<Payment & { approvals: PaymentApproval[]; comments: any[] }>(`/api/payments/${id}`),

  create: (data: CreatePaymentData) =>
    fetchApi<Payment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreatePaymentData>) =>
    fetchApi<Payment>(`/api/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  submit: (id: string) =>
    fetchApi<{ routingRule: string; approvalSteps: number }>(`/api/payments/${id}/submit`, {
      method: 'POST',
    }),

  cancel: (id: string) =>
    fetchApi<void>(`/api/payments/${id}/cancel`, { method: 'POST' }),

  checkDuplicates: (payeeName: string, amount: number, currency: string = 'USD') =>
    fetchApi<{ hasDuplicates: boolean; duplicates: Payment[] }>(
      `/api/payments/check/duplicates?payeeName=${encodeURIComponent(payeeName)}&amount=${amount}&currency=${currency}`
    ),
};

// Approvals
export const approvalsApi = {
  list: () =>
    fetchApi<(Payment & { approval_id: string; step_number: number })[]>('/api/approvals'),

  get: (id: string) =>
    fetchApi<PaymentApproval & { approvalHistory: PaymentApproval[]; comments: any[] }>(`/api/approvals/${id}`),

  approve: (id: string, comment?: string) =>
    fetchApi<void>(`/api/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  reject: (id: string, comment: string) =>
    fetchApi<void>(`/api/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  return: (id: string, comment: string) =>
    fetchApi<void>(`/api/approvals/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  addComment: (id: string, comment: string, isInternal?: boolean) =>
    fetchApi<void>(`/api/approvals/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment, isInternal }),
    }),
};

// Execution
export const executionApi = {
  queue: () =>
    fetchApi<(Payment & {
      accountNumber: string;
      accountNumberMasked: string;
      routingNumber: string;
      routingNumberMasked: string;
      dual_control_required: boolean;
    })[]>('/api/execution/queue'),

  confirm: (id: string, data: { bankReference: string; actualAmount: number; actualDate: string }) =>
    fetchApi<{ confirmationType: string; isComplete: boolean }>(`/api/execution/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reject: (id: string, reasonCode: string, reason: string) =>
    fetchApi<void>(`/api/execution/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, reason }),
    }),

  halt: (id: string, reason: string) =>
    fetchApi<void>(`/api/execution/${id}/halt`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  batch: (paymentIds: string[], batchReference: string) =>
    fetchApi<{ paymentCount: number }>('/api/execution/batch', {
      method: 'POST',
      body: JSON.stringify({ paymentIds, batchReference }),
    }),
};

// Users
export const usersApi = {
  list: (params?: PaginationParams & { search?: string; role?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    return fetchApi<User[]>(`/api/users?${searchParams}`);
  },

  get: (id: string) =>
    fetchApi<User>(`/api/users/${id}`),

  verifyWorkday: (email: string) =>
    fetchApi<{
      name: string;
      title: string;
      department: string;
      manager_name: string;
      manager_email: string;
      workday_id: string;
      cost_center: string;
      employment_status: string;
      hire_date?: string;
      location?: string;
    }>(
      '/api/users/verify-workday',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    ),

  createDirect: (data: { email: string; name: string; role: string; department?: string; title?: string; payment_limit?: number }) =>
    fetchApi<User>('/api/users/create-direct', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  provision: (data: { email: string; role: string; workdayData?: any }) =>
    fetchApi<{ requestId: string; managerEmail: string }>('/api/users/provision', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listAccessRequests: () =>
    fetchApi<any[]>('/api/users/access-requests'),

  update: (id: string, data: { role?: string; paymentLimit?: number; status?: string }) =>
    fetchApi<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  suspend: (id: string) =>
    fetchApi<void>(`/api/users/${id}/suspend`, { method: 'POST' }),

  reactivate: (id: string) =>
    fetchApi<void>(`/api/users/${id}/reactivate`, { method: 'POST' }),
};

// Accounts
export const accountsApi = {
  list: () =>
    fetchApi<Account[]>('/api/accounts'),

  get: (id: string) =>
    fetchApi<Account>(`/api/accounts/${id}`),

  create: (data: any) =>
    fetchApi<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<Account>(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deactivate: (id: string) =>
    fetchApi<void>(`/api/accounts/${id}`, { method: 'DELETE' }),

  delete: (id: string) =>
    fetchApi<void>(`/api/accounts/${id}`, { method: 'DELETE' }),
};

// Payees
export const payeesApi = {
  list: (search?: string, paymentType?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (paymentType) params.set('paymentType', paymentType);
    return fetchApi<SavedPayee[]>(`/api/payees?${params}`);
  },

  get: (id: string) =>
    fetchApi<SavedPayee>(`/api/payees/${id}`),

  create: (data: any) =>
    fetchApi<SavedPayee>('/api/payees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Templates
export const templatesApi = {
  list: () =>
    fetchApi<PaymentTemplate[]>('/api/templates'),

  create: (data: any) =>
    fetchApi<PaymentTemplate>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/templates/${id}`, { method: 'DELETE' }),
};

// Routing
export const routingApi = {
  list: () =>
    fetchApi<RoutingRule[]>('/api/routing'),

  get: (id: string) =>
    fetchApi<RoutingRule & { approvalChain: any[] }>(`/api/routing/${id}`),

  create: (data: any) =>
    fetchApi<RoutingRule>('/api/routing', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<RoutingRule>(`/api/routing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/routing/${id}`, { method: 'DELETE' }),

  reorder: (ruleIds: string[]) =>
    fetchApi<void>('/api/routing/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ruleIds }),
    }),
};

// Approval Chains
export const chainsApi = {
  get: (ruleId: string) =>
    fetchApi<any[]>(`/api/chains/${ruleId}`),

  update: (ruleId: string, chains: any[]) =>
    fetchApi<void>(`/api/chains/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify({ chains }),
    }),
};

// Dashboard
export const dashboardApi = {
  summary: () =>
    fetchApi<DashboardSummary>('/api/dashboard/summary'),

  volume: () =>
    fetchApi<PaymentVolumeData[]>('/api/dashboard/volume'),

  pipeline: () =>
    fetchApi<{ status: string; count: number }[]>('/api/dashboard/pipeline'),

  vendors: () =>
    fetchApi<TopVendor[]>('/api/dashboard/vendors'),
};

// Calendar
export const calendarApi = {
  holidays: (year?: number, country?: string) => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (country) params.set('country', country);
    return fetchApi<BankHoliday[]>(`/api/calendar/holidays?${params}`);
  },

  validateDate: (date: string) =>
    fetchApi<{ date: string; isBusinessDay: boolean; isWeekend: boolean; isHoliday: boolean; holidayName?: string }>(
      `/api/calendar/validate/${date}`
    ),

  nextBusinessDay: (from?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    return fetchApi<{ nextBusinessDay: string }>(`/api/calendar/next-business-day?${params}`);
  },

  batchWindows: () =>
    fetchApi<any[]>('/api/calendar/batch-windows'),
};

// Documents
export const documentsApi = {
  get: (slug: string) =>
    fetchApi<{
      id: string;
      slug: string;
      title: string;
      content: string;
      version: number;
      updated_by: string;
      updated_by_name: string;
      updated_at: string;
    }>(`/api/documents/${slug}`),

  update: (slug: string, data: { title?: string; content: string }) =>
    fetchApi<any>(`/api/documents/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getVersions: (slug: string) =>
    fetchApi<any[]>(`/api/documents/${slug}/versions`),

  send: (slug: string, email: string) =>
    fetchApi<{ recipientEmail: string; documentTitle: string; version: number }>(`/api/documents/${slug}/send`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

// Reports
export const reportsApi = {
  audit: (params?: PaginationParams & {
    userId?: string;
    action?: string;
    tableName?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    return fetchApi<any[]>(`/api/reports/audit?${searchParams}`);
  },

  export: (format: string, filters: any, reportType: string) =>
    fetchApi<{ downloadUrl: string }>('/api/reports/export', {
      method: 'POST',
      body: JSON.stringify({ format, filters, reportType }),
    }),

  pushToSheets: () =>
    fetchApi<void>('/api/reports/sheets', { method: 'POST' }),
};

// Admin
export const adminApi = {
  settings: () =>
    fetchApi<Record<string, any>>('/api/admin/settings'),

  updateSettings: (updates: Record<string, any>) =>
    fetchApi<void>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  ipAllowlist: () =>
    fetchApi<any[]>('/api/admin/ip-allowlist'),

  addIpAllowlist: (cidr: string, description: string) =>
    fetchApi<any>('/api/admin/ip-allowlist', {
      method: 'POST',
      body: JSON.stringify({ cidr, description }),
    }),

  removeIpAllowlist: (id: string) =>
    fetchApi<void>(`/api/admin/ip-allowlist/${id}`, { method: 'DELETE' }),

  accessRequests: () =>
    fetchApi<any[]>('/api/admin/access-requests'),
};

export { ApiError };
