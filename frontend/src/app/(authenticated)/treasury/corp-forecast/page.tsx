'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Loader2, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (Math.abs(amount) >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (Math.abs(amount) >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function CorpForecastPage() {
  const queryClient = useQueryClient();
  const [weeksBack, setWeeksBack] = useState(4);

  const { data, isLoading, error } = useQuery({
    queryKey: ['corp-forecast', weeksBack],
    queryFn: async () => {
      const res = await fetch(`/api/treasury/corp-forecast?weeks_back=${weeksBack}`, { credentials: 'include' });
      return res.json();
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/treasury/ingest', { method: 'POST', credentials: 'include' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-forecast'] });
    },
  });

  const accounts = data?.data?.accounts || [];
  const dates = data?.data?.dates || [];
  const summary = data?.data?.summary || { belowMinimum: 0, nearMinimum: 0, totalForecast: 0 };

  function getCellColor(forecast: number | null, minBalance: number | null): string {
    if (forecast == null || minBalance == null) return '';
    if (forecast < minBalance) return 'bg-red-100 text-red-800';
    if (forecast < minBalance * 1.2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-50 text-green-800';
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Corporate Cash Forecast</h1>
          <p className="text-gray-500 mt-1">Forecasted balances vs minimum requirements</p>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E6B3C] text-white rounded-md hover:bg-[#165C32] disabled:opacity-50 text-sm"
        >
          {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh Now
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Total Forecast
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalForecast)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Below Minimum
          </div>
          <div className="text-2xl font-bold text-red-600">{summary.belowMinimum}</div>
          <div className="text-xs text-gray-500">accounts need attention</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Near Minimum
          </div>
          <div className="text-2xl font-bold text-yellow-600">{summary.nearMinimum}</div>
          <div className="text-xs text-gray-500">within 20% of minimum</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Forecast Range:</label>
          <select value={weeksBack} onChange={e => setWeeksBack(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            <option value={2}>2 Weeks</option>
            <option value={4}>4 Weeks</option>
            <option value={8}>8 Weeks</option>
            <option value={12}>12 Weeks</option>
          </select>
        </div>
        <div className="flex items-center gap-4 ml-auto text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200"></span> Below Min</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></span> Near Min (&lt;20%)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200"></span> Healthy</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E6B3C]"></div></div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">Failed to load forecast data.</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No forecast data available</h3>
          <p className="text-gray-500 mt-2">Data ingests daily at 9:30 AM ET. Click Refresh Now to load current data.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-medium text-gray-600 sticky left-0 bg-gray-50">Account</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Min Balance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Responsible</th>
                {dates.map((d: string) => (
                  <th key={d} className="px-4 py-3 text-right font-medium text-gray-600">{formatDateHeader(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc: any, idx: number) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-white">{acc.accountName}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {acc.minBalance != null ? formatCurrency(acc.minBalance) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{acc.responsiblePerson || '-'}</td>
                  {dates.map((d: string) => {
                    const cell = acc.forecasts[d];
                    const val = cell?.forecast;
                    return (
                      <td key={d} className={`px-4 py-3 text-right font-mono ${getCellColor(val, acc.minBalance)}`}>
                        {val != null ? formatCurrency(val) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
