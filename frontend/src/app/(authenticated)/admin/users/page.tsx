'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, accountsApi, groupsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  Mail,
  Building2,
  Loader2,
  Edit2,
} from 'lucide-react';

type UserRole = 'staff' | 'manager' | 'sr_manager' | 'admin';
type UserStatus = 'pending' | 'active' | 'suspended' | 'terminated';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  title?: string;
  manager_name?: string;
  manager_email?: string;
  payment_limit?: number;
  created_at: string;
  last_login_at?: string;
}

interface AccessRequest {
  id: string;
  email: string;
  requested_role: UserRole;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  manager_email?: string;
  manager_name?: string;
  workday_data?: {
    name?: string;
    title?: string;
    department?: string;
    manager_name?: string;
    manager_email?: string;
  };
  created_at: string;
  expires_at: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'Staff',
  manager: 'Manager',
  sr_manager: 'Senior Manager',
  admin: 'Administrator',
};

const ROLE_COLORS: Record<UserRole, string> = {
  staff: 'bg-gray-100 text-gray-800',
  manager: 'bg-blue-100 text-blue-800',
  sr_manager: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

const DEPARTMENTS = [
  'Accounting',
  'Accounts Payable',
  'Other',
  'Payment Ops / Platform Accounting',
  'Payroll',
  'Treasury',
] as const;

const STATUS_CONFIG: Record<UserStatus, { color: string; icon: typeof CheckCircle }> = {
  active: { color: 'text-green-600', icon: CheckCircle },
  pending: { color: 'text-yellow-600', icon: Clock },
  suspended: { color: 'text-red-600', icon: XCircle },
  terminated: { color: 'text-gray-600', icon: XCircle },
};

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [manageAccountsUser, setManageAccountsUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // Auto-hide success message after 5 seconds
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', { search: searchQuery, role: roleFilter, status: statusFilter }],
    queryFn: () => usersApi.list({ search: searchQuery, role: roleFilter || undefined, status: statusFilter || undefined }),
  });

  // Fetch pending access requests
  const { data: requestsData } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => usersApi.listAccessRequests(),
  });

  const allUsers = usersData?.data || [];
  const users = deptFilter ? allUsers.filter((u: User) => u.department === deptFilter) : allUsers;
  const accessRequests = (requestsData?.data || []).filter((r: AccessRequest) => r.status === 'pending');

  // Suspend user mutation
  const suspendUser = useMutation({
    mutationFn: (userId: string) => usersApi.suspend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // Reactivate user mutation
  const reactivateUser = useMutation({
    mutationFn: (userId: string) => usersApi.reactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-2 text-green-600 hover:text-green-800"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">
            Manage user accounts, roles, and access permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Pending Access Requests Alert */}
      {accessRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                {accessRequests.length} Pending Access Request{accessRequests.length !== 1 ? 's' : ''}
              </p>
              <p className="text-amber-700 text-sm mt-1">
                Manager approval is pending for new user requests.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usersLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user: User) => {
                const StatusIcon = STATUS_CONFIG[user.status]?.icon || CheckCircle;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 ${STATUS_CONFIG[user.status]?.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm capitalize">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative" ref={showUserMenu === user.id ? menuRef : undefined}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowUserMenu(showUserMenu === user.id ? null : user.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </button>
                        {showUserMenu === user.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setShowUserMenu(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit User
                              </button>
                              <button
                                onClick={() => {
                                  setManageAccountsUser(user);
                                  setShowUserMenu(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Building2 className="h-4 w-4" />
                                Manage Accounts
                              </button>
                              {user.status === 'active' ? (
                                <button
                                  onClick={() => {
                                    suspendUser.mutate(user.id);
                                    setShowUserMenu(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Suspend User
                                </button>
                              ) : user.status === 'suspended' ? (
                                <button
                                  onClick={() => {
                                    reactivateUser.mutate(user.id);
                                    setShowUserMenu(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-gray-100"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Reactivate User
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onSuccess={(name: string) => showSuccess(`User ${name} has been added successfully`)}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(name: string) => showSuccess(`User ${name} has been updated successfully`)}
        />
      )}

      {/* Manage Accounts Modal */}
      {manageAccountsUser && (
        <ManageAccountsModal
          user={manageAccountsUser}
          onClose={() => setManageAccountsUser(null)}
          onSuccess={(name: string) => showSuccess(`Account access updated for ${name}`)}
        />
      )}
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: (name: string) => void }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<UserRole>(user.role);
  const [department, setDepartment] = useState(
    DEPARTMENTS.includes(user.department as any) ? user.department! : ''
  );
  const [title, setTitle] = useState(user.title || '');
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [paymentLimit, setPaymentLimit] = useState(user.payment_limit?.toString() || '');
  const [errorMessage, setErrorMessage] = useState('');

  const updateMutation = useMutation({
    mutationFn: () => {
      const data: Record<string, any> = {};
      if (role !== user.role) data.role = role;
      if (department !== (user.department || '')) data.department = department || null;
      if (title !== (user.title || '')) data.title = title || null;
      if (status !== user.status) data.status = status;
      const limitNum = paymentLimit ? parseFloat(paymentLimit) : null;
      const origLimit = user.payment_limit ?? null;
      if (limitNum !== origLimit) data.paymentLimit = limitNum;
      if (Object.keys(data).length === 0) {
        return Promise.resolve({ success: true, data: user });
      }
      return usersApi.update(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onSuccess(user.name);
      onClose();
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to update user');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
          <p className="text-sm text-gray-500 mt-1">
            {user.name} &mdash; {user.email}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select department...</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {user.department && !DEPARTMENTS.includes(user.department as any) && (
              <p className="text-xs text-amber-600 mt-1">
                Current value &quot;{user.department}&quot; is not a valid department. Please select one from the list.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Changing department will update group membership automatically.</p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Accountant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            {user.status === 'pending' && (
              <p className="text-xs text-amber-600 mt-1">User is currently pending. Setting to active will grant access.</p>
            )}
          </div>

          {/* Payment Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Limit ($)</label>
            <input
              type="number"
              value={paymentLimit}
              onChange={(e) => setPaymentLimit(e.target.value)}
              placeholder="Leave empty for no limit"
              min="0"
              step="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum single payment amount this user can create. Leave empty for unlimited.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Manage Accounts Modal Component
function ManageAccountsModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: (name: string) => void }) {
  const queryClient = useQueryClient();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch all active accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  // Fetch user's current account access
  const { data: accessData, isLoading: accessLoading } = useQuery({
    queryKey: ['user-account-access', user.id],
    queryFn: () => accountsApi.getUserAccess(user.id),
  });

  const accounts = (accountsData?.data || []) as Array<{ id: string; name: string; bank_name: string; account_type: string; currency: string }>;

  // Initialize selected accounts from current access
  useEffect(() => {
    if (accessData?.data && !isInitialized) {
      setSelectedAccountIds(accessData.data.accountIds || []);
      setIsInitialized(true);
    }
  }, [accessData, isInitialized]);

  const saveMutation = useMutation({
    mutationFn: () => accountsApi.updateUserAccess(user.id, selectedAccountIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-account-access', user.id] });
      onSuccess(user.name);
      onClose();
    },
  });

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const isLoading = accountsLoading || accessLoading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{user.name} — Account Access</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select which bank accounts this user can access
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active accounts found.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccountIds.includes(account.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(account.id)}
                    onChange={() => toggleAccount(account.id)}
                    className="h-4 w-4 text-primary focus:ring-primary rounded"
                  />
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{account.name}</p>
                      <p className="text-xs text-gray-500">
                        {account.bank_name} — {account.account_type} — {account.currency}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedAccountIds.length === 0 && !isLoading && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              No accounts assigned — this user will see all accounts by default.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <div className="text-sm text-gray-500">
            {selectedAccountIds.length} of {accounts.length} account(s) selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Access
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add User Modal Component
function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (name: string) => void }) {
  const queryClient = useQueryClient();
  // Steps: 1 = email entry, 2 = role selection, 3 = review
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [devMode, setDevMode] = useState(true); // Default to dev mode for easier testing

  // Employee data (manual entry in dev mode)
  const [employeeName, setEmployeeName] = useState('');
  const [employeeTitle, setEmployeeTitle] = useState('');
  const [employeeDepartment, setEmployeeDepartment] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Fetch groups for assignment
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list(),
  });
  const allGroups = (groupsData?.data || []) as Array<{ id: string; name: string; slug: string; description: string }>;

  // Fetch accounts for assignment
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });
  const allAccounts = (accountsData?.data || []) as Array<{ id: string; name: string; bank_name: string; account_type: string; currency: string }>;

  // Auto-generate name from email
  const getNameFromEmail = (emailAddr: string) => {
    const nameParts = emailAddr.split('@')[0].split('.');
    const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : '';
    const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';
    return `${firstName} ${lastName}`.trim() || 'New User';
  };

  // Get the display name (manual entry or auto-generated)
  const displayName = employeeName || getNameFromEmail(email);
  const displayTitle = employeeTitle || 'Employee';
  const displayDepartment = employeeDepartment || '';

  // Handle proceeding from step 1 to step 2
  const handleStep1Continue = async () => {
    setErrorMessage('');

    if (devMode) {
      // Dev mode: skip Workday verification, go directly to step 2
      setCurrentStep(2);
      return;
    }

    // Production mode: verify with Workday
    setIsVerifying(true);
    try {
      const response = await usersApi.verifyWorkday(email);
      if (response.success && response.data) {
        setEmployeeName(response.data.name);
        setEmployeeTitle(response.data.title);
        setEmployeeDepartment(response.data.department);
        setCurrentStep(2);
      } else {
        setErrorMessage(response.message || 'Unable to verify employee in Workday');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to connect to Workday. Enable dev mode to continue without verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle proceeding from step 2 to step 3
  const handleStep2Continue = () => {
    setCurrentStep(3);
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const userData = {
        email,
        name: displayName,
        role: selectedRole,
        department: displayDepartment || undefined,
        title: displayTitle || undefined,
        payment_limit: selectedRole === 'staff' ? 50000 :
                       selectedRole === 'manager' ? 250000 :
                       selectedRole === 'sr_manager' ? 500000 : undefined,
        groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
        accountIds: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      };

      if (devMode) {
        return usersApi.createDirect(userData);
      }
      return usersApi.provision({
        email,
        role: selectedRole,
        workdayData: {
          name: displayName,
          title: displayTitle,
          department: displayDepartment,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      if (selectedGroupIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['groups'] });
      }
      onSuccess(displayName);
      onClose();
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to create user. Please try again.');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
            <span className="text-sm text-gray-400">Step {currentStep} of 3</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {currentStep === 1 && 'Enter the employee\'s Gusto email address'}
            {currentStep === 2 && 'Configure user role and permissions'}
            {currentStep === 3 && 'Review and create user'}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* STEP 1: Email Entry */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gusto Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@gusto.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                {email.length > 0 && !email.includes('@') && (
                  <p className="text-sm text-amber-600 mt-1">
                    Please enter a valid email address
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Dev Mode Toggle */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devMode}
                    onChange={(e) => setDevMode(e.target.checked)}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 rounded"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Development Mode</p>
                    <p className="text-amber-700">
                      Skip Workday verification and manager approval
                    </p>
                  </div>
                </label>

                {/* Manual Entry Fields - shown when dev mode is checked */}
                {devMode && (
                  <div className="pt-3 border-t border-amber-200 space-y-3">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Employee Details (Optional)</p>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs text-amber-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={employeeName}
                          onChange={(e) => setEmployeeName(e.target.value)}
                          placeholder={getNameFromEmail(email) || 'Auto-generated from email'}
                          className="w-full px-3 py-1.5 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-amber-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={employeeTitle}
                            onChange={(e) => setEmployeeTitle(e.target.value)}
                            placeholder="Employee"
                            className="w-full px-3 py-1.5 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-amber-700 mb-1">Department</label>
                          <select
                            value={employeeDepartment}
                            onChange={(e) => setEmployeeDepartment(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                          >
                            <option value="">Select...</option>
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Employee Info + Role Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Employee Info Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Employee Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Title</p>
                    <p className="font-medium">{displayTitle}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Department</p>
                    <p className="font-medium">{displayDepartment || 'Not Specified'}</p>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Role
                </label>
                <div className="space-y-2">
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRole === value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={value}
                        checked={selectedRole === value}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        className="text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-sm text-gray-500">
                          {value === 'staff' && 'Can create payments up to $50,000'}
                          {value === 'manager' && 'Can approve payments up to $250,000'}
                          {value === 'sr_manager' && 'Can approve payments up to $500,000'}
                          {value === 'admin' && 'Full access — execute payments, approve all amounts, system configuration'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Group Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Groups <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allGroups.map((group) => (
                    <label
                      key={group.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedGroupIds.includes(group.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={() => {
                          setSelectedGroupIds(prev =>
                            prev.includes(group.id)
                              ? prev.filter(id => id !== group.id)
                              : [...prev, group.id]
                          );
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-gray-500">{group.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Account Access Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Access <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select which bank accounts this user can access for payments. If none selected, the user will see all accounts by default.
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allAccounts.map((account) => (
                    <label
                      key={account.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAccountIds.includes(account.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAccountIds.includes(account.id)}
                        onChange={() => {
                          setSelectedAccountIds(prev =>
                            prev.includes(account.id)
                              ? prev.filter(id => id !== account.id)
                              : [...prev, account.id]
                          );
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary rounded"
                      />
                      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{account.name}</p>
                        <p className="text-xs text-gray-500">
                          {account.bank_name} &bull; {account.account_type} &bull; {account.currency}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review and Create */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Ready to Create User</p>
                    <p className="text-sm text-green-700 mt-1">
                      The user will be created with <strong>active</strong> status and can log in immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg divide-y">
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{displayName}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{email}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium">{ROLE_LABELS[selectedRole]}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="font-medium">{displayTitle}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{displayDepartment || 'Not Specified'}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">Groups</p>
                  <p className="font-medium">
                    {selectedGroupIds.length > 0
                      ? allGroups.filter(g => selectedGroupIds.includes(g.id)).map(g => g.name).join(', ')
                      : 'None'}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">Account Access</p>
                  <p className="font-medium">
                    {selectedAccountIds.length > 0
                      ? allAccounts.filter(a => selectedAccountIds.includes(a.id)).map(a => a.name).join(', ')
                      : 'All accounts (default)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>

            {currentStep === 1 && (
              <button
                onClick={handleStep1Continue}
                disabled={!email.includes('@') || isVerifying}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Continue
                  </>
                )}
              </button>
            )}

            {currentStep === 2 && (
              <button
                onClick={handleStep2Continue}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                Continue to Review
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={() => createUserMutation.mutate()}
                disabled={createUserMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Create User Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
