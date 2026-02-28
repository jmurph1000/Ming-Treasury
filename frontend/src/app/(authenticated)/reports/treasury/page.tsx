'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { treasuryReportsApi } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
  getPaymentTypeLabel,
  getRoleLabel,
} from '@/lib/utils';
import {
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

type Tab = 'daily' | 'weekly' | 'lifetime';

function exportToCSV(rows: any[], filename: string) {
  const headers = [
    'Reference #',
    'Payee',
    'Amount',
    'Currency',
    'USD Equivalent',
    'Type',
    'Status',
    'Submitted',
    'Approved By',
    'Approved At',
    'Executed',
  ];

  const csvRows = rows.map((r) => [
    r.reference_number,
    `"${(r.payee_name || '').replace(/"/g, '""')}"`,
    r.amount,
    r.currency,
    r.usd_equivalent,
    getPaymentTypeLabel(r.payment_type),
    getStatusLabel(r.status),
    r.submitted_at || '',
    r.approver_name || '',
    r.approval_timestamp || '',
    r.executed_at || '',
  ]);

  const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
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

function PaymentTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No results</h3>
        <p className="text-gray-500 mt-1">No treasury-approved payments found for this period.</p>
      </div>
    );
  }

  const totalAmount = rows.reduce((sum: number, r: any) => sum + (r.usd_equivalent || r.amount), 0);

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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row: any, idx: number) => (
              <tr key={`${row.reference_number}-${idx}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-primary">{row.reference_number}</td>
                <td className="px-4 py-3 text-gray-900">{row.payee_name}</td>
                <td className="px-4 py-3 font-mono text-right">
                  {formatCurrency(row.amount, row.currency)}
                  {row.currency !== 'USD' && (
                    <span className="text-xs text-gray-500 ml-1">({formatCurrency(row.usd_equivalent, 'USD')})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{getPaymentTypeLabel(row.payment_type)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                    {getStatusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {row.approver_name || getRoleLabel(row.approver_role)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {row.approval_timestamp ? formatDateTime(row.approval_timestamp) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700">
          {rows.length} payment{rows.length !== 1 ? 's' : ''}
        </span>
        <span className="font-medium text-gray-900">
          Total: {formatCurrency(totalAmount, 'USD')}
        </span>
      </div>
    </>
  );
}

function DailyTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useQuery({
    queryKey: ['treasury-reports-daily', date],
    queryFn: () => treasuryReportsApi.daily(date),
  });
  const rows = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button
          onClick={() => exportToCSV(rows, `treasury-daily-${date}.csv`)}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark text-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <PaymentTable rows={rows} />
        )}
      </div>
    </div>
  );
}

function WeeklyTab() {
  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  };
  const [startDate, setStartDate] = useState(getMonday(new Date()));

  const { data, isLoading } = useQuery({
    queryKey: ['treasury-reports-weekly', startDate],
    queryFn: () => treasuryReportsApi.weekly(startDate),
  });

  const grouped = data?.data || {};
  const allRows = Object.values(grouped).flat();
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <label className="text-sm text-gray-600">Week starting:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button
          onClick={() => exportToCSV(allRows, `treasury-weekly-${startDate}.csv`)}
          disabled={allRows.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark text-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : allRows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No results</h3>
          <p className="text-gray-500 mt-1">No treasury-approved payments found for this week.</p>
        </div>
      ) : (
        sortedDates.map((date) => {
          const dayRows = grouped[date];
          const dayTotal = dayRows.reduce((sum: number, r: any) => sum + (r.usd_equivalent || r.amount), 0);
          return (
            <div key={date} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{formatDate(date)}</h3>
                <span className="text-sm text-gray-500">
                  {dayRows.length} payment{dayRows.length !== 1 ? 's' : ''} — {formatCurrency(dayTotal, 'USD')}
                </span>
              </div>
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <PaymentTable rows={dayRows} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function LifetimeTab() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('actioned_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['treasury-reports-lifetime', page, sortBy, sortOrder],
    queryFn: () => treasuryReportsApi.lifetime({ page, limit: 25, sortBy, sortOrder }),
  });

  const rows = data?.data || [];
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
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
        onClick={() => handleSort(column)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {sortBy === column && (
            <span className="text-primary">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>
          )}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            // Fetch all pages for export - for simplicity export current view
            exportToCSV(rows, `treasury-lifetime-page${page}.csv`);
          }}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark text-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No results</h3>
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
                    <SortHeader column="approver">Approver</SortHeader>
                    <SortHeader column="actioned_at">Approved At</SortHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row: any, idx: number) => (
                    <tr key={`${row.reference_number}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-primary">{row.reference_number}</td>
                      <td className="px-4 py-3 text-gray-900">{row.payee_name}</td>
                      <td className="px-4 py-3 font-mono text-right">
                        {formatCurrency(row.amount, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getPaymentTypeLabel(row.payment_type)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.approver_name || getRoleLabel(row.approver_role)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.approval_timestamp ? formatDateTime(row.approval_timestamp) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (meta.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                  Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, meta.total ?? 0)} of {meta.total} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-md border hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages ?? 1, p + 1))}
                    disabled={page === (meta.totalPages ?? 1)}
                    className="p-2 rounded-md border hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TreasuryReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('daily');

  const allowedRoles = ['treasury', 'admin', 'cfo'];
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <ShieldAlert className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view treasury reports.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'lifetime', label: 'Life to Date' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Treasury Reports</h1>
        <p className="text-gray-500 mt-1">
          View and export treasury-approved payment activity
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'daily' && <DailyTab />}
      {activeTab === 'weekly' && <WeeklyTab />}
      {activeTab === 'lifetime' && <LifetimeTab />}
    </div>
  );
}
