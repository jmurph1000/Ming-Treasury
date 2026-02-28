'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  AlertCircle,
  Play,
  CheckCircle,
} from 'lucide-react';

interface NotificationSummary {
  id: string;
  subject: string;
  body: string;
  status: string;
  recipient_email: string;
  template_data: string;
  sent_at: string | null;
  created_at: string;
}

export default function PendingPaymentNotificationsPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-summaries'],
    queryFn: () => notificationsApi.summaries(),
  });

  const runNowMutation = useMutation({
    mutationFn: () => notificationsApi.runSummaryNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-summaries'] });
      setRunSuccess(true);
      setTimeout(() => setRunSuccess(false), 5000);
    },
  });

  const notifications: NotificationSummary[] = data?.data || [];

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
            <p className="text-green-800 font-medium">Daily summary generated successfully</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Payment Notifications</h1>
          <p className="text-gray-500 mt-1">
            Daily summary emails of payments awaiting approval — runs daily at 5:00 PM ET
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
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Now
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
          <p className="text-red-800 text-sm">Failed to load notifications. Please try again.</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && notifications.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
          <p className="text-gray-500 mt-1">
            Daily summaries will appear here once the first job runs at 5:00 PM ET.
          </p>
        </div>
      )}

      {/* Notification List */}
      {!isLoading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => {
            const meta = parseTemplateData(n.template_data);
            const isExpanded = expandedId === n.id;
            // created_at is UTC from SQLite — append Z so Date parses it correctly
            const utc = n.created_at.endsWith('Z') ? n.created_at : n.created_at + 'Z';
            const date = new Date(utc).toLocaleString('en-US', {
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
              <div key={n.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Summary Row */}
                <button
                  onClick={() => toggle(n.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  }

                  <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{n.subject}</p>
                    <p className="text-sm text-gray-500">{date}</p>
                  </div>

                  {/* Meta badges */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {meta && (
                      <span className="text-sm text-gray-500">
                        {meta.pendingCount ?? 0} pending
                        {meta.completedCount > 0 && <>, {meta.completedCount} completed</>}
                        {(meta.pendingTotal > 0 || meta.completedTotal > 0) && (
                          <> &middot; {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((meta.pendingTotal || 0) + (meta.completedTotal || 0))}</>
                        )}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        n.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {n.status === 'sent' ? 'Sent' : 'Draft'}
                    </span>
                  </div>
                </button>

                {/* Expanded HTML Body */}
                {isExpanded && (
                  <div className="border-t px-6 py-4 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-3">
                      Recipients: {n.recipient_email}
                    </p>
                    <div
                      className="bg-white rounded border p-4 overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: n.body }}
                    />
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
