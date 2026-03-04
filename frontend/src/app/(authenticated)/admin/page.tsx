'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { Users, Building2, GitBranch, Link2, Settings, Shield, BookOpen, Bell, ClipboardList, UsersRound, Loader2 } from 'lucide-react';

const adminSections = [
  {
    name: 'User Management',
    description: 'Manage user accounts, roles, and permissions',
    href: ROUTES.ADMIN_USERS,
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    name: 'Bank Accounts',
    description: 'Configure source bank accounts',
    href: ROUTES.ADMIN_ACCOUNTS,
    icon: Building2,
    color: 'bg-green-500',
  },
  {
    name: 'Routing Rules',
    description: 'Define approval routing based on amount, type, or account',
    href: ROUTES.ADMIN_ROUTING,
    icon: GitBranch,
    color: 'bg-purple-500',
  },
  {
    name: 'Approval Chains',
    description: 'Configure approval chain steps and escalation rules',
    href: ROUTES.ADMIN_CHAINS,
    icon: Link2,
    color: 'bg-orange-500',
  },
  {
    name: 'System Settings',
    description: 'Configure batch windows, security, and global settings',
    href: ROUTES.ADMIN_SETTINGS,
    icon: Settings,
    color: 'bg-gray-500',
  },
  {
    name: 'User Guide',
    description: 'View, edit, and share the user guide with team members',
    href: ROUTES.ADMIN_GUIDE,
    icon: BookOpen,
    color: 'bg-indigo-500',
  },
  {
    name: 'Pending Payment Notifications',
    description: 'View daily pending payment summary emails sent to the team',
    href: ROUTES.ADMIN_NOTIFICATIONS,
    icon: Bell,
    color: 'bg-yellow-500',
  },
  {
    name: 'User Permissions Report',
    description: 'Daily snapshot of all users and their system access permissions',
    href: ROUTES.ADMIN_PERMISSIONS,
    icon: ClipboardList,
    color: 'bg-teal-500',
  },
  {
    name: 'Groups',
    description: 'Manage department groups, members, and account assignments',
    href: ROUTES.ADMIN_GROUPS,
    icon: UsersRound,
    color: 'bg-cyan-500',
  },
];

export default function AdminPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => dashboardApi.adminStats(),
    refetchInterval: 15000, // Auto-refresh every 15 seconds
    refetchOnWindowFocus: true,
  });

  const stats = statsData?.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1">
          Configure system settings and manage users
        </p>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <Link
            key={section.name}
            href={section.href}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${section.color}`}>
                <section.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  {section.name}
                </h3>
                <p className="text-gray-500 text-sm mt-1">{section.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats?.activeUsers ?? '--'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Bank Accounts</p>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats?.bankAccounts ?? '--'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Routing Rules</p>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats?.routingRules ?? '--'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Pending Access Requests</p>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats?.pendingAccessRequests ?? '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-800 font-medium">SOX Compliance Notice</p>
          <p className="text-blue-700 text-sm mt-1">
            All administrative actions are logged to the immutable audit trail.
            Changes to routing rules and approval chains require documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
