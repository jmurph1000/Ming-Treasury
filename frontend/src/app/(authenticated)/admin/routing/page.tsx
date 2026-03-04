'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routingApi, accountsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RoutingRule {
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
  num_approvers: number;
  is_active: boolean;
}

interface Account {
  id: string;
  name: string;
}

const TRIGGER_TYPES = [
  { value: 'amount_range', label: 'Amount Range', description: 'Based on payment amount (USD equivalent)' },
  { value: 'payment_type', label: 'Payment Type', description: 'Based on ACH, Wire, Check, or Internal' },
  { value: 'account', label: 'Source Account', description: 'Based on the source bank account' },
  { value: 'department', label: 'Department', description: 'Based on requester department' },
];

const PAYMENT_TYPES = [
  { value: 'ach', label: 'ACH Transfer' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'internal', label: 'Internal Transfer' },
];

export default function RoutingRulesPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['routing-rules'],
    queryFn: () => routingApi.list(),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const rules = (rulesData?.data || []).sort((a: RoutingRule, b: RoutingRule) => a.priority - b.priority);
  const accounts = accountsData?.data || [];

  const deleteRule = useMutation({
    mutationFn: (id: string) => routingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const getAccountName = (accountId: string) => {
    const account = accounts.find((a: Account) => a.id === accountId);
    return account?.name || accountId;
  };

  const getTriggerDescription = (rule: RoutingRule) => {
    switch (rule.trigger_type) {
      case 'amount_range':
        if (rule.min_amount && rule.max_amount) {
          return `${formatCurrency(rule.min_amount)} - ${formatCurrency(rule.max_amount)}`;
        } else if (rule.min_amount) {
          return `${formatCurrency(rule.min_amount)}+`;
        } else if (rule.max_amount) {
          return `Up to ${formatCurrency(rule.max_amount)}`;
        }
        return 'Any amount';
      case 'payment_type':
        return PAYMENT_TYPES.find(p => p.value === rule.payment_type)?.label || rule.payment_type;
      case 'account':
        return getAccountName(rule.account_id || '');
      case 'department':
        return rule.department || 'Any department';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routing Rules</h1>
          <p className="text-gray-500 mt-1">
            Define approval routing based on amount, type, or account
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Rule
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Rule Priority</p>
            <p className="text-blue-700 text-sm mt-1">
              Rules are evaluated in priority order (lowest number first). The first matching rule determines the approval workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No routing rules</h3>
            <p className="text-gray-500 mt-1">Create your first routing rule to define approval workflows.</p>
          </div>
        ) : (
          <div className="divide-y">
            {rules.map((rule: RoutingRule, index: number) => (
              <div key={rule.id} className={`${!rule.is_active ? 'opacity-50 bg-gray-50' : ''}`}>
                <div
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                >
                  <div className="flex items-center gap-3 text-gray-400">
                    <GripVertical className="h-5 w-5" />
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      #{rule.priority}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">{rule.name}</h4>
                      {!rule.is_active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {rule.description || 'No description'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-gray-500">Trigger</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {rule.trigger_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Condition</p>
                      <p className="font-medium text-gray-900">
                        {getTriggerDescription(rule)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Approvers</p>
                      <p className="font-medium text-gray-900">
                        {rule.num_approvers} step{rule.num_approvers !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRule(rule);
                      }}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this rule?')) {
                          deleteRule.mutate(rule.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    {expandedRule === rule.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedRule === rule.id && (
                  <div className="px-6 py-4 bg-gray-50 border-t">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Trigger Details</h5>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Type:</dt>
                            <dd className="text-gray-900 capitalize">{rule.trigger_type.replace('_', ' ')}</dd>
                          </div>
                          {rule.trigger_type === 'amount_range' && (
                            <>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">Min Amount:</dt>
                                <dd className="text-gray-900">{rule.min_amount ? formatCurrency(rule.min_amount) : 'None'}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">Max Amount:</dt>
                                <dd className="text-gray-900">{rule.max_amount ? formatCurrency(rule.max_amount) : 'None'}</dd>
                              </div>
                            </>
                          )}
                          {rule.trigger_type === 'payment_type' && (
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Payment Type:</dt>
                              <dd className="text-gray-900">{PAYMENT_TYPES.find(p => p.value === rule.payment_type)?.label}</dd>
                            </div>
                          )}
                          {rule.trigger_type === 'account' && (
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Account:</dt>
                              <dd className="text-gray-900">{getAccountName(rule.account_id || '')}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Approval Flow</h5>
                        <p className="text-sm text-gray-600">
                          {rule.num_approvers} sequential approval step{rule.num_approvers !== 1 ? 's' : ''} required.
                          Configure specific approvers in the Approval Chains section.
                        </p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Status</h5>
                        <p className="text-sm text-gray-600">
                          {rule.is_active
                            ? 'This rule is active and will be evaluated for matching payments.'
                            : 'This rule is inactive and will be skipped during evaluation.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SOX Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-800 font-medium">Audit Trail</p>
          <p className="text-blue-700 text-sm mt-1">
            All changes to routing rules are logged for SOX compliance. Rule changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingRule) && (
        <RuleModal
          rule={editingRule}
          accounts={accounts}
          maxPriority={rules.length > 0 ? Math.max(...rules.map((r: RoutingRule) => r.priority)) : 0}
          onClose={() => {
            setShowAddModal(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}

function RuleModal({
  rule,
  accounts,
  maxPriority,
  onClose,
}: {
  rule: RoutingRule | null;
  accounts: Account[];
  maxPriority: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!rule;

  const [formData, setFormData] = useState({
    priority: rule?.priority?.toString() || (maxPriority + 1).toString(),
    name: rule?.name || '',
    description: rule?.description || '',
    trigger_type: rule?.trigger_type || 'amount_range',
    account_id: rule?.account_id || '',
    payment_type: rule?.payment_type || 'ach',
    min_amount: rule?.min_amount?.toString() || '',
    max_amount: rule?.max_amount?.toString() || '',
    department: rule?.department || '',
    num_approvers: rule?.num_approvers?.toString() || '1',
    is_active: rule?.is_active ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        ...formData,
        priority: parseInt(formData.priority),
        min_amount: formData.min_amount ? parseFloat(formData.min_amount) : null,
        max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
        num_approvers: parseInt(formData.num_approvers),
        account_id: formData.trigger_type === 'account' ? formData.account_id : null,
        payment_type: formData.trigger_type === 'payment_type' ? formData.payment_type : null,
        department: formData.trigger_type === 'department' ? formData.department : null,
      };
      return isEditing ? routingApi.update(rule.id, data) : routingApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Routing Rule' : 'Add Routing Rule'}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <input
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Large Payments Over $50K"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Describe when this rule applies..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger Type *
            </label>
            <div className="space-y-2">
              {TRIGGER_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.trigger_type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="trigger_type"
                    value={type.value}
                    checked={formData.trigger_type === type.value}
                    onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Trigger-specific fields */}
          {formData.trigger_type === 'amount_range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Amount (USD)
                </label>
                <input
                  type="number"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Amount (USD)
                </label>
                <input
                  type="number"
                  value={formData.max_amount}
                  onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                  placeholder="No limit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {formData.trigger_type === 'payment_type' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          )}

          {formData.trigger_type === 'account' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Account
              </label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select an account...</option>
                {accounts.map((account: Account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.trigger_type === 'department' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Engineering"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Approval Steps *
            </label>
            <select
              value={formData.num_approvers}
              onChange={(e) => setFormData({ ...formData, num_approvers: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="1">1 Approver</option>
              <option value="2">2 Approvers (Sequential)</option>
              <option value="3">3 Approvers (Sequential)</option>
              <option value="4">4 Approvers (Sequential)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Configure specific approvers for each step in the Approval Chains section.
            </p>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary rounded"
            />
            <span className="text-sm text-gray-700">Rule is active</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!formData.name || !formData.priority || saveMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
