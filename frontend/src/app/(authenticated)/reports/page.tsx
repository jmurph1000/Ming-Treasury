'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useIsAdmin } from '@/hooks/useAuth';
import { usePayments } from '@/hooks/usePayments';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { treasuryReportsApi, notificationsApi, paymentsApi } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
  getPaymentTypeLabel,
  getRoleLabel,
} from '@/lib/utils';
import { ROUTES, PAYMENT_STATUSES } from '@/lib/constants';
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Loader2,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  ClipboardList,
  ShieldCheck,
  ShieldOff,
  Archive,
} from 'lucide-react';

type Tab = 'dashboard' | 'daily' | 'weekly' | 'date-range' | 'lifetime' | 'eod' | 'permissions';

// ─── Shared navigation state type ──────────────────────────────────────────

interface NavAction {
  tab: Tab;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// ─── CSV Export Helpers ────────────────────────────────────────────────────

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportPaymentsCSV(payments: any[], filename?: string) {
  const headers = ['Reference #', 'Payee', 'Amount', 'Currency', 'USD Equivalent', 'Type', 'Status', 'Requested By', 'Waiting On', 'Date Submitted', 'Days Pending'];
  const csvRows = payments.map(p => [
    p.reference_number,
    `"${(p.payee_name || '').replace(/"/g, '""')}"`,
    p.amount, p.currency, p.usd_equivalent,
    getPaymentTypeLabel(p.payment_type), getStatusLabel(p.status),
    `"${(p.requester_name || '').replace(/"/g, '""')}"`,
    p.waiting_on ? (p.waiting_on.name || getRoleLabel(p.waiting_on.role)) : '',
    p.submitted_at || p.created_at || '',
    getDaysPending(p),
  ]);
  downloadCSV(headers, csvRows, filename || `payments-report-${new Date().toISOString().slice(0, 10)}.csv`);
}

function getDaysPending(p: any): number {
  const ref = p.submitted_at || p.created_at;
  if (!ref) return 0;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
}

// ─── Shared Payment Table ──────────────────────────────────────────────────

function PaymentTable({ payments, showSummary = true }: { payments: any[]; showSummary?: boolean }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No payments found</h3>
        <p className="text-gray-500 mt-1">No payments match the current criteria.</p>
      </div>
    );
  }

  const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.usd_equivalent || p.amount || 0), 0);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payee</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initiated By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiting On</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Action</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.map((p: any, idx: number) => {
              const daysPending = getDaysPending(p);
              return (
                <tr key={p.id || `${p.reference_number}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {p.id ? (
                      <Link href={ROUTES.PAYMENT_DETAIL(p.id)} className="text-primary hover:underline font-medium">
                        {p.reference_number}
                      </Link>
                    ) : (
                      <span className="font-medium text-primary">{p.reference_number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{p.payee_name}</td>
                  <td className="px-4 py-3 font-mono text-right">
                    {formatCurrency(p.amount, p.currency)}
                    {p.currency !== 'USD' && (
                      <span className="text-xs text-gray-500 ml-1">({formatCurrency(p.usd_equivalent, 'USD')})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{getPaymentTypeLabel(p.payment_type)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.requester_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-sm">
                    {p.waiting_on ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {p.waiting_on.name || getRoleLabel(p.waiting_on.role)}
                      </span>
                    ) : (
                      <span className="text-gray-400">\u2014</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.submitted_at ? formatDate(p.submitted_at) : formatDate(p.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.updated_at ? formatDateTime(p.updated_at) : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {['pending_approval', 'approved', 'ready_to_execute', 'pending_confirmation'].includes(p.status) ? (
                      <span className={`font-medium ${daysPending > 3 ? 'text-red-600' : daysPending > 1 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {daysPending}
                      </span>
                    ) : (
                      <span className="text-gray-400">\u2014</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showSummary && (
        <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center text-sm">
          <span className="font-medium text-gray-700">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
          <span className="font-medium text-gray-900">Total: {formatCurrency(totalAmount, 'USD')}</span>
        </div>
      )}
    </>
  );
}

// ─── Pagination Component ──────────────────────────────────────────────────

function Pagination({ page, setPage, meta }: { page: number; setPage: (fn: (p: number) => number) => void; meta: any }) {
  if (!meta || (meta.totalPages ?? 0) <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <div className="text-sm text-gray-500">
        Showing {((meta.page ?? 1) - 1) * (meta.limit ?? 25) + 1} to{' '}
        {Math.min((meta.page ?? 1) * (meta.limit ?? 25), meta.total ?? 0)} of {meta.total} results
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="p-2 rounded-md border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-gray-700">Page {meta.page} of {meta.totalPages}</span>
        <button onClick={() => setPage(p => Math.min(meta.totalPages ?? 1, p + 1))} disabled={page === (meta.totalPages ?? 1)}
          className="p-2 rounded-md border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Tab 1: Dashboard ──────────────────────────────────────────────────────

function DashboardTab({ onNavigate }: { onNavigate: (action: NavAction) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => treasuryReportsApi.dashboard(),
    refetchInterval: 30000,
  });

  const stats = data?.data;
  const pipeline = stats?.pipeline || [];
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const statCards = [
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', action: { tab: 'date-range' as Tab, status: 'pending_approval' } },
    { label: 'Ready to Execute', value: stats?.readyToExecute ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', action: { tab: 'date-range' as Tab, status: 'ready_to_execute' } },
    { label: 'Executed Today', value: stats?.executedTodayCount ?? 0, subValue: stats?.executedTodayAmount ? formatCurrency(stats.executedTodayAmount) : undefined, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', action: { tab: 'daily' as Tab, status: 'executed' } },
    { label: 'Escalations', value: stats?.escalations ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', action: { tab: 'date-range' as Tab, status: 'pending_approval' } },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <button key={card.label} onClick={() => onNavigate(card.action)}
            className={`rounded-lg border p-4 ${card.bg} text-left hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer`}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <span className="text-sm font-medium text-gray-600">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            {card.subValue && <p className="text-sm text-gray-500 mt-1">{card.subValue}</p>}
          </button>
        ))}
      </div>

      {/* MTD Summary — clickable */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Month to Date</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => onNavigate({ tab: 'date-range', startDate: monthStart, endDate: today })}
            className="text-left p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <p className="text-sm text-gray-500">Payments Created</p>
            <p className="text-xl font-bold text-gray-900">{stats?.mtdCount ?? 0}</p>
          </button>
          <button onClick={() => onNavigate({ tab: 'lifetime' })}
            className="text-left p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats?.mtdAmount ?? 0)}</p>
          </button>
        </div>
      </div>

      {/* Pipeline Breakdown — each row clickable */}
      {pipeline.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Pipeline</h3>
          <div className="space-y-2">
            {pipeline.map(p => (
              <button key={p.status} onClick={() => onNavigate({ tab: 'date-range', status: p.status })}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                  {getStatusLabel(p.status)}
                </span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{p.count} payment{p.count !== 1 ? 's' : ''}</span>
                  <span className="font-medium text-gray-900 w-32 text-right">{formatCurrency(p.total)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Daily ──────────────────────────────────────────────────────────

function DailyTab({ initialStatus }: { initialStatus?: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState(initialStatus || '');

  const { data, isLoading } = usePayments({
    page: 1, limit: 100,
    startDate: date,
    endDate: date,
    status: statusFilter || undefined,
  });

  const payments = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="">All Statuses</option>
            {PAYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={() => exportPaymentsCSV(payments, `daily-${date}.csv`)}
          disabled={payments.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark text-sm disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        ) : (
          <PaymentTable payments={payments} />
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Weekly ─────────────────────────────────────────────────────────

function WeeklyTab() {
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().slice(0, 10);
  };
  const getSunday = (monday: string) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  };

  const [startDate, setStartDate] = useState(getMonday(new Date()));
  const endDate = getSunday(startDate);

  const { data, isLoading } = usePayments({
    page: 1, limit: 200,
    startDate,
    endDate,
  });

  const payments = data?.data || [];

  // Group by date(created_at)
  const grouped: Record<string, any[]> = {};
  for (const p of payments) {
    const d = (p.created_at || '').slice(0, 10);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(p);
  }
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <label className="text-sm text-gray-600">Week starting:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
        <span className="text-sm text-gray-500">through {formatDate(endDate)}</span>
        <button onClick={() => exportPaymentsCSV(payments, `weekly-${startDate}.csv`)}
          disabled={payments.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark text-sm disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No results</h3>
          <p className="text-gray-500 mt-1">No payments found for this week.</p>
        </div>
      ) : (
        <>
          {/* Week summary */}
          <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {payments.length} payment{payments.length !== 1 ? 's' : ''} this week
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(payments.reduce((s: number, p: any) => s + (p.usd_equivalent || p.amount || 0), 0), 'USD')}
            </span>
          </div>

          {sortedDates.map(date => {
            const dayRows = grouped[date];
            const dayTotal = dayRows.reduce((sum: number, r: any) => sum + (r.usd_equivalent || r.amount || 0), 0);
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{formatDate(date)}</h3>
                  <span className="text-sm text-gray-500">
                    {dayRows.length} payment{dayRows.length !== 1 ? 's' : ''} \u2014 {formatCurrency(dayTotal, 'USD')}
                  </span>
                </div>
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <PaymentTable payments={dayRows} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Tab 4: Date Range ─────────────────────────────────────────────────────

function DateRangeTab({ initialStatus, initialStartDate, initialEndDate }: { initialStatus?: string; initialStartDate?: string; initialEndDate?: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus || '');
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');

  const { data, isLoading, error } = usePayments({
    page, limit: 25,
    search: search || undefined,
    status: statusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const payments = data?.data || [];
  const meta = data?.meta;

  const handleExport = useCallback(() => {
    if (payments.length > 0) exportPaymentsCSV(payments);
  }, [payments]);

  const handleClearFilters = useCallback(() => {
    setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1);
  }, []);

  const hasActiveFilters = search || statusFilter || startDate || endDate;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search by payee, requester, or reference..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">All Statuses</option>
                {PAYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <button onClick={handleExport} disabled={payments.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark text-sm disabled:opacity-50">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            {hasActiveFilters && (
              <button onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap">
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">Failed to load report data. Please try again.</div>
        ) : (
          <>
            <PaymentTable payments={payments} showSummary={true} />
            <Pagination page={page} setPage={setPage} meta={meta} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab 5: Life to Date ───────────────────────────────────────────────────

function LifetimeTab() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = usePayments({
    page, limit: 25,
    sortBy,
    sortOrder,
  });

  const payments = data?.data || [];
  const meta = data?.meta;

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  }

  function SortHeader({ column, children }: { column: string; children: React.ReactNode }) {
    return (
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
        onClick={() => handleSort(column)}>
        <span className="inline-flex items-center gap-1">
          {children}
          {sortBy === column && <span className="text-primary">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>}
        </span>
      </th>
    );
  }

  const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.usd_equivalent || p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {meta?.total ? `${meta.total} total payments across all time` : ''}
        </div>
        <button onClick={() => exportPaymentsCSV(payments, `lifetime-page${page}.csv`)}
          disabled={payments.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark text-sm disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No payments found</h3>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <SortHeader column="payee_name">Payee</SortHeader>
                    <SortHeader column="amount">Amount</SortHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <SortHeader column="status">Status</SortHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initiated By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiting On</th>
                    <SortHeader column="created_at">Date Submitted</SortHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Action</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((p: any) => {
                    const daysPending = getDaysPending(p);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={ROUTES.PAYMENT_DETAIL(p.id)} className="text-primary hover:underline font-medium">
                            {p.reference_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{p.payee_name}</td>
                        <td className="px-4 py-3 font-mono text-right">
                          {formatCurrency(p.amount, p.currency)}
                          {p.currency !== 'USD' && (
                            <span className="text-xs text-gray-500 ml-1">({formatCurrency(p.usd_equivalent, 'USD')})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{getPaymentTypeLabel(p.payment_type)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                            {getStatusLabel(p.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.requester_name || '\u2014'}</td>
                        <td className="px-4 py-3 text-sm">
                          {p.waiting_on ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              {p.waiting_on.name || getRoleLabel(p.waiting_on.role)}
                            </span>
                          ) : <span className="text-gray-400">\u2014</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {p.submitted_at ? formatDate(p.submitted_at) : formatDate(p.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.updated_at ? formatDateTime(p.updated_at) : '\u2014'}</td>
                        <td className="px-4 py-3 text-center text-sm">
                          {['pending_approval', 'approved', 'ready_to_execute', 'pending_confirmation'].includes(p.status) ? (
                            <span className={`font-medium ${daysPending > 3 ? 'text-red-600' : daysPending > 1 ? 'text-yellow-600' : 'text-gray-600'}`}>
                              {daysPending}
                            </span>
                          ) : <span className="text-gray-400">\u2014</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary row */}
            <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">
                {meta?.total ?? payments.length} total payments
              </span>
              <span className="font-medium text-gray-900">
                Page total: {formatCurrency(totalAmount, 'USD')}
              </span>
            </div>

            <Pagination page={page} setPage={setPage} meta={meta} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab 6: End of Day Archive ─────────────────────────────────────────────

function EodArchiveTab() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['eod-reports'],
    queryFn: () => treasuryReportsApi.eodList(60),
  });

  const { data: expandedData } = useQuery({
    queryKey: ['eod-report', expandedId],
    queryFn: () => treasuryReportsApi.eodGet(expandedId!),
    enabled: !!expandedId,
  });

  const generateMutation = useMutation({
    mutationFn: () => treasuryReportsApi.eodGenerate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eod-reports'] });
      setRunSuccess(true);
      setTimeout(() => setRunSuccess(false), 5000);
    },
  });

  const reports = data?.data || [];

  return (
    <div className="space-y-4">
      {runSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">End of day report generated</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Auto-generated daily at 6:00 PM ET. Click to expand full report.</p>
        <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm disabled:opacity-50">
          {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Play className="h-4 w-4" /> Generate Now</>}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No EOD reports yet</h3>
          <p className="text-gray-500 mt-1">Click &quot;Generate Now&quot; or wait for the daily 6 PM ET run.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => {
            const isExpanded = expandedId === report.id;
            const utc = report.generated_at?.endsWith('Z') ? report.generated_at : (report.generated_at + 'Z');
            const dateStr = new Date(utc).toLocaleString('en-US', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short',
            });

            return (
              <div key={report.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <button onClick={() => setExpandedId(prev => prev === report.id ? null : report.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors">
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRightIcon className="h-5 w-5 text-gray-400" />}
                  <Archive className="h-5 w-5 text-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">End of Day \u2014 {report.report_date}</p>
                    <p className="text-sm text-gray-500">{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{report.pending_count} pending</span>
                    <span>{report.executed_count} executed</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency((report.pending_amount || 0) + (report.executed_amount || 0))}
                    </span>
                  </div>
                </button>

                {isExpanded && expandedData?.data && (
                  <div className="border-t px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-white rounded p-3 border">
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className="text-lg font-bold">{expandedData.data.pending_count}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(expandedData.data.pending_amount)}</p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <p className="text-xs text-gray-500">Executed</p>
                        <p className="text-lg font-bold">{expandedData.data.executed_count}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(expandedData.data.executed_amount)}</p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <p className="text-xs text-gray-500">Rejected</p>
                        <p className="text-lg font-bold">{expandedData.data.rejected_count}</p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <p className="text-xs text-gray-500">Cancelled</p>
                        <p className="text-lg font-bold">{expandedData.data.cancelled_count}</p>
                      </div>
                    </div>
                    {expandedData.data.html_body && (
                      <div className="bg-white rounded border p-4 overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: expandedData.data.html_body }} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 7: User Permissions ───────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff', manager: 'Manager', sr_manager: 'Senior Manager', admin: 'Administrator',
};
const ROLE_COLORS: Record<string, string> = {
  staff: 'bg-gray-100 text-gray-800', manager: 'bg-blue-100 text-blue-800',
  sr_manager: 'bg-purple-100 text-purple-800', admin: 'bg-red-100 text-red-800',
};

function PermissionsTab() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['permissions-reports'],
    queryFn: () => notificationsApi.permissionsReports(),
  });

  const runNowMutation = useMutation({
    mutationFn: () => notificationsApi.runPermissionsReportNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-reports'] });
      setRunSuccess(true);
      setTimeout(() => setRunSuccess(false), 5000);
    },
  });

  const reports: any[] = data?.data || [];

  const parseTemplateData = (raw: string) => {
    try { return JSON.parse(raw); } catch { return null; }
  };

  return (
    <div className="space-y-4">
      {runSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">Permissions report generated</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Daily snapshot of all users and their system access \u2014 generated at 6:00 PM ET</p>
        <button onClick={() => runNowMutation.mutate()} disabled={runNowMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm disabled:opacity-50">
          {runNowMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Play className="h-4 w-4" /> Generate Now</>}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No reports yet</h3>
          <p className="text-gray-500 mt-1">Click &quot;Generate Now&quot; or wait for the daily 6 PM ET run.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => {
            const meta = parseTemplateData(report.template_data);
            const isExpanded = expandedId === report.id;
            const utc = report.created_at?.endsWith('Z') ? report.created_at : (report.created_at + 'Z');
            const dateStr = new Date(utc).toLocaleString('en-US', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short',
            });

            return (
              <div key={report.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <button onClick={() => setExpandedId(prev => prev === report.id ? null : report.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors">
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRightIcon className="h-5 w-5 text-gray-400" />}
                  <ClipboardList className="h-5 w-5 text-teal-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{report.subject}</p>
                    <p className="text-sm text-gray-500">{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {meta && (
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-green-500" /> {meta.activeCount} active</span>
                        {meta.suspendedCount > 0 && <span className="inline-flex items-center gap-1"><ShieldOff className="h-4 w-4 text-red-400" /> {meta.suspendedCount} suspended</span>}
                        {meta.pendingCount > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-500" /> {meta.pendingCount} pending</span>}
                      </div>
                    )}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">Generated</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    {meta?.roleCounts && (
                      <div className="px-6 py-4 bg-gray-50 border-b">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Active Users by Role</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(meta.roleCounts as Record<string, number>).map(([role, count]) => (
                            <span key={role} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}`}>
                              {ROLE_LABELS[role] || role}: {count as number}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="px-6 py-4">
                      <div className="bg-white rounded border p-4 overflow-x-auto" dangerouslySetInnerHTML={{ __html: report.body }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Reports Page ─────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  // Shared filter state that Dashboard can pre-set before switching tabs
  const [navStatus, setNavStatus] = useState('');
  const [navStartDate, setNavStartDate] = useState('');
  const [navEndDate, setNavEndDate] = useState('');
  // Key to force re-mount of tabs when navigating from Dashboard
  const [tabKey, setTabKey] = useState(0);

  const handleNavigate = useCallback((action: NavAction) => {
    setNavStatus(action.status || '');
    setNavStartDate(action.startDate || '');
    setNavEndDate(action.endDate || '');
    setActiveTab(action.tab);
    setTabKey(k => k + 1); // force re-mount to pick up new initial values
  }, []);

  // Reset nav filters when user manually clicks a tab
  const handleTabClick = useCallback((tab: Tab) => {
    setNavStatus('');
    setNavStartDate('');
    setNavEndDate('');
    setActiveTab(tab);
    setTabKey(k => k + 1);
  }, []);

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'daily', label: 'Daily', adminOnly: true },
    { key: 'weekly', label: 'Weekly', adminOnly: true },
    { key: 'date-range', label: 'Date Range' },
    { key: 'lifetime', label: 'Life to Date', adminOnly: true },
    { key: 'eod', label: 'EOD Archive', adminOnly: true },
    { key: 'permissions', label: 'User Permissions', adminOnly: true },
  ];

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          View, search, and export payment data and compliance reports
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {visibleTabs.map(tab => (
            <button key={tab.key} onClick={() => handleTabClick(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab onNavigate={handleNavigate} />}
      {activeTab === 'daily' && <DailyTab key={tabKey} initialStatus={navStatus} />}
      {activeTab === 'weekly' && <WeeklyTab key={tabKey} />}
      {activeTab === 'date-range' && <DateRangeTab key={tabKey} initialStatus={navStatus} initialStartDate={navStartDate} initialEndDate={navEndDate} />}
      {activeTab === 'lifetime' && <LifetimeTab key={tabKey} />}
      {activeTab === 'eod' && <EodArchiveTab />}
      {activeTab === 'permissions' && <PermissionsTab />}
    </div>
  );
}
