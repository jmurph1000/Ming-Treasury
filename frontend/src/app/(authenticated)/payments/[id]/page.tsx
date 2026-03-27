'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePayment, useSubmitPayment, useCancelPayment, useApprovePayment, useRejectPayment, useReturnPayment } from '@/hooks/usePayments';
import { useAuth, useIsReadOnly } from '@/hooks/useAuth';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
  getPaymentTypeLabel,
  getFundingTypeLabel,
  getRoleLabel,
} from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import {
  ArrowLeft,
  Send,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  FileText,
  User,
  Calendar,
  DollarSign,
  Building,
  Hash,
  Pencil,
} from 'lucide-react';

const POOL_LABELS: Record<string, string> = {
  group_or_treasury: 'Any Group Member or Treasury',
  senior_or_treasury: 'Sr Manager, Admin, or Treasury',
  treasury_only: 'Treasury Only',
};

function getPoolLabel(approval: any): string {
  if (approval.approver_pool) {
    return POOL_LABELS[approval.approver_pool] || approval.approver_pool;
  }
  return getRoleLabel(approval.approver_role);
}

function getWaitTime(notifiedAt: string): string {
  const now = new Date();
  const notified = new Date(notifiedAt);
  const diffMs = now.getTime() - notified.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    return `${days}d ${diffHours % 24}h`;
  }
  if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
  return `${diffMins}m`;
}

function getApprovalActionIcon(action: string) {
  switch (action) {
    case 'approved':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'returned':
      return <RotateCcw className="h-5 w-5 text-orange-500" />;
    case 'escalated':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
}

function getApprovalActionLabel(action: string) {
  switch (action) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'returned':
      return 'Returned for Info';
    case 'escalated':
      return 'Escalated';
    default:
      return 'Pending';
  }
}

function getApprovalActionColor(action: string) {
  switch (action) {
    case 'approved':
      return 'text-green-700 bg-green-50';
    case 'rejected':
      return 'text-red-700 bg-red-50';
    case 'returned':
      return 'text-orange-700 bg-orange-50';
    case 'escalated':
      return 'text-yellow-700 bg-yellow-50';
    default:
      return 'text-gray-700 bg-gray-50';
  }
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isReadOnly = useIsReadOnly();
  const id = params.id as string;

  const { data, isLoading, error } = usePayment(id);
  const submitPayment = useSubmitPayment();
  const cancelPayment = useCancelPayment();
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();
  const returnPayment = useReturnPayment();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showApprovalActions, setShowApprovalActions] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'return' | null>(null);

  const payment = data?.data;
  const approvals = (payment as any)?.approvals || [];
  const comments = (payment as any)?.comments || [];

  async function handleSubmit() {
    try {
      await submitPayment.mutateAsync(id);
    } catch (err) {
      console.error('Submit failed:', err);
    }
  }

  async function handleCancel() {
    try {
      await cancelPayment.mutateAsync(id);
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  }

  const approvalEligibility = (payment as any)?.approval_eligibility;
  const canApprovePayment = approvalEligibility?.can_approve === true;
  const approvalId = approvalEligibility?.approval_id;

  async function handleApprovalAction() {
    if (!approvalId || !approvalAction) return;
    try {
      if (approvalAction === 'approve') {
        await approvePayment.mutateAsync({ id: approvalId, comment: approvalComment || undefined });
      } else if (approvalAction === 'reject') {
        await rejectPayment.mutateAsync({ id: approvalId, comment: approvalComment });
      } else if (approvalAction === 'return') {
        await returnPayment.mutateAsync({ id: approvalId, comment: approvalComment });
      }
      setShowApprovalActions(false);
      setApprovalComment('');
      setApprovalAction(null);
    } catch (err) {
      console.error('Approval action failed:', err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="space-y-6">
        <Link
          href={ROUTES.PAYMENTS}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payments
        </Link>
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Payment Not Found</h3>
          <p className="text-gray-500 mt-1">
            This payment could not be loaded. It may have been deleted or you may not have access.
          </p>
        </div>
      </div>
    );
  }

  const isRequester = user?.id === payment.requester_id;
  const canSubmit =
    isRequester && (payment.status === 'draft' || payment.status === 'returned');
  const canEdit =
    isRequester && payment.status === 'returned';
  const canCancel =
    payment.status !== 'executed' &&
    payment.status !== 'cancelled' &&
    payment.status !== 'bank_rejected';

  // Build activity timeline from approvals and comments
  const timeline: {
    type: 'created' | 'submitted' | 'approval' | 'comment';
    date: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
  }[] = [];

  // Payment created
  timeline.push({
    type: 'created',
    date: payment.created_at,
    title: 'Payment Created',
    description: `Created by ${payment.requester_name || 'Unknown'}`,
    icon: <FileText className="h-5 w-5 text-blue-500" />,
  });

  // Payment submitted
  if (payment.submitted_at) {
    timeline.push({
      type: 'submitted',
      date: payment.submitted_at,
      title: 'Submitted for Approval',
      description: `Submitted by ${payment.requester_name || 'Unknown'}`,
      icon: <Send className="h-5 w-5 text-blue-500" />,
    });
  }

  // Approval actions
  approvals.forEach((approval: any) => {
    if (approval.actioned_at && approval.action !== 'pending') {
      timeline.push({
        type: 'approval',
        date: approval.actioned_at,
        title: `Step ${approval.step_number}: ${getApprovalActionLabel(approval.action)}`,
        description: `${approval.approver_name || getPoolLabel(approval)}${approval.comment ? ` — "${approval.comment}"` : ''}`,
        icon: getApprovalActionIcon(approval.action),
      });
    } else if (approval.notified_at && approval.action === 'pending') {
      const waitInfo = ` (waiting ${getWaitTime(approval.notified_at)})`;
      timeline.push({
        type: 'approval',
        date: approval.notified_at,
        title: `Step ${approval.step_number}: Awaiting Approval`,
        description: approval.approver_pool
          ? `Awaiting: ${getPoolLabel(approval)}${waitInfo}`
          : `Notified ${approval.approver_name || getRoleLabel(approval.approver_role)}${waitInfo}`,
        icon: <Clock className="h-5 w-5 text-yellow-500" />,
      });
    }
  });

  // Comments
  comments.forEach((comment: any) => {
    timeline.push({
      type: 'comment',
      date: comment.created_at,
      title: `Comment by ${comment.user_name || 'Unknown'}`,
      description: comment.comment,
      icon: <User className="h-5 w-5 text-gray-400" />,
    });
  });

  // Sort timeline chronologically
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Payment executed
  if (payment.executed_at) {
    timeline.push({
      type: 'approval',
      date: payment.executed_at,
      title: 'Payment Executed',
      description: payment.bank_reference
        ? `Bank reference: ${payment.bank_reference}`
        : undefined,
      icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    });
  }

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={ROUTES.PAYMENTS}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {canApprovePayment && (
            <>
              <button
                onClick={() => { setApprovalAction('approve'); setShowApprovalActions(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => { setApprovalAction('return'); setShowApprovalActions(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Return
              </button>
              <button
                onClick={() => { setApprovalAction('reject'); setShowApprovalActions(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </>
          )}
          {canEdit && (
            <Link
              href={`${ROUTES.NEW_PAYMENT}?edit=${payment.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit Payment
            </Link>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitPayment.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitPayment.isPending ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Cancel Payment
            </button>
          )}
        </div>
      </div>

      {/* Payment header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {payment.reference_number}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  payment.status
                )}`}
              >
                {getStatusLabel(payment.status)}
              </span>
              {(payment as any).waiting_on && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Waiting on: {(payment as any).waiting_on.pool
                    ? (POOL_LABELS[(payment as any).waiting_on.pool] || (payment as any).waiting_on.pool)
                    : ((payment as any).waiting_on.name || getRoleLabel((payment as any).waiting_on.role))}
                </span>
              )}
            </div>
            <p className="text-lg text-gray-700 mt-1">{payment.payee_name}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(payment.amount, payment.currency)}
            </p>
            {payment.currency !== 'USD' && (
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(payment.usd_equivalent, 'USD')} USD equivalent
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Info Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Hash className="h-4 w-4" />
                  Reference Number
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {payment.reference_number}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <User className="h-4 w-4" />
                  Payee
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{payment.payee_name}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <DollarSign className="h-4 w-4" />
                  Amount
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {formatCurrency(payment.amount, payment.currency)}
                  {payment.currency !== 'USD' && payment.fx_rate && (
                    <span className="text-gray-500 ml-2">
                      (FX rate: {payment.fx_rate})
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Building className="h-4 w-4" />
                  Account
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {payment.account_name || payment.account_id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getPaymentTypeLabel(payment.payment_type)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Funding Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getFundingTypeLabel(payment.funding_type || 'external')}
                </dd>
              </div>
              {payment.funding_type === 'internal' && payment.destination_account_id && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Destination Account</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {payment.destination_account_name || payment.destination_account_id}
                  </dd>
                </div>
              )}
              {payment.funding_type === 'external' && payment.ext_bank_name && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{payment.ext_bank_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Routing Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{payment.ext_routing_number}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bank Account</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{payment.ext_bank_account}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Recipient Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{payment.ext_recipient_address}</dd>
                  </div>
                  {payment.ext_special_instructions && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Special Instructions</dt>
                      <dd className="mt-1 text-sm text-gray-900">{payment.ext_special_instructions}</dd>
                    </div>
                  )}
                </>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Requested By</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {payment.requester_name || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Calendar className="h-4 w-4" />
                  Requested Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(payment.requested_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(payment.created_at)}
                </dd>
              </div>
              {payment.actual_execution_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Execution Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(payment.actual_execution_date)}
                  </dd>
                </div>
              )}
              {payment.bank_reference && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bank Reference</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {payment.bank_reference}
                  </dd>
                </div>
              )}
              {payment.is_recurring && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Recurring</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {payment.recurring_frequency}
                    {payment.recurring_end_date &&
                      ` until ${formatDate(payment.recurring_end_date)}`}
                  </dd>
                </div>
              )}
              {payment.is_duplicate_flagged && (
                <div className="sm:col-span-2">
                  <dd className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 rounded-md px-3 py-2">
                    <AlertCircle className="h-4 w-4" />
                    This payment has been flagged as a potential duplicate
                  </dd>
                </div>
              )}
            </dl>

            {/* Business Justification */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Business Justification
              </h3>
              <p className="text-sm text-gray-900 bg-gray-50 rounded-md p-3">
                {payment.business_justification}
              </p>
            </div>

            {/* Bank Rejection Reason */}
            {payment.bank_rejection_reason && (
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Bank Rejection Reason
                </h3>
                <p className="text-sm text-red-700">
                  {payment.bank_rejection_reason}
                </p>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {timeline.map((event, index) => (
                    <div key={index} className="relative flex gap-4">
                      <div className="relative z-10 flex-shrink-0 bg-white p-0.5">
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {event.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDateTime(event.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Approval Chain Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Chain</h2>
            {approvals.length === 0 ? (
              <p className="text-sm text-gray-500">
                {payment.status === 'draft'
                  ? 'Submit this payment to start the approval process.'
                  : 'No approval steps found.'}
              </p>
            ) : (
              <div className="space-y-4">
                {approvals
                  .sort((a: any, b: any) => a.step_number - b.step_number)
                  .map((approval: any, index: number) => (
                    <div key={approval.id} className="relative">
                      {/* Connector line */}
                      {index < approvals.length - 1 && (
                        <div className="absolute left-[17px] top-10 bottom-0 w-0.5 bg-gray-200 -mb-4" />
                      )}
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getApprovalActionIcon(approval.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">
                              STEP {approval.step_number}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getApprovalActionColor(
                                approval.action
                              )}`}
                            >
                              {getApprovalActionLabel(approval.action)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {approval.action !== 'pending'
                              ? (approval.approver_name || getPoolLabel(approval))
                              : approval.approver_pool
                                ? getPoolLabel(approval)
                                : (approval.approver_name || getRoleLabel(approval.approver_role))}
                          </p>
                          {!approval.approver_pool && (
                            <p className="text-xs text-gray-500">
                              {getRoleLabel(approval.approver_role)}
                            </p>
                          )}
                          {approval.approver_pool && approval.action === 'pending' && (
                            <p className="text-xs text-cyan-600">Pool-based approval</p>
                          )}
                          {approval.comment && (
                            <p className="text-sm text-gray-600 mt-1 italic">
                              &ldquo;{approval.comment}&rdquo;
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {approval.actioned_at
                              ? formatDateTime(approval.actioned_at)
                              : approval.notified_at
                                ? `Notified ${formatDateTime(approval.notified_at)} (${getWaitTime(approval.notified_at)})`
                                : 'Waiting'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Payment Status Summary */}
          {payment.total_approval_steps && payment.total_approval_steps > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Approval Progress</h2>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 rounded-full h-2 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((approvals.filter((a: any) => a.action === 'approved').length) /
                          payment.total_approval_steps) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {approvals.filter((a: any) => a.action === 'approved').length}/
                  {payment.total_approval_steps}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Step {payment.current_approval_step} of {payment.total_approval_steps}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Approval Action Modal */}
      {showApprovalActions && approvalAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {approvalAction === 'approve' && <><CheckCircle className="h-5 w-5 text-green-500" /> Approve Payment</>}
              {approvalAction === 'reject' && <><XCircle className="h-5 w-5 text-red-500" /> Reject Payment</>}
              {approvalAction === 'return' && <><RotateCcw className="h-5 w-5 text-orange-500" /> Return Payment</>}
            </h3>
            <p className="text-gray-500 mt-2">
              {approvalAction === 'approve' && 'Add an optional comment and confirm approval.'}
              {approvalAction === 'reject' && 'Please provide a reason for rejection.'}
              {approvalAction === 'return' && 'Please explain what information is needed.'}
            </p>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder={approvalAction === 'approve' ? 'Optional comment...' : 'Required comment...'}
              className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowApprovalActions(false); setApprovalComment(''); setApprovalAction(null); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalAction}
                disabled={
                  (approvalAction !== 'approve' && !approvalComment.trim()) ||
                  approvePayment.isPending || rejectPayment.isPending || returnPayment.isPending
                }
                className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                  approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {approvePayment.isPending || rejectPayment.isPending || returnPayment.isPending
                  ? 'Processing...'
                  : approvalAction === 'approve' ? 'Confirm Approval'
                  : approvalAction === 'reject' ? 'Confirm Rejection'
                  : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Cancel Payment
            </h3>
            <p className="text-gray-500 mt-2">
              Are you sure you want to cancel this payment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Keep Payment
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelPayment.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {cancelPayment.isPending ? 'Cancelling...' : 'Cancel Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
