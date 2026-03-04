'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi, usersApi, accountsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  UsersRound,
  ChevronRight,
  ChevronDown,
  UserPlus,
  UserMinus,
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Save,
  ShieldCheck,
  Plus,
  Trash2,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

type UserRole = 'staff' | 'manager' | 'sr_manager' | 'admin';

interface GroupSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  member_count: number;
  account_count: number;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  department: string;
  title: string;
  added_at: string;
}

interface GroupAccount {
  id: string;
  name: string;
  bank_name: string;
  account_type: string;
  currency: string;
  direction: string;
  funding_type: string;
  assignment_id: string;
}

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  manager: 'Manager',
  sr_manager: 'Senior Manager',
  admin: 'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  staff: 'bg-gray-100 text-gray-800',
  manager: 'bg-blue-100 text-blue-800',
  sr_manager: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

const DIRECTION_LABELS: Record<string, string> = {
  from: 'Pay From',
  to: 'Pay To',
  both: 'Both',
};

const FUNDING_TYPE_LABELS: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  both: 'Both',
};

export default function GroupsManagementPage() {
  const queryClient = useQueryClient();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'accounts' | 'approval_flow'>('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Fetch all groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list(),
  });

  const groups: GroupSummary[] = groupsData?.data || [];

  // Fetch detail for expanded group
  const { data: groupDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['group-detail', expandedGroup],
    queryFn: () => groupsApi.get(expandedGroup!),
    enabled: !!expandedGroup,
  });

  const detail = groupDetail?.data;
  const members: GroupMember[] = detail?.members || [];
  const groupAccounts: GroupAccount[] = detail?.accounts || [];

  const toggleGroup = (id: string) => {
    if (expandedGroup === id) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(id);
      setActiveTab('members');
      setShowAddMember(false);
      setShowManageAccounts(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="ml-2 text-green-600 hover:text-green-800">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <p className="text-gray-500 mt-1">
          Manage department groups, assign members, and control account access per group.
        </p>
      </div>

      {/* Loading */}
      {groupsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Groups List */}
      {!groupsLoading && (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedGroup === group.id;
            return (
              <div key={group.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                  <UsersRound className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{group.name}</p>
                    <p className="text-sm text-gray-500 truncate">{group.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <UserPlus className="h-4 w-4" />
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {group.account_count} account{group.account_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t">
                    {/* Sub-tabs */}
                    <div className="flex border-b bg-gray-50">
                      <button
                        onClick={() => { setActiveTab('members'); setShowManageAccounts(false); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'members'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Members ({members.length})
                      </button>
                      <button
                        onClick={() => { setActiveTab('accounts'); setShowAddMember(false); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'accounts'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Account Access ({groupAccounts.length})
                      </button>
                      <button
                        onClick={() => { setActiveTab('approval_flow'); setShowAddMember(false); setShowManageAccounts(false); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                          activeTab === 'approval_flow'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Approval Flow
                      </button>
                    </div>

                    {detailLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <>
                        {/* Members Tab */}
                        {activeTab === 'members' && (
                          <MembersPanel
                            groupId={group.id}
                            groupName={group.name}
                            members={members}
                            showAddMember={showAddMember}
                            setShowAddMember={setShowAddMember}
                            onSuccess={showSuccess}
                          />
                        )}

                        {/* Accounts Tab */}
                        {activeTab === 'accounts' && (
                          <AccountsPanel
                            groupId={group.id}
                            groupName={group.name}
                            groupAccounts={groupAccounts}
                            showManageAccounts={showManageAccounts}
                            setShowManageAccounts={setShowManageAccounts}
                            onSuccess={showSuccess}
                          />
                        )}

                        {/* Approval Flow Tab */}
                        {activeTab === 'approval_flow' && (
                          <ApprovalFlowPanel
                            groupId={group.id}
                            groupName={group.name}
                            onSuccess={showSuccess}
                          />
                        )}
                      </>
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

// ───────────────────────────────────────────────────────────
// Members Panel
// ───────────────────────────────────────────────────────────
function MembersPanel({
  groupId,
  groupName,
  members,
  showAddMember,
  setShowAddMember,
  onSuccess,
}: {
  groupId: string;
  groupName: string;
  members: GroupMember[];
  showAddMember: boolean;
  setShowAddMember: (v: boolean) => void;
  onSuccess: (msg: string) => void;
}) {
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onSuccess(`Member removed from ${groupName}`);
    },
  });

  return (
    <div className="p-4">
      {/* Add member button */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Group Members</p>
        <button
          onClick={() => setShowAddMember(!showAddMember)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Add member inline */}
      {showAddMember && (
        <AddMemberInline
          groupId={groupId}
          groupName={groupName}
          existingMemberIds={members.map(m => m.id)}
          onDone={() => setShowAddMember(false)}
          onSuccess={onSuccess}
        />
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No members in this group yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-800'}`}>
                {ROLE_LABELS[member.role] || member.role}
              </span>
              <button
                onClick={() => removeMutation.mutate(member.id)}
                disabled={removeMutation.isPending}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove from group"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Add Member Inline
// ───────────────────────────────────────────────────────────
function AddMemberInline({
  groupId,
  groupName,
  existingMemberIds,
  onDone,
  onSuccess,
}: {
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  onDone: () => void;
  onSuccess: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', { status: 'active' }],
    queryFn: () => usersApi.list({ status: 'active' }),
  });

  const allUsers = (usersData?.data || []) as Array<{ id: string; name: string; email: string; role: string }>;
  const availableUsers = allUsers.filter(
    (u) => !existingMemberIds.includes(u.id) &&
      (search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const addMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.addMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onSuccess(`Member added to ${groupName}`);
    },
  });

  return (
    <div className="mb-4 p-3 border border-primary/30 bg-primary/5 rounded-lg">
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {availableUsers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No available users found.</p>
        ) : (
          availableUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => addMutation.mutate(user.id)}
              disabled={addMutation.isPending}
              className="w-full flex items-center gap-3 p-2 text-left text-sm rounded hover:bg-white transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
              <UserPlus className="h-4 w-4 text-primary flex-shrink-0" />
            </button>
          ))
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <button onClick={onDone} className="text-sm text-gray-500 hover:text-gray-700">
          Done
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Accounts Panel
// ───────────────────────────────────────────────────────────
function AccountsPanel({
  groupId,
  groupName,
  groupAccounts,
  showManageAccounts,
  setShowManageAccounts,
  onSuccess,
}: {
  groupId: string;
  groupName: string;
  groupAccounts: GroupAccount[];
  showManageAccounts: boolean;
  setShowManageAccounts: (v: boolean) => void;
  onSuccess: (msg: string) => void;
}) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Account Assignments</p>
        <button
          onClick={() => setShowManageAccounts(!showManageAccounts)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Settings2 className="h-4 w-4" />
          {showManageAccounts ? 'Cancel' : 'Manage Accounts'}
        </button>
      </div>

      {showManageAccounts ? (
        <ManageAccountsForm
          groupId={groupId}
          groupName={groupName}
          currentAccounts={groupAccounts}
          onDone={() => setShowManageAccounts(false)}
          onSuccess={onSuccess}
        />
      ) : groupAccounts.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No accounts assigned to this group.</p>
      ) : (
        <div className="space-y-2">
          {groupAccounts.map((acct) => (
            <div key={acct.assignment_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{acct.name}</p>
                <p className="text-xs text-gray-500">{acct.bank_name} &middot; {acct.account_type} &middot; {acct.currency}</p>
              </div>
              <DirectionBadge direction={acct.direction} />
              <FundingBadge fundingType={acct.funding_type} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  const icon = direction === 'from' ? <ArrowRight className="h-3 w-3" />
    : direction === 'to' ? <ArrowLeft className="h-3 w-3" />
    : <ArrowLeftRight className="h-3 w-3" />;
  const color = direction === 'both' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {DIRECTION_LABELS[direction] || direction}
    </span>
  );
}

function FundingBadge({ fundingType }: { fundingType: string }) {
  const color = fundingType === 'both' ? 'bg-purple-100 text-purple-800'
    : fundingType === 'internal' ? 'bg-green-100 text-green-700'
    : 'bg-orange-100 text-orange-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {FUNDING_TYPE_LABELS[fundingType] || fundingType}
    </span>
  );
}

// ───────────────────────────────────────────────────────────
// Manage Accounts Form
// ───────────────────────────────────────────────────────────
interface AccountAssignment {
  accountId: string;
  direction: string;
  fundingType: string;
}

function ManageAccountsForm({
  groupId,
  groupName,
  currentAccounts,
  onDone,
  onSuccess,
}: {
  groupId: string;
  groupName: string;
  currentAccounts: GroupAccount[];
  onDone: () => void;
  onSuccess: (msg: string) => void;
}) {
  const queryClient = useQueryClient();

  // Fetch all accounts
  const { data: allAccountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const allAccounts = (allAccountsData?.data || []) as Array<{ id: string; name: string; bank_name: string; account_type: string; currency: string }>;

  // Build initial assignments from current group accounts
  const [assignments, setAssignments] = useState<AccountAssignment[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && currentAccounts.length >= 0) {
      setAssignments(
        currentAccounts.map((a) => ({
          accountId: a.id,
          direction: a.direction,
          fundingType: a.funding_type,
        }))
      );
      setInitialized(true);
    }
  }, [currentAccounts, initialized]);

  const toggleAccount = (accountId: string) => {
    setAssignments((prev) => {
      const existing = prev.find(a => a.accountId === accountId);
      if (existing) {
        return prev.filter(a => a.accountId !== accountId);
      }
      return [...prev, { accountId, direction: 'both', fundingType: 'both' }];
    });
  };

  const updateAssignment = (accountId: string, field: 'direction' | 'fundingType', value: string) => {
    setAssignments((prev) =>
      prev.map(a => a.accountId === accountId ? { ...a, [field]: value } : a)
    );
  };

  const saveMutation = useMutation({
    mutationFn: () => groupsApi.updateAccounts(groupId, assignments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onSuccess(`Account access updated for ${groupName}`);
      onDone();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Select accounts and configure direction (Pay From / Pay To) and funding type (Internal / External) for each.
      </p>

      <div className="space-y-2">
        {allAccounts.map((account) => {
          const assignment = assignments.find(a => a.accountId === account.id);
          const isSelected = !!assignment;

          return (
            <div
              key={account.id}
              className={`border rounded-lg transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            >
              {/* Account row */}
              <label className="flex items-center gap-3 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleAccount(account.id)}
                  className="h-4 w-4 text-primary focus:ring-primary rounded"
                />
                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{account.name}</p>
                  <p className="text-xs text-gray-500">{account.bank_name} &middot; {account.account_type} &middot; {account.currency}</p>
                </div>
              </label>

              {/* Settings row (visible when selected) */}
              {isSelected && (
                <div className="px-3 pb-3 pt-0 flex gap-4 items-center border-t border-gray-100 mt-0 pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-medium">Direction:</label>
                    <select
                      value={assignment!.direction}
                      onChange={(e) => updateAssignment(account.id, 'direction', e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="from">Pay From</option>
                      <option value="to">Pay To</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-medium">Funding:</label>
                    <select
                      value={assignment!.fundingType}
                      onChange={(e) => updateAssignment(account.id, 'fundingType', e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save / Cancel */}
      <div className="flex justify-between items-center pt-2">
        <span className="text-sm text-gray-500">
          {assignments.length} of {allAccounts.length} account(s) selected
        </span>
        <div className="flex gap-3">
          <button
            onClick={onDone}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4" /> Save Accounts</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Routing Configuration Panel
// ───────────────────────────────────────────────────────────

const POOL_OPTIONS = [
  { value: 'group_or_treasury', label: 'Any Group Member or Treasury' },
  { value: 'senior_or_treasury', label: 'Sr Manager, Admin, or Treasury' },
  { value: 'treasury_only', label: 'Treasury Only' },
];

interface TierConfig {
  label: string;
  minAmount: number | null;
  maxAmount: number | null;
  steps: StepConfig[];
}

interface StepConfig {
  step: number;
  approverPool: string;
  approverMode: string;
  approverRole: string;
  specificApproverId: string;
  escalationHours: number;
}

function newStep(stepNum: number): StepConfig {
  return { step: stepNum, approverPool: 'group_or_treasury', approverMode: 'pool', approverRole: '', specificApproverId: '', escalationHours: 24 };
}

function newTier(label: string): TierConfig {
  return { label, minAmount: null, maxAmount: null, steps: [newStep(1)] };
}

const DEFAULT_ROUTING_TIERS: TierConfig[] = [
  { label: 'Under $10,000', minAmount: 0, maxAmount: 9999.99,
    steps: [{ step: 1, approverPool: 'group_or_treasury', approverMode: 'pool', approverRole: '', specificApproverId: '', escalationHours: 24 }] },
  { label: '$10,000 - $50,000', minAmount: 10000, maxAmount: 49999.99,
    steps: [{ step: 1, approverPool: 'senior_or_treasury', approverMode: 'pool', approverRole: '', specificApproverId: '', escalationHours: 24 }] },
  { label: '$50,000 - $250,000', minAmount: 50000, maxAmount: 249999.99,
    steps: [
      { step: 1, approverPool: 'group_or_treasury', approverMode: 'pool', approverRole: '', specificApproverId: '', escalationHours: 24 },
      { step: 2, approverPool: 'treasury_only', approverMode: 'pool', approverRole: '', specificApproverId: '', escalationHours: 24 },
    ] },
  { label: 'Over $250,000', minAmount: 250000, maxAmount: null,
    steps: [
      { step: 1, approverPool: 'treasury_only', approverMode: 'pool', approverRole: '', specificApproverId: '', escalationHours: 24 },
      { step: 2, approverPool: 'treasury_only', approverMode: 'pool', approverRole: '', specificApproverId: '', escalationHours: 24 },
    ] },
];

function ApprovalFlowPanel({
  groupId,
  groupName,
  onSuccess,
}: {
  groupId: string;
  groupName: string;
  onSuccess: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [routingMode, setRoutingMode] = useState<'approval_chain' | 'routing_rules'>('approval_chain');
  const [chainOption, setChainOption] = useState<'one_approver' | 'two_approvers'>('one_approver');
  const [tiers, setTiers] = useState<TierConfig[]>(DEFAULT_ROUTING_TIERS);
  const [initialized, setInitialized] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch existing approval flow
  const { data: flowData, isLoading } = useQuery({
    queryKey: ['group-approval-flow', groupId],
    queryFn: () => groupsApi.getApprovalFlow(groupId),
  });

  // Initialize from fetched data
  useEffect(() => {
    if (!initialized && flowData?.data) {
      const d = flowData.data;
      setOverrideEnabled(d.overrideApprovalFlow);
      setRoutingMode(d.routingMode || 'approval_chain');
      setChainOption(d.approvalChainOption || 'one_approver');

      if (d.routingMode === 'routing_rules' && d.tiers.length > 0) {
        setTiers(d.tiers.map((t) => ({
          label: t.label,
          minAmount: t.min_amount,
          maxAmount: t.max_amount,
          steps: t.steps.length > 0
            ? t.steps.map((s) => ({
                step: s.step,
                approverPool: s.approver_pool || 'group_or_treasury',
                approverMode: s.approver_mode || 'pool',
                approverRole: s.approver_role || '',
                specificApproverId: s.specific_approver_id || '',
                escalationHours: s.escalation_hours,
              }))
            : [newStep(1)],
        })));
      }
      setInitialized(true);
    }
  }, [flowData, initialized]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => groupsApi.updateApprovalFlow(groupId, {
      overrideApprovalFlow: overrideEnabled,
      routingMode,
      approvalChainOption: chainOption,
      tiers: routingMode === 'routing_rules' ? tiers.map((t) => ({
        label: t.label,
        minAmount: t.minAmount,
        maxAmount: t.maxAmount,
        steps: t.steps.map((s) => ({
          step: s.step,
          approverMode: 'pool',
          approverPool: s.approverPool,
          escalationHours: s.escalationHours,
        })),
      })) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-approval-flow', groupId] });
      onSuccess(`Routing configuration updated for ${groupName}`);
    },
  });

  // Tier helpers
  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const nextMin = lastTier.maxAmount !== null ? lastTier.maxAmount + 0.01 : 0;
    setTiers([...tiers, { label: `$${Math.round(nextMin).toLocaleString()}+`, minAmount: nextMin, maxAmount: null, steps: [newStep(1)] }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, updates: Partial<TierConfig>) => {
    setTiers(tiers.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const addStep = (tierIndex: number) => {
    const tier = tiers[tierIndex];
    if (tier.steps.length >= 2) return;
    updateTier(tierIndex, { steps: [...tier.steps, newStep(2)] });
  };

  const removeStep = (tierIndex: number, stepIndex: number) => {
    const tier = tiers[tierIndex];
    if (tier.steps.length <= 1) return;
    updateTier(tierIndex, { steps: tier.steps.filter((_, i) => i !== stepIndex) });
  };

  const updateStep = (tierIndex: number, stepIndex: number, updates: Partial<StepConfig>) => {
    const tier = tiers[tierIndex];
    const newSteps = tier.steps.map((s, i) => i === stepIndex ? { ...s, ...updates } : s);
    updateTier(tierIndex, { steps: newSteps });
  };

  const handleSave = () => {
    setValidationError(null);

    if (overrideEnabled && routingMode === 'routing_rules') {
      for (const tier of tiers) {
        if (tier.steps.length === 0) {
          setValidationError(`Tier "${tier.label}" must have at least one approval step`);
          return;
        }
      }
    }

    saveMutation.mutate();
  };

  const changeHistory = flowData?.data?.changeHistory || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Override Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">Override Global Routing Rules</p>
            <p className="text-xs text-gray-500">Use a custom approval flow for this group instead of global rules</p>
          </div>
        </div>
        <button
          onClick={() => setOverrideEnabled(!overrideEnabled)}
          className="flex items-center"
        >
          {overrideEnabled
            ? <ToggleRight className="h-8 w-8 text-primary" />
            : <ToggleLeft className="h-8 w-8 text-gray-400" />}
        </button>
      </div>

      {/* Override Disabled Info */}
      {!overrideEnabled && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Using Global Routing Rules</p>
            <p className="mt-1">Payments from members of this group will follow the system-wide routing rules configured under Admin &gt; Routing Rules.</p>
          </div>
        </div>
      )}

      {/* Override Enabled — Configuration */}
      {overrideEnabled && (
        <div className="space-y-4">
          {/* Routing Mode Selector */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Routing Mode</p>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                routingMode === 'approval_chain' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" name="routingMode" checked={routingMode === 'approval_chain'} onChange={() => setRoutingMode('approval_chain')} className="text-primary focus:ring-primary" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Approval Chain</p>
                  <p className="text-xs text-gray-500">Fixed number of approvers for all payments</p>
                </div>
              </label>
              <label className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                routingMode === 'routing_rules' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" name="routingMode" checked={routingMode === 'routing_rules'} onChange={() => setRoutingMode('routing_rules')} className="text-primary focus:ring-primary" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Routing Rules</p>
                  <p className="text-xs text-gray-500">Different approval flows by dollar amount</p>
                </div>
              </label>
            </div>
          </div>

          {/* ── Approval Chain Mode ── */}
          {routingMode === 'approval_chain' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Choose how many approvals are required before a payment is ready for execution.</p>

              {/* Option A: 1 Approver */}
              <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                chainOption === 'one_approver' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="chainOption" checked={chainOption === 'one_approver'} onChange={() => setChainOption('one_approver')} className="text-primary focus:ring-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Option A &mdash; 1 Approver</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">Initiator</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded font-medium">1 Approver</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded font-medium">Ready</span>
                    </div>
                  </div>
                </div>
              </label>

              {/* Option B: 2 Approvers */}
              <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                chainOption === 'two_approvers' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="chainOption" checked={chainOption === 'two_approvers'} onChange={() => setChainOption('two_approvers')} className="text-primary focus:ring-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Option B &mdash; 2 Approvers</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">Initiator</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded font-medium">Approver 1</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded font-medium">Approver 2</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded font-medium">Ready</span>
                    </div>
                  </div>
                </div>
              </label>

              {/* Info box */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Any group member or Treasury admin can approve. The initiator cannot approve their own request.
                </p>
              </div>
            </div>
          )}

          {/* ── Routing Rules Mode ── */}
          {routingMode === 'routing_rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Configure approval tiers based on payment amount. Each tier specifies who can approve and how many approvals are needed.</p>
                <button
                  onClick={() => setTiers(DEFAULT_ROUTING_TIERS.map(t => ({ ...t, steps: t.steps.map(s => ({ ...s })) })))}
                  className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap ml-4"
                >
                  Reset to Defaults
                </button>
              </div>

              {/* Tier Cards */}
              {tiers.map((tier, tierIndex) => (
                <div key={tierIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Tier Header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => updateTier(tierIndex, { label: e.target.value })}
                          className="text-sm font-medium text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-primary focus:outline-none px-0 py-0 w-48"
                        />
                        <span className="text-xs text-gray-500">
                          {tier.minAmount !== null ? `$${tier.minAmount.toLocaleString()}` : '$0'}
                          {' — '}
                          {tier.maxAmount !== null ? `$${tier.maxAmount.toLocaleString()}` : 'No limit'}
                        </span>
                      </div>
                    </div>
                    {tiers.length > 1 && (
                      <button onClick={() => removeTier(tierIndex)} className="p-1 text-red-400 hover:text-red-600 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Amount range inputs */}
                  <div className="px-4 py-2 bg-gray-50/50 border-b flex gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Min $</label>
                      <input
                        type="number"
                        value={tier.minAmount ?? ''}
                        onChange={(e) => updateTier(tierIndex, { minAmount: e.target.value === '' ? null : parseFloat(e.target.value) })}
                        className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Max $</label>
                      <input
                        type="number"
                        value={tier.maxAmount ?? ''}
                        onChange={(e) => updateTier(tierIndex, { maxAmount: e.target.value === '' ? null : parseFloat(e.target.value) })}
                        className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="No limit"
                      />
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="p-4 space-y-3">
                    {/* Visual Flow Diagram */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">Initiator</span>
                      <ArrowRight className="h-3 w-3" />
                      {tier.steps.map((step, sIdx) => (
                        <span key={sIdx} className="contents">
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded font-medium">
                            Approver {step.step}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      ))}
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded font-medium">Ready</span>
                    </div>

                    {tier.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <select
                            value={step.approverPool}
                            onChange={(e) => updateStep(tierIndex, stepIndex, { approverPool: e.target.value })}
                            className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                          >
                            {POOL_OPTIONS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        {tier.steps.length > 1 && (
                          <button onClick={() => removeStep(tierIndex, stepIndex)} className="p-1 text-red-400 hover:text-red-600 rounded flex-shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {tier.steps.length < 2 && (
                      <button
                        onClick={() => addStep(tierIndex)}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Step 2 (Two-Step Approval)
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Tier button */}
              <button
                onClick={addTier}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Tier
              </button>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {validationError}
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2 border-t">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4" /> Save Configuration</>
          )}
        </button>
      </div>

      {/* Change History */}
      {changeHistory.length > 0 && (
        <div className="border-t pt-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {showHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Change History ({changeHistory.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {changeHistory.map((entry: any) => {
                let oldCfg: any = {};
                let newCfg: any = {};
                try { oldCfg = JSON.parse(entry.old_config || '{}'); } catch {}
                try { newCfg = JSON.parse(entry.new_config || '{}'); } catch {}
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded text-xs">
                    <div className="flex-1">
                      <p className="font-medium text-gray-700">{entry.changed_by_name || entry.changed_by_email}</p>
                      <p className="text-gray-500 mt-0.5">
                        {newCfg.routingMode ? `Set routing mode to ${newCfg.routingMode === 'approval_chain' ? 'Approval Chain' : 'Routing Rules'}` : entry.change_type}
                        {newCfg.approvalChainOption ? ` (${newCfg.approvalChainOption === 'one_approver' ? '1 approver' : '2 approvers'})` : ''}
                        {newCfg.tierCount ? `, ${newCfg.tierCount} tier(s)` : ''}
                      </p>
                    </div>
                    <span className="text-gray-400 whitespace-nowrap">{formatDate(entry.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
