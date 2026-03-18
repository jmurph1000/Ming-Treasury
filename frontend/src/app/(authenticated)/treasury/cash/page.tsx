'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Loader2 } from 'lucide-react';

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (Math.abs(amount) >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (Math.abs(amount) >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

export default function CashBalancesPage() {
  const queryClient = useQueryClient();
  const [accountType, setAccountType] = useState<'both' | 'corporate' | 'customer'>('both');
  const [topN, setTopN] = useState(5);
  const [daysBack, setDaysBack] = useState(2);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cash-balances', accountType, topN, daysBack],
    queryFn: async () => {
      const res = await fetch(`/api/treasury/cash-balances?account_type=${accountType}&top_n=${topN}&days_back=${daysBack}`, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: ingestionData } = useQuery({
    queryKey: ['cash-last-ingestion'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/cash-balances/last-ingestion', { credentials: 'include' });
      return res.json();
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/treasury/ingest', { method: 'POST', credentials: 'include' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-balances'] });
      queryClient.invalidateQueries({ queryKey: ['cash-last-ingestion'] });
    },
  });

  const accounts = data?.data?.accounts || [];
  const dates = data?.data?.dates || [];
  const lastIngestion = ingestionData?.data?.lastIngestion;

  const corpAccounts = accounts.filter((a: any) => a.accountType === 'corporate');
  const custAccounts = accounts.filter((a: any) => a.accountType === 'customer');

  const corpTotal = corpAccounts.reduce((sum: number, a: any) => {
    const latestDate = dates[dates.length - 1];
    return sum + (a.balances[latestDate] || 0);
  }, 0);
  const custTotal = custAccounts.reduce((sum: number, a: any) => {
    const latestDate = dates[dates.length - 1];
    return sum + (a.balances[latestDate] || 0);
  }, 0);

  function renderTable(title: string, total: number, accs: any[]) {
    if (accs.length === 0) return null;
    const recentDates = dates.slice(-Math.min(dates.length, daysBack + 1));
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm font-medium text-gray-600">Total: {formatCurrency(total)}</span>
        </div>
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Account Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bank</th>
                {recentDates.map(d => (
                  <th key={d} className="px-4 py-3 text-right font-medium text-gray-600">{formatDateHeader(d)}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-gray-600">Change ($)</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Change (%)</th>
              </tr>
            </thead>
            <tbody>
              {accs.map((acc: any, idx: number) => {
                const latestBal = acc.balances[recentDates[recentDates.length - 1]] || 0;
                const prevBal = recentDates.length > 1 ? (acc.balances[recentDates[recentDates.length - 2]] || 0) : 0;
                const changeDollar = latestBal - prevBal;
                const changePct = prevBal !== 0 ? (changeDollar / prevBal) * 100 : 0;
                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{acc.accountName}</td>
                    <td className="px-4 py-3 text-gray-600">{acc.bank || '-'}</td>
                    {recentDates.map(d => (
                      <td key={d} className="px-4 py-3 text-right font-mono">
                        {acc.balances[d] != null ? formatCurrency(acc.balances[d]) : '-'}
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-right font-mono ${changeDollar > 0 ? 'text-green-600' : changeDollar < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeDollar !== 0 ? (changeDollar > 0 ? '+' : '') + formatCurrency(changeDollar) : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${changePct > 0 ? 'text-green-600' : changePct < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changePct !== 0 ? (changePct > 0 ? '+' : '') + changePct.toFixed(1) + '%' : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Balances</h1>
          <p className="text-gray-500 mt-1">
            Last updated: {lastIngestion ? new Date(lastIngestion).toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET' : 'Never'}
          </p>
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

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex gap-1">
          {(['corporate', 'customer', 'both'] as const).map(t => (
            <button
              key={t}
              onClick={() => setAccountType(t)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium ${accountType === t ? 'bg-[#1E6B3C] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t === 'both' ? 'Both' : t === 'corporate' ? 'Corporate' : 'Customer'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Show Top:</label>
          <select value={topN} onChange={e => setTopN(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            {[1, 5, 10, 15, 20, 999].map(n => <option key={n} value={n}>{n === 999 ? 'All' : n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Date Range:</label>
          <select value={daysBack} onChange={e => setDaysBack(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            <option value={2}>2 Days</option>
            <option value={7}>1 Week</option>
            <option value={14}>2 Weeks</option>
            <option value={30}>1 Month</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E6B3C]"></div></div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">Failed to load cash balances.</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No data available yet</h3>
          <p className="text-gray-500 mt-2">Data ingests daily at 9:30 AM ET. Click Refresh Now to load current data.</p>
        </div>
      ) : (
        <>
          {(accountType === 'both' || accountType === 'corporate') && renderTable('Corporate Cash', corpTotal, corpAccounts)}
          {(accountType === 'both' || accountType === 'customer') && renderTable('Customer Cash (Gustomer)', custTotal, custAccounts)}
        </>
      )}
    </div>
  );
}
