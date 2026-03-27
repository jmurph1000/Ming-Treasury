'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  AlertTriangle,
  Landmark,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const sidebarItems = [
  { name: 'Payments', href: ROUTES.PAYMENTS, icon: CreditCard, emoji: '' },
  { name: 'Cash Balances', href: ROUTES.TREASURY_CASH, icon: DollarSign, emoji: '' },
  { name: 'Investments', href: ROUTES.TREASURY_INVESTMENTS, icon: TrendingUp, emoji: '' },
  { name: 'Corp Cash Forecast', href: ROUTES.TREASURY_CORP_FORECAST, icon: Building2, emoji: '' },
  { name: 'Customer Cash Forecast', href: ROUTES.TREASURY_CUSTOMER_FORECAST, icon: Users, emoji: '' },
  { name: 'Risk Reporting', href: ROUTES.TREASURY_RISK, icon: AlertTriangle, emoji: '' },
  { name: 'New Accounts Status', href: ROUTES.TREASURY_NEW_ACCOUNTS, icon: Landmark, emoji: '' },
];

export function TreasurySidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('treasury-sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('treasury-sidebar-collapsed', String(next));
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 bottom-0 z-40 flex flex-col transition-all duration-200 ease-in-out',
        collapsed ? 'w-12' : 'w-[220px]'
      )}
      style={{ backgroundColor: '#1E6B3C' }}
    >
      <button
        onClick={toggle}
        className="flex items-center justify-center h-10 w-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <nav className="flex-1 overflow-y-auto py-2">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== ROUTES.PAYMENTS && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#2E8B57] text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
