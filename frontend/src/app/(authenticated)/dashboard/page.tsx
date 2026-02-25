'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Clock,
  Send,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary(),
  });

  const { data: volumeData } = useQuery({
    queryKey: ['dashboard', 'volume'],
    queryFn: () => dashboardApi.volume(),
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['dashboard', 'vendors'],
    queryFn: () => dashboardApi.vendors(),
  });

  const summary = summaryData?.data;
  const volume = volumeData?.data || [];
  const vendors = vendorsData?.data || [];

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of treasury operations and key metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">MTD Payments</p>
              <p className="text-xl font-bold text-gray-900">
                {summary?.mtdPaymentsCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">MTD Volume</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary?.mtdPaymentsAmount || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Approvals</p>
              <p className="text-xl font-bold text-gray-900">
                {summary?.pendingApprovalsCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Send className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ready to Execute</p>
              <p className="text-xl font-bold text-gray-900">
                {summary?.readyToExecuteCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">On-Time Rate</p>
              <p className="text-xl font-bold text-gray-900">
                {summary?.onTimeRate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Escalations</p>
              <p className="text-xl font-bold text-gray-900">
                {summary?.escalationsCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Volume Chart Placeholder */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Payment Volume (Last 30 Days)
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {volume.length > 0
                ? `${volume.length} days of data available`
                : 'Chart visualization placeholder'}
            </p>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Vendors (MTD)
          </h3>
          {vendors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No vendor data available
            </div>
          ) : (
            <div className="space-y-3">
              {vendors.slice(0, 5).map((vendor, index) => (
                <div
                  key={vendor.payee_name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-primary text-white rounded-full text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{vendor.payee_name}</p>
                      <p className="text-sm text-gray-500">
                        {vendor.payment_count} payment{vendor.payment_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(vendor.total_amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Batch Executions
        </h3>
        <div className="text-center py-8 text-gray-500">
          Batch execution history will appear here
        </div>
      </div>
    </div>
  );
}
