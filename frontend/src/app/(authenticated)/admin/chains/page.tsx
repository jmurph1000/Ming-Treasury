'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routingApi, chainsApi } from '@/lib/api';
import {
  Link2,
  ChevronDown,
  ChevronRight,
  Users,
  Clock,
  Save,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RoutingRule {
  id: string;
  priority: number;
  name: string;
  num_approvers: number;
  is_active: boolean;
}

interface ApprovalChain {
  id: string;
  rule_id: string;
  step: number;
  approver_role?: string;
  specific_approver_id?: string;
  escalation_hours: number;
  escalation_role?: string;
}

const ROLES = [
  { value: 'ap_staff', label: 'AP Staff' },
  { value: 'ap_manager', label: 'AP Manager' },
  { value: 'sr_ap_manager', label: 'Sr. AP Manager' },
  { value: 'treasury', label: 'Treasury' },
  { value: 'cfo', label: 'CFO' },
];

export default function ApprovalChainsPage() {
  const queryClient = useQueryClient();
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [editingChains, setEditingChains] = useState<Record<string, ApprovalChain[]>>({});
  const [savingRule, setSavingRule] = useState<string | null>(null);

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['routing-rules'],
    queryFn: () => routingApi.list(),
  });

  const rules = (rulesData?.data || [])
    .filter((r: RoutingRule) => r.is_active)
    .sort((a: RoutingRule, b: RoutingRule) => a.priority - b.priority);

  // Fetch chains for expanded rule
  const { data: chainsData } = useQuery({
    queryKey: ['approval-chains', expandedRule],
    queryFn: () => chainsApi.get(expandedRule!),
    enabled: !!expandedRule,
  });

  const saveChains = useMutation({
    mutationFn: ({ ruleId, chains }: { ruleId: string; chains: ApprovalChain[] }) =>
      chainsApi.update(ruleId, chains),
    onSuccess: (_, { ruleId }) => {
      queryClient.invalidateQueries({ queryKey: ['approval-chains', ruleId] });
      setSavingRule(null);
      // Clear editing state for this rule
      setEditingChains((prev) => {
        const next = { ...prev };
        delete next[ruleId];
        return next;
      });
    },
  });

  const handleExpandRule = (ruleId: string) => {
    if (expandedRule === ruleId) {
      setExpandedRule(null);
    } else {
      setExpandedRule(ruleId);
    }
  };

  const getChains = (ruleId: string, numApprovers: number): ApprovalChain[] => {
    // Check if we're editing this rule
    if (editingChains[ruleId]) {
      return editingChains[ruleId];
    }

    // Otherwise return data from API or generate empty chains
    if (chainsData?.data && expandedRule === ruleId) {
      const existingChains = chainsData.data as ApprovalChain[];
      // Ensure we have the right number of steps
      const chains: ApprovalChain[] = [];
      for (let i = 1; i <= numApprovers; i++) {
        const existing = existingChains.find((c) => c.step === i);
        chains.push(
          existing || {
            id: `new-${i}`,
            rule_id: ruleId,
            step: i,
            approver_role: '',
            escalation_hours: 24,
          }
        );
      }
      return chains;
    }

    // Generate empty chains
    return Array.from({ length: numApprovers }, (_, i) => ({
      id: `new-${i + 1}`,
      rule_id: ruleId,
      step: i + 1,
      approver_role: '',
      escalation_hours: 24,
    }));
  };

  const updateChain = (ruleId: string, step: number, field: string, value: any, numApprovers: number) => {
    const currentChains = getChains(ruleId, numApprovers);
    const updatedChains = currentChains.map((chain) => {
      if (chain.step === step) {
        return { ...chain, [field]: value };
      }
      return chain;
    });
    setEditingChains((prev) => ({
      ...prev,
      [ruleId]: updatedChains,
    }));
  };

  const handleSaveChains = (ruleId: string, numApprovers: number) => {
    const chains = getChains(ruleId, numApprovers);
    setSavingRule(ruleId);
    saveChains.mutate({ ruleId, chains });
  };

  const hasUnsavedChanges = (ruleId: string) => {
    return !!editingChains[ruleId];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approval Chains</h1>
        <p className="text-gray-500 mt-1">
          Configure approval chain steps and escalation rules for each routing rule
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Sequential Approval</p>
            <p className="text-blue-700 text-sm mt-1">
              Approvals proceed sequentially - each step must complete before the next begins.
              Escalation occurs automatically if an approver doesn't respond within the configured time.
            </p>
          </div>
        </div>
      </div>

      {/* Rules with Chains */}
      <div className="space-y-4">
        {rulesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Active Routing Rules</h3>
            <p className="text-gray-500 mt-1">
              Create routing rules first, then configure their approval chains here.
            </p>
          </div>
        ) : (
          rules.map((rule: RoutingRule) => (
            <div key={rule.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Rule Header */}
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => handleExpandRule(rule.id)}
              >
                <div className="flex items-center gap-4">
                  {expandedRule === rule.id ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        #{rule.priority}
                      </span>
                      <h3 className="font-medium text-gray-900">{rule.name}</h3>
                      {hasUnsavedChanges(rule.id) && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                          Unsaved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {rule.num_approvers} approval step{rule.num_approvers !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Chain Configuration */}
              {expandedRule === rule.id && (
                <div className="border-t bg-gray-50 p-6">
                  <div className="space-y-4">
                    {getChains(rule.id, rule.num_approvers).map((chain, index) => (
                      <div
                        key={chain.step}
                        className="bg-white rounded-lg border p-4"
                      >
                        <div className="flex items-start gap-4">
                          {/* Step Number */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                              {chain.step}
                            </div>
                          </div>

                          {/* Step Configuration */}
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Users className="h-4 w-4 inline mr-1" />
                                Approver Role
                              </label>
                              <select
                                value={chain.approver_role || ''}
                                onChange={(e) =>
                                  updateChain(rule.id, chain.step, 'approver_role', e.target.value, rule.num_approvers)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              >
                                <option value="">Select role...</option>
                                {ROLES.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Any user with this role can approve
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Clock className="h-4 w-4 inline mr-1" />
                                Escalation Time
                              </label>
                              <select
                                value={chain.escalation_hours}
                                onChange={(e) =>
                                  updateChain(rule.id, chain.step, 'escalation_hours', parseInt(e.target.value), rule.num_approvers)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              >
                                <option value={4}>4 hours</option>
                                <option value={8}>8 hours</option>
                                <option value={12}>12 hours</option>
                                <option value={24}>24 hours</option>
                                <option value={48}>48 hours</option>
                                <option value={72}>72 hours</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Escalate if no action within this time
                              </p>
                            </div>
                          </div>

                          {/* Arrow to next step */}
                          {index < rule.num_approvers - 1 && (
                            <div className="absolute left-11 mt-14 h-6 w-0.5 bg-gray-300" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleSaveChains(rule.id, rule.num_approvers)}
                      disabled={savingRule === rule.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {savingRule === rule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Chain Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* SOX Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-800 font-medium">Segregation of Duties</p>
          <p className="text-blue-700 text-sm mt-1">
            Approval chains enforce segregation of duties by requiring different approvers at each step.
            A user cannot approve a payment they requested or already approved at an earlier step.
          </p>
        </div>
      </div>
    </div>
  );
}
