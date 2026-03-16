'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi, calendarApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import type { Payment, BankHoliday } from '@/types';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  pending_approval: { bg: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400', label: 'Pending Approval' },
  approved: { bg: 'bg-blue-100 text-blue-800', dot: 'bg-blue-400', label: 'Approved' },
  ready_to_execute: { bg: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500', label: 'Ready to Execute' },
  executed: { bg: 'bg-green-100 text-green-800', dot: 'bg-green-400', label: 'Completed' },
  overdue: { bg: 'bg-red-100 text-red-800', dot: 'bg-red-400', label: 'Overdue' },
  draft: { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-300', label: 'Draft' },
  cancelled: { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', label: 'Cancelled' },
  rejected: { bg: 'bg-red-100 text-red-800', dot: 'bg-red-300', label: 'Rejected' },
  returned: { bg: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400', label: 'Returned' },
  pending_confirmation: { bg: 'bg-blue-100 text-blue-800', dot: 'bg-blue-300', label: 'Awaiting Confirmation' },
  bank_rejected: { bg: 'bg-red-100 text-red-800', dot: 'bg-red-500', label: 'Bank Rejected' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayStr(): string {
  const now = new Date();
  return formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
}

function getEffectiveStatus(payment: Payment, todayStr: string): string {
  if (
    payment.requested_date < todayStr &&
    (payment.status === 'pending_approval' || payment.status === 'ready_to_execute')
  ) {
    return 'overdue';
  }
  return payment.status;
}

interface CalendarDay {
  date: number;
  month: number; // 0-indexed
  year: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  holidays: BankHoliday[];
  payments: Payment[];
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStr = getMonthStr(currentMonth);
  const todayStr = getTodayStr();

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['calendar-payments', monthStr],
    queryFn: () => paymentsApi.calendar(monthStr),
  });

  const { data: holidaysData } = useQuery({
    queryKey: ['calendar-holidays', currentMonth.getFullYear()],
    queryFn: () => calendarApi.holidays(currentMonth.getFullYear()),
    staleTime: Infinity,
  });

  const payments = paymentsData?.data || [];
  const holidays = holidaysData?.data || [];

  // Index payments by date
  const paymentsByDate = useMemo(() => {
    const map: Record<string, Payment[]> = {};
    for (const p of payments) {
      const d = p.requested_date?.slice(0, 10);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(p);
      }
    }
    return map;
  }, [payments]);

  // Index holidays by date
  const holidaysByDate = useMemo(() => {
    const map: Record<string, BankHoliday[]> = {};
    for (const h of holidays) {
      const d = h.date?.slice(0, 10);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(h);
      }
    }
    return map;
  }, [holidays]);

  // Build calendar grid
  const calendarDays: CalendarDay[] = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = formatDateStr(prevYear, prevMonth, d);
      const dayOfWeek = new Date(prevYear, prevMonth, d).getDay();
      days.push({
        date: d,
        month: prevMonth,
        year: prevYear,
        dateStr,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === todayStr,
        holidays: holidaysByDate[dateStr] || [],
        payments: paymentsByDate[dateStr] || [],
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateStr(year, month, d);
      const dayOfWeek = new Date(year, month, d).getDay();
      days.push({
        date: d,
        month,
        year,
        dateStr,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === todayStr,
        holidays: holidaysByDate[dateStr] || [],
        payments: paymentsByDate[dateStr] || [],
      });
    }

    // Trailing days to fill the last week
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      for (let d = 1; d <= remaining; d++) {
        const dateStr = formatDateStr(nextYear, nextMonth, d);
        const dayOfWeek = new Date(nextYear, nextMonth, d).getDay();
        days.push({
          date: d,
          month: nextMonth,
          year: nextYear,
          dateStr,
          isCurrentMonth: false,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isToday: dateStr === todayStr,
          holidays: holidaysByDate[dateStr] || [],
          payments: paymentsByDate[dateStr] || [],
        });
      }
    }

    return days;
  }, [currentMonth, paymentsByDate, holidaysByDate, todayStr]);

  // Selected date data
  const selectedPayments = selectedDate ? (paymentsByDate[selectedDate] || []) : [];
  const selectedHolidays = selectedDate ? (holidaysByDate[selectedDate] || []) : [];

  function goToPrevMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDate(null);
  }

  function goToNextMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(null);
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(null);
  }

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function formatSelectedDateHeading(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Calendar</h1>
        <p className="text-gray-500 mt-1">View scheduled payments by date</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 ml-2">{monthLabel}</h2>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAY_NAMES.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {paymentsLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const hasHoliday = day.holidays.length > 0;
              const isNonWorking = day.isWeekend || hasHoliday;
              const holidayTooltip = day.holidays.map(h => h.name).join(', ');
              const paymentCount = day.payments.length;

              // Compute dot colors (up to 3 dots, or count badge)
              const dots = day.payments.slice(0, 3).map(p => {
                const status = getEffectiveStatus(p, todayStr);
                return STATUS_COLORS[status]?.dot || 'bg-gray-300';
              });

              return (
                <div
                  key={idx}
                  onClick={() => day.isCurrentMonth && setSelectedDate(day.dateStr)}
                  title={hasHoliday ? holidayTooltip : undefined}
                  className={`
                    min-h-[80px] p-1.5 border-b border-r cursor-pointer transition-colors
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                    ${day.isCurrentMonth && isNonWorking ? 'bg-gray-100' : ''}
                    ${day.isCurrentMonth && !isNonWorking ? 'bg-white hover:bg-gray-50' : ''}
                    ${day.isToday ? 'ring-2 ring-inset ring-blue-500' : ''}
                    ${selectedDate === day.dateStr ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-sm font-medium ${
                        day.isToday
                          ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs'
                          : !day.isCurrentMonth
                            ? 'text-gray-400'
                            : isNonWorking
                              ? 'text-gray-400'
                              : 'text-gray-900'
                      }`}
                    >
                      {day.date}
                    </span>
                    {paymentCount > 3 && day.isCurrentMonth && (
                      <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-1.5 py-0.5 font-medium">
                        {paymentCount}
                      </span>
                    )}
                  </div>

                  {hasHoliday && day.isCurrentMonth && (
                    <div className="mt-0.5 text-[10px] text-red-600 font-medium truncate leading-tight">
                      {day.holidays[0].name}
                    </div>
                  )}

                  {paymentCount > 0 && day.isCurrentMonth && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {dots.map((dotColor, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${dotColor}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          Pending Approval
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          Approved / Scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          Completed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          Overdue
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          Draft / Cancelled
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formatSelectedDateHeading(selectedDate)}
              </h3>
              {selectedHolidays.length > 0 && (
                <p className="text-sm text-red-600 mt-0.5">
                  {selectedHolidays.map(h => h.name).join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close detail panel"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {selectedPayments.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No payments scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedPayments.map(payment => {
                const effectiveStatus = getEffectiveStatus(payment, todayStr);
                const statusInfo = STATUS_COLORS[effectiveStatus] || STATUS_COLORS.draft;

                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={ROUTES.PAYMENT_DETAIL(payment.id)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {payment.reference_number}
                        </Link>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 truncate">{payment.payee_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {payment.requester_name} &middot; {payment.payment_type?.toUpperCase()}
                        {payment.account_name ? ` &middot; ${payment.account_name}` : ''}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      {payment.currency !== 'USD' && (
                        <p className="text-xs text-gray-500">
                          ~{formatCurrency(payment.usd_equivalent, 'USD')}
                        </p>
                      )}
                    </div>
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
