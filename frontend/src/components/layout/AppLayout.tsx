'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useCanApprove, useCanExecute, useIsCfoOrAdmin, useIsAdmin, useIsReadOnly } from '@/hooks/useAuth';
import { cn, getRoleLabel } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import {
  CreditCard,
  CheckSquare,
  Send,
  LayoutDashboard,
  Calendar,
  FileText,
  Settings,
  LogOut,
  User,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { Bunmahon } from '@/components/Bunmahon';
import { TreasurySidebar } from '@/components/layout/TreasurySidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { useIsTreasurySupervisor } from '@/hooks/useAuth';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const canApprove = useCanApprove();
  const canExecute = useCanExecute();
  const isCfoOrAdmin = useIsCfoOrAdmin();
  const isAdmin = useIsAdmin();
  const isReadOnly = useIsReadOnly();
  const isTreasurySupervisor = useIsTreasurySupervisor();

  const navigation = [
    {
      name: 'Payments',
      href: ROUTES.PAYMENTS,
      icon: CreditCard,
      show: true,
    },
    {
      name: 'Approvals',
      href: ROUTES.APPROVALS,
      icon: CheckSquare,
      show: canApprove,
    },
    {
      name: 'Execution',
      href: ROUTES.EXECUTION,
      icon: Send,
      show: canExecute,
    },
    {
      name: 'Dashboard',
      href: ROUTES.DASHBOARD,
      icon: LayoutDashboard,
      show: isCfoOrAdmin,
    },
    {
      name: 'Calendar',
      href: ROUTES.CALENDAR,
      icon: Calendar,
      show: true,
    },
    {
      name: 'User Guide',
      href: ROUTES.GUIDE,
      icon: BookOpen,
      show: true,
    },
    {
      name: 'Reports',
      href: ROUTES.REPORTS,
      icon: FileText,
      show: canApprove || canExecute || isAdmin,
    },
    {
      name: 'Admin',
      href: ROUTES.ADMIN,
      icon: Settings,
      show: isAdmin,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-gusto-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Main Nav */}
            <div className="flex items-center">
              <Link href={ROUTES.PAYMENTS} className="flex items-center">
                <span className="text-xl font-bold text-white">
                  Gusto Treasury
                </span>
              </Link>

              <div className="hidden md:flex ml-10 space-x-1">
                {navigation
                  .filter((item) => item.show)
                  .map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors',
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
              </div>
            </div>

            {/* Bunmahon AI Assistant - Center */}
            <div className="flex items-center justify-center">
              <Bunmahon />
            </div>

            {/* Notification Bell + User Menu */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.name}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded hidden sm:inline">
                    {getRoleLabel(user?.role || '')}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar + Main Content */}
      <div className="flex">
        {isTreasurySupervisor && <TreasurySidebar />}
        <main className={cn(
          'flex-1 min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8 transition-all duration-200',
          isTreasurySupervisor ? 'ml-12' : ''
        )} style={{ maxWidth: isTreasurySupervisor ? 'calc(100% - 48px)' : '100%' }}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
