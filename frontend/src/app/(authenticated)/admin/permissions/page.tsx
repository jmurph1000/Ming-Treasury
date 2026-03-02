'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import {
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Play,
  CheckCircle,
  Users,
  ShieldCheck,
  ShieldOff,
  Clock,
} from 'lucide-react';

interface PermissionsReport {
  id: string;
  subject: string;
  body: string;
  status: string;
  template_data: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  ap_staff: 'AP Staff',
  ap_manager: 'AP Manager',
  sr_ap_manager: 'Sr. AP Manager',
  treasury: 'Treasury',
  cfo: 'CFO',
  admin: 'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  ap_staff: 'bg-gray-100 text-gray-800',
  ap_manager: 'bg-blue-100 text-blue-800',
  sr_ap_manager: 'bg-purple-100 text-purple-800',
  treasury: 'bg-green-100 text-green-800',
  cfo: 'bg-amber-100 text-amber-800',
  admin: 'bg-red-100 text-red-800',
};

export default function UserPermissionsReportPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState(false);

  const { data, isLoading, error } = useQuery({
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

  const reports: PermissionsReport[] = data?.data || [];

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const parseTemplateData = (raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Success Banner */}
      {runSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">Permissions report generated successfully</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Permissions Report</h1>
          <p className="text-gray-500 mt-1">
            Daily snapshot of all users and their system access — generated at 6:00 AM ET
          </p>
        </div>
        <button
          onClick={() => runNowMutation.mutate()}
          disabled={runNowMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {runNowMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Generate Now
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">Failed to load reports. Please try again.</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && reports.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No reports yet</h3>
          <p className="text-gray-500 mt-1">
            Click "Generate Now" to create the first report, or wait for the daily 6:00 AM ET run.
          </p>
        </div>
      )}

      {/* Report List */}
      {!isLoading && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => {
            const meta = parseTemplateData(report.template_data);
            const isExpanded = expandedId === report.id;
            const utc = report.created_at.endsWith('Z') ? report.created_at : report.created_at + 'Z';
            const dateStr = new Date(utc).toLocaleString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/New_York',
              timeZoneName: 'short',
            });

            return (
              <div key={report.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Summary Row */}
                <button
                  onClick={() => toggle(report.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  }

                  <ClipboardList className="h-5 w-5 text-teal-500 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{report.subject}</p>
                    <p className="text-sm text-gray-500">{dateStr}</p>
                  </div>

                  {/* Meta badges */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {meta && (
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          {meta.activeCount} active
                        </span>
                        {meta.suspendedCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <ShieldOff className="h-4 w-4 text-red-400" />
                            {meta.suspendedCount} suspended
                          </span>
                        )}
                        {meta.pendingCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            {meta.pendingCount} pending
                          </span>
                        )}
                      </div>
                    )}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                      Generated
                    </span>
                  </div>
                </button>

                {/* Expanded: Role breakdown + full HTML report */}
                {isExpanded && (
                  <div className="border-t">
                    {/* Role breakdown cards */}
                    {meta?.roleCounts && (
                      <div className="px-6 py-4 bg-gray-50 border-b">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Active Users by Role</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(meta.roleCounts as Record<string, number>).map(([role, count]) => (
                            <span
                              key={role}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {ROLE_LABELS[role] || role}: {count as number}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full HTML body */}
                    <div className="px-6 py-4">
                      <div
                        className="bg-white rounded border p-4 overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: report.body }}
                      />
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
