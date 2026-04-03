'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '@/lib/api';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';

interface BankHoliday {
  date: string;
  name: string;
  country: string;
}

interface BusinessDayPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string;
  minDate?: string; // YYYY-MM-DD, defaults to today
}

/** Parse YYYY-MM-DD without timezone shift */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWeekendDay(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function BusinessDayPicker({ value, onChange, error, minDate }: BusinessDayPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveMin = minDate ? parseLocalDate(minDate) : today;

  const initial = value ? parseLocalDate(value) : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [isOpen, setIsOpen] = useState(false);
  const [dateWarning, setDateWarning] = useState<string | null>(null);
  const [suggestedDate, setSuggestedDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all holidays once (they're small and static)
  const { data: holidaysData } = useQuery({
    queryKey: ['bank-holidays-all'],
    queryFn: () => calendarApi.allHolidays(),
    staleTime: Infinity,
  });

  const holidays: BankHoliday[] = holidaysData?.data || [];

  // Build a Set of US-only blocked date strings and a Map for tooltip names
  const blockedDates = new Set<string>();
  const holidayNameMap = new Map<string, string[]>();
  for (const h of holidays) {
    // Only block US holidays — Canadian holidays are informational only
    if (h.country === 'USA') {
      blockedDates.add(h.date);
    }
    const existing = holidayNameMap.get(h.date) || [];
    const label = `${h.name} (${h.country === 'CAN' ? 'Canada' : 'US'})`;
    if (!existing.includes(label)) existing.push(label);
    holidayNameMap.set(h.date, existing);
  }

  const isBlocked = useCallback((date: Date): boolean => {
    if (isWeekendDay(date)) return true;
    if (blockedDates.has(formatDateStr(date))) return true;
    return false;
  }, [blockedDates]);

  const isPast = useCallback((date: Date): boolean => {
    return date < effectiveMin;
  }, [effectiveMin]);

  function getHolidayTooltip(dateStr: string): string | null {
    const names = holidayNameMap.get(dateStr);
    return names ? names.join(', ') : null;
  }

  /** Find next available business day after given date */
  function findNextBusinessDayLocal(fromStr: string): string | null {
    const d = parseLocalDate(fromStr);
    for (let i = 1; i <= 14; i++) {
      d.setDate(d.getDate() + 1);
      if (!isWeekendDay(d) && !blockedDates.has(formatDateStr(d)) && d >= effectiveMin) {
        return formatDateStr(d);
      }
    }
    return null;
  }

  // Validate when value changes
  useEffect(() => {
    if (!value) {
      setDateWarning(null);
      setSuggestedDate(null);
      return;
    }
    const d = parseLocalDate(value);
    const dateStr = formatDateStr(d);
    const weekend = isWeekendDay(d);
    const holiday = blockedDates.has(dateStr);

    if (weekend || holiday) {
      const names = holidayNameMap.get(dateStr);
      const holidayLabel = names ? names.join(', ') : null;
      if (weekend && holiday) {
        setDateWarning(`This date falls on a weekend and is also a holiday (${holidayLabel}) \u2014 please select a business day`);
      } else if (weekend) {
        setDateWarning('This date falls on a weekend \u2014 please select a business day');
      } else {
        setDateWarning(`This date falls on a federal holiday: ${holidayLabel} \u2014 please select a business day`);
      }
      const next = findNextBusinessDayLocal(dateStr);
      setSuggestedDate(next);
    } else {
      setDateWarning(null);
      setSuggestedDate(null);
    }
  }, [value, blockedDates.size]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(dateStr: string) {
    const d = parseLocalDate(dateStr);
    if (isPast(d) || isBlocked(d)) return;
    onChange(dateStr);
    setIsOpen(false);
  }

  function handleSuggestedClick() {
    if (suggestedDate) {
      onChange(suggestedDate);
      const d = parseLocalDate(suggestedDate);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    cells.push(formatDateStr(date));
  }

  const displayValue = value
    ? parseLocalDate(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <div ref={containerRef} className="relative">
      {/* Input field */}
      <div
        className={`flex items-center w-full border rounded-md px-3 py-2 cursor-pointer bg-white
          focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder="Select a business day..."
          className="flex-1 outline-none bg-transparent cursor-pointer text-gray-900 placeholder-gray-400"
        />
        <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
      {/* Hidden native input for form value */}
      <input type="hidden" name="requestedDate" value={value} />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {dateWarning && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <p className="text-amber-700 text-sm flex items-start gap-1.5">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{dateWarning}</span>
          </p>
          {suggestedDate && (
            <button
              type="button"
              onClick={handleSuggestedClick}
              className="mt-1.5 text-sm font-medium text-primary hover:underline ml-5"
            >
              Use {parseLocalDate(suggestedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} instead
            </button>
          )}
        </div>
      )}

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-[320px]">
          {/* Month/Year navigation */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const d = parseLocalDate(dateStr);
              const dayNum = d.getDate();
              const past = isPast(d);
              const blocked = isBlocked(d);
              const disabled = past || blocked;
              const isSelected = dateStr === value;
              const isToday = formatDateStr(today) === dateStr;
              const weekend = isWeekendDay(d);
              const holidayTip = getHolidayTooltip(dateStr);

              let cellClass = 'h-8 w-full text-sm rounded flex items-center justify-center relative ';
              if (disabled) {
                cellClass += weekend
                  ? 'text-gray-300 bg-gray-50 cursor-not-allowed line-through '
                  : 'text-red-300 bg-red-50 cursor-not-allowed line-through ';
              } else if (isSelected) {
                cellClass += 'bg-primary text-white font-semibold cursor-pointer ';
              } else {
                cellClass += 'text-gray-900 hover:bg-primary/10 cursor-pointer ';
              }
              if (isToday && !isSelected) {
                cellClass += 'ring-1 ring-primary ';
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(dateStr)}
                  className={cellClass}
                  title={
                    weekend
                      ? 'Weekend'
                      : holidayTip
                        ? holidayTip
                        : past
                          ? 'Past date'
                          : undefined
                  }
                >
                  {dayNum}
                  {/* Holiday dot indicator */}
                  {holidayTip && !weekend && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-gray-50 border border-gray-200 rounded line-through text-[8px] text-center">S</span>
              Weekend
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-red-50 border border-red-200 rounded relative">
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
              </span>
              Holiday
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
