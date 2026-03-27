'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePayments } from '@/hooks/usePayments';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, getPaymentTypeLabel } from '@/lib/utils';
import { ROUTES, PAYMENT_STATUSES } from '@/lib/constants';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsReadOnly } from '@/hooks/useAuth';

export default function PaymentsPage() {
  const isReadOnly = useIsReadOnly();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = usePayments({
    page,
    limit: 25,
    search: search || undefined,
    status: statusFilter || undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Reset to page 1 when filters change
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const payments = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">
            Manage and track payment requests
          </p>
        </div>
        {!isReadOnly && <Link
          href={ROUTES.NEW_PAYMENT}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Payment
        </Link>}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by payee or reference..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            Failed to load payments. Please try again.
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No payments found. Create your first payment to get started.
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={ROUTES.PAYMENT_DETAIL(payment.id)}
                        className="text-primary hover:underline font-medium"
                      >
                        {payment.reference_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {payment.payee_name}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {formatCurrency(payment.amount, payment.currency)}
                      {payment.currency !== 'USD' && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({formatCurrency(payment.usd_equivalent, 'USD')})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {getPaymentTypeLabel(payment.payment_type)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {meta && (meta.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                  Showing {((meta.page ?? 1) - 1) * (meta.limit ?? 20) + 1} to{' '}
                  {Math.min((meta.page ?? 1) * (meta.limit ?? 20), meta.total ?? 0)} of {meta.total}{' '}
                  results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-md border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages ?? 1, p + 1))}
                    disabled={page === (meta.totalPages ?? 1)}
                    className="p-2 rounded-md border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
