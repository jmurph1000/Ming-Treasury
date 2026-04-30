'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  RefreshCw, Loader2, AlertTriangle, AlertCircle, CheckCircle,
  BarChart3, Table2, TrendingDown, TrendingUp, Calendar, DollarSign, PieChart,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell, ComposedChart,
} from 'recharts';

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

const COLORS = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  cyan: '#22d3ee',
  purple: '#a78bfa',
  gray: '#5a6f8f',
  grid: '#1e3054',
};

const axisTick = { fontSize: 11, fill: '#5a6f8f' };
const axisTickSm = { fontSize: 12, fill: '#5a6f8f' };

export default function CorpForecastV2Page() {
  const [weeksBack, setWeeksBack] = useState(4);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'monthly' | 'pigment'>('dashboard');
  const [chartHorizon, setChartHorizon] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [cashflowData, setCashflowData] = useState<any>(null);
  const [pigmentData, setPigmentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const [fcRes, cfRes, pgRes] = await Promise.all([
        fetch(`${base}/data/forecast.json`),
        fetch(`${base}/data/cashflow.json`),
        fetch(`${base}/data/pigment.json`),
      ]);
      setData(await fcRes.json());
      setCashflowData(await cfRes.json());
      const pgJson = await pgRes.json();
      if (pgJson.success) setPigmentData(pgJson.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const accounts: any[] = data?.data?.accounts || [];
  const dates: string[] = data?.data?.dates || [];
  const summary = data?.data?.summary || { belowMinimum: 0, nearMinimum: 0, totalForecast: 0 };

  const totalByDate = useMemo(() => {
    return dates.map(d => {
      let total = 0;
      let totalMin = 0;
      accounts.forEach((acc: any) => {
        const val = acc.forecasts[d]?.forecast;
        if (val != null) total += val;
        if (acc.minBalance != null) totalMin += acc.minBalance;
      });
      return { date: formatDateHeader(d), fullDate: d, total, totalMin };
    });
  }, [accounts, dates]);

  const trendChartData = useMemo(() => {
    if (chartHorizon == null || totalByDate.length === 0) return totalByDate;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - chartHorizon * 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return totalByDate.filter(d => d.fullDate >= cutoffStr);
  }, [totalByDate, chartHorizon]);

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    const all = (cashflowData?.data?.categoryTimeSeries || []).map((c: any) => c.lineItem);
    setSelectedCategories(new Set(all));
  };

  const clearAll = () => setSelectedCategories(new Set());

  const categoryComparison: any[] = useMemo(() => {
    const raw = cashflowData?.data?.categoryComparison || [];
    return raw
      .filter((c: any) => c.hasActual)
      .map((c: any) => ({
        ...c,
        name: c.lineItem.length > 28 ? c.lineItem.slice(0, 25) + '...' : c.lineItem,
        fullName: c.lineItem,
        isRevenue: c.category === 'addition',
      }))
      .sort((a: any, b: any) => b.forecast - a.forecast);
  }, [cashflowData]);

  const categoryTimeSeries: any[] = cashflowData?.data?.categoryTimeSeries || [];

  const netTimeSeriesData = useMemo(() => {
    if (selectedCategories.size === 0) return [];
    const selected = categoryTimeSeries.filter((c: any) => selectedCategories.has(c.lineItem));
    const dateMap = new Map<string, { forecast: number; actual: number; hasActual: boolean }>();
    for (const cat of selected) {
      const sign = cat.category === 'subtraction' ? -1 : 1;
      for (const pt of cat.series) {
        if (!dateMap.has(pt.date)) dateMap.set(pt.date, { forecast: 0, actual: 0, hasActual: false });
        const entry = dateMap.get(pt.date)!;
        if (pt.forecast != null) entry.forecast += pt.forecast * sign;
        if (pt.actual != null) { entry.actual += pt.actual * sign; entry.hasActual = true; }
      }
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        const d = new Date(date + 'T12:00:00');
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          fullDate: date,
          forecast: v.forecast,
          actual: v.hasActual ? v.actual : null,
        };
      });
  }, [categoryTimeSeries, selectedCategories]);

  const mcChartData = useMemo(() => {
    if (netTimeSeriesData.length < 8) return netTimeSeriesData;

    const actuals = netTimeSeriesData.filter((d: any) => d.actual != null);
    if (actuals.length < 12) return netTimeSeriesData;

    // Compute weekly changes from actuals for block bootstrap
    const changes: number[] = [];
    for (let i = 1; i < actuals.length; i++) {
      changes.push((actuals[i].actual ?? 0) - (actuals[i - 1].actual ?? 0));
    }
    if (changes.length < 4) return netTimeSeriesData;

    const lastActual = actuals[actuals.length - 1];
    const startValue = lastActual.actual ?? 0;
    const startDate = new Date(lastActual.fullDate + 'T12:00:00');

    // Generate 26 future weekly dates (6 months)
    const futureWeeks = 26;
    const futureDates: { date: string; fullDate: string }[] = [];
    for (let w = 1; w <= futureWeeks; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      const iso = d.toISOString().split('T')[0];
      futureDates.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        fullDate: iso,
      });
    }

    const existingDates = new Set(netTimeSeriesData.map((d: any) => d.fullDate));
    const allMcDates = futureDates;

    // Block bootstrap MC simulation
    const NUM_SIMS = 300;
    const BLOCK_SIZE = Math.min(8, Math.floor(changes.length / 2));
    const simPaths: number[][] = [];

    // Seeded PRNG for reproducibility
    let seed = 42;
    function nextRand() {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    }

    for (let s = 0; s < NUM_SIMS; s++) {
      const path: number[] = [];
      let val = startValue;
      let idx = 0;
      while (idx < futureWeeks) {
        const blockStart = Math.floor(nextRand() * (changes.length - BLOCK_SIZE + 1));
        for (let b = 0; b < BLOCK_SIZE && idx < futureWeeks; b++, idx++) {
          val += changes[blockStart + b];
          path.push(val);
        }
      }
      simPaths.push(path);
    }

    // Compute percentiles at each future step
    const mcProjection = allMcDates.map((fd, i) => {
      const vals = simPaths.map(p => p[i]).sort((a, b) => a - b);
      const p10 = vals[Math.floor(NUM_SIMS * 0.1)];
      const p50 = vals[Math.floor(NUM_SIMS * 0.5)];
      const p90 = vals[Math.floor(NUM_SIMS * 0.9)];
      return { ...fd, mcP10: p10, mcP50: p50, mcP90: p90 };
    });

    // Build combined data: original points get null mc fields, then append mc-only points
    const combined = netTimeSeriesData.map((d: any) => {
      const mcMatch = mcProjection.find(m => m.fullDate === d.fullDate);
      return {
        ...d,
        mcP10: mcMatch?.mcP10 ?? null,
        mcP50: mcMatch?.mcP50 ?? null,
        mcP90: mcMatch?.mcP90 ?? null,
      };
    });

    // Bridge: set mc values on the last actual point so lines connect
    const lastActualIdx = combined.findIndex((d: any) => d.fullDate === lastActual.fullDate);
    if (lastActualIdx >= 0) {
      combined[lastActualIdx] = {
        ...combined[lastActualIdx],
        mcP10: startValue,
        mcP50: startValue,
        mcP90: startValue,
      };
    }

    // Append new future dates not already in the data
    for (const mp of mcProjection) {
      if (!existingDates.has(mp.fullDate)) {
        combined.push({
          date: mp.date,
          fullDate: mp.fullDate,
          forecast: null,
          actual: null,
          mcP10: mp.mcP10,
          mcP50: mp.mcP50,
          mcP90: mp.mcP90,
        });
      }
    }

    return combined;
  }, [netTimeSeriesData]);

  const healthCounts = useMemo(() => {
    let below = 0, near = 0, healthy = 0;
    if (dates.length === 0) return { below: 0, near: 0, healthy: 0, total: 0 };
    const latestDate = dates[dates.length - 1];
    accounts.filter((a: any) => a.minBalance != null).forEach((acc: any) => {
      const forecast = acc.forecasts[latestDate]?.forecast ?? 0;
      if (forecast < acc.minBalance) below++;
      else if (forecast < acc.minBalance * 1.2) near++;
      else healthy++;
    });
    return { below, near, healthy, total: below + near + healthy };
  }, [accounts, dates]);

  const byResponsible = useMemo(() => {
    if (dates.length === 0) return [];
    const latestDate = dates[dates.length - 1];
    const map: Record<string, { total: number; count: number; belowCount: number }> = {};
    accounts.forEach((acc: any) => {
      const person = acc.responsiblePerson || 'Unassigned';
      if (!map[person]) map[person] = { total: 0, count: 0, belowCount: 0 };
      const val = acc.forecasts[latestDate]?.forecast ?? 0;
      map[person].total += val;
      map[person].count++;
      if (acc.minBalance != null && val < acc.minBalance) map[person].belowCount++;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [accounts, dates]);

  const today: string = cashflowData?.data?.today || '';

  const { waterfall, endingTrend } = useMemo(() => {
    const rawWaterfall: any[] = cashflowData?.data?.waterfall || [];
    const rawEndingTrend: any[] = cashflowData?.data?.endingTrend || [];
    const allDates: string[] = cashflowData?.data?.dates || [];
    if (allDates.length === 0) return { waterfall: rawWaterfall, endingTrend: rawEndingTrend };
    const maxDate = allDates[allDates.length - 1];
    const cutoff = new Date(maxDate + 'T12:00:00');
    cutoff.setDate(cutoff.getDate() - weeksBack * 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const fwd = new Date(maxDate + 'T12:00:00');
    fwd.setDate(fwd.getDate() + Math.max(8, weeksBack) * 7);
    const fwdStr = fwd.toISOString().split('T')[0];
    return {
      waterfall: rawWaterfall.filter((w: any) => w.date >= cutoffStr && w.date <= fwdStr),
      endingTrend: rawEndingTrend.filter((e: any) => e.date >= cutoffStr && e.date <= fwdStr),
    };
  }, [cashflowData, weeksBack]);

  const waterfallChartData = useMemo(() => {
    return waterfall.map((w: any) => {
      const d = new Date(w.date + 'T12:00:00');
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`, fullDate: w.date,
        additions: w.additionsForecast, subtractions: -w.subtractionsForecast, net: w.netForecast,
        additionsActual: w.additionsActual, subtractionsActual: -w.subtractionsActual,
        isPast: w.date <= today,
      };
    });
  }, [waterfall, today]);

  const endingCashData = useMemo(() => {
    return endingTrend
      .filter((e: any) => e.forecast != null || e.actual != null)
      .map((e: any) => {
        const d = new Date(e.date + 'T12:00:00');
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`, fullDate: e.date,
          forecast: e.forecast, actual: e.actual && e.actual !== 0 ? e.actual : null, target: e.target,
        };
      });
  }, [endingTrend]);

  const varianceChartData = useMemo(() => {
    return endingTrend
      .filter((e: any) => e.variance != null && e.variance !== 0)
      .map((e: any) => {
        const d = new Date(e.date + 'T12:00:00');
        return { date: `${d.getMonth() + 1}/${d.getDate()}`, fullDate: e.date, variance: e.variance, isPositive: e.variance >= 0 };
      });
  }, [endingTrend]);

  const hasCashflowData = waterfallChartData.length > 0 || endingCashData.length > 0;

  const monthlyData: any[] = cashflowData?.data?.monthly || [];

  const endingCashSummary = useMemo(() => {
    if (endingCashData.length === 0) return null;
    const withActual = endingCashData.filter((d: any) => d.actual != null);
    const latestActual = withActual.length > 0 ? withActual[withActual.length - 1] : null;
    const lastProjected = endingCashData[endingCashData.length - 1];
    const currentMonth = today.substring(0, 7);
    const currentMonthEntries = endingCashData.filter((d: any) => d.fullDate?.startsWith(currentMonth));
    const monthEndProjection = currentMonthEntries.length > 0 ? currentMonthEntries[currentMonthEntries.length - 1] : null;
    const prevWeek = endingCashData.length >= 2 ? endingCashData[endingCashData.length - 2] : null;
    const wowChange = lastProjected && prevWeek && lastProjected.forecast != null && prevWeek.forecast != null
      ? lastProjected.forecast - prevWeek.forecast : null;
    return { latestActual, lastProjected, monthEndProjection, wowChange };
  }, [endingCashData, today]);

  function formatMonth(monthStr: string): string {
    const [y, m] = monthStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m) - 1]} ${y}`;
  }

  function getCellColor(forecast: number | null, minBalance: number | null): string {
    if (forecast == null || minBalance == null) return '';
    if (forecast < minBalance) return 'bg-red-500/15 text-red-400';
    if (forecast < minBalance * 1.2) return 'bg-amber-500/15 text-amber-400';
    return 'bg-emerald-500/10 text-emerald-400';
  }

  const DarkTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#162038] border border-[#1e3054] rounded-lg shadow-xl p-3 text-sm">
        <p className="font-medium text-[#e8ecf4] mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const variance = (d?.actual ?? 0) - (d?.forecast ?? 0);
    return (
      <div className="bg-[#162038] border border-[#1e3054] rounded-lg shadow-xl p-3 text-sm max-w-xs">
        <p className="font-medium text-[#e8ecf4] mb-1">{d?.fullName || d?.name}</p>
        <p className="text-xs text-[#5a6f8f] mb-1">{d?.isRevenue ? 'Revenue' : 'Expense'}</p>
        <p style={{ color: COLORS.cyan }}>Forecast: {formatCurrency(d?.forecast)}</p>
        <p style={{ color: COLORS.green }}>Actual: {formatCurrency(d?.actual)}</p>
        <p style={{ color: variance >= 0 ? COLORS.green : COLORS.red }}>
          Variance: {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
        </p>
      </div>
    );
  };

  const WaterfallTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-[#162038] border border-[#1e3054] rounded-lg shadow-xl p-3 text-sm">
        <p className="font-medium text-[#e8ecf4] mb-1">{label}</p>
        <p className="text-[#10b981]">Additions: {formatCurrency(d?.additions || 0)}</p>
        <p className="text-[#ef4444]">Subtractions: {formatCurrency(Math.abs(d?.subtractions || 0))}</p>
        <p className="font-medium" style={{ color: (d?.net || 0) >= 0 ? COLORS.green : COLORS.red }}>
          Net: {formatCurrency(d?.net || 0)}
        </p>
      </div>
    );
  };

  const EndingCashTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#162038] border border-[#1e3054] rounded-lg shadow-xl p-3 text-sm">
        <p className="font-medium text-[#e8ecf4] mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          p.value != null && <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  const VarianceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    return (
      <div className="bg-[#162038] border border-[#1e3054] rounded-lg shadow-xl p-3 text-sm">
        <p className="font-medium text-[#e8ecf4] mb-1">{label}</p>
        <p style={{ color: val >= 0 ? COLORS.green : COLORS.red }}>Variance: {formatCurrency(val)}</p>
        <p className="text-xs text-[#5a6f8f] mt-1">{val >= 0 ? 'Over forecast' : 'Under forecast'}</p>
      </div>
    );
  };

  const hasData = accounts.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#e8ecf4]">Corporate Cash Forecast V2</h1>
          <p className="text-[#5a6f8f] mt-1">Forecasted balances vs minimum requirements</p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-md hover:bg-[#2563eb] disabled:opacity-50 text-sm"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" /> Total Forecast
          </div>
          <div className="text-2xl font-bold text-[#e8ecf4]">{formatCurrency(summary.totalForecast)}</div>
        </div>
        <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Below Minimum
          </div>
          <div className="text-2xl font-bold text-[#ef4444]">{summary.belowMinimum}</div>
          <div className="text-xs text-[#5a6f8f]">accounts need attention</div>
        </div>
        <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-500" /> Near Minimum
          </div>
          <div className="text-2xl font-bold text-[#f59e0b]">{summary.nearMinimum}</div>
          <div className="text-xs text-[#5a6f8f]">within 20% of minimum</div>
        </div>
      </div>

      {/* Controls + Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-[#162038] border border-[#1e3054] p-4 rounded-xl">
        <div className="flex border-b sm:border-b-0 sm:border-r border-[#1e3054] pr-0 sm:pr-4 pb-2 sm:pb-0">
          {(['dashboard', 'table', 'monthly', 'pigment'] as const).map(tab => {
            const Icon = tab === 'dashboard' ? BarChart3 : tab === 'table' ? Table2 : tab === 'monthly' ? Calendar : PieChart;
            const label = tab === 'pigment' ? 'FP&A (Pigment)' : tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab !== 'dashboard' ? 'ml-1' : ''} ${
                  activeTab === tab ? 'bg-[#3b82f6] text-white' : 'text-gray-600 hover:bg-[#1a2744]'
                }`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#5a6f8f]">Forecast Range:</label>
          <select value={weeksBack} onChange={e => setWeeksBack(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            <option value={2}>2 Weeks</option>
            <option value={4}>4 Weeks</option>
            <option value={8}>8 Weeks</option>
            <option value={12}>12 Weeks</option>
            <option value={26}>6 Months</option>
            <option value={52}>1 Year</option>
            <option value={104}>2 Years</option>
          </select>
        </div>
        <div className="flex items-center gap-4 ml-auto text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200"></span> Below Min</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></span> Near Min (&lt;20%)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200"></span> Healthy</span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E6B3C]"></div></div>
      ) : error ? (
        <div className="text-center py-12 text-[#ef4444]">Failed to load forecast data.</div>
      ) : !hasData ? (
        <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-12 text-center">
          <h3 className="text-lg font-medium text-[#e8ecf4]">No forecast data available</h3>
          <p className="text-[#5a6f8f] mt-2">Run the ingestion script to load data from the Google Sheet.</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Row 1: Trend + Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#162038] border border-[#1e3054] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#8a9bb8]">Total Forecast vs Minimum Requirement</h3>
                <div className="flex gap-1">
                  {([
                    { label: '1M', weeks: 4 }, { label: '3M', weeks: 13 }, { label: '6M', weeks: 26 },
                    { label: '9M', weeks: 39 }, { label: '1Y', weeks: 52 }, { label: '2Y', weeks: 104 },
                  ] as const).map(opt => (
                    <button key={opt.label}
                      onClick={() => setChartHorizon(chartHorizon === opt.weeks ? null : opt.weeks)}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                        chartHorizon === opt.weeks ? 'bg-[#3b82f6] text-white' : 'bg-[#111b2e] text-[#5a6f8f] border border-[#1e3054] hover:bg-[#1a2744]'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Total Forecast" stroke={COLORS.cyan} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="totalMin" name="Total Min Required" stroke={COLORS.red} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Health Breakdown */}
            <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Account Health</h3>
              <div className="space-y-4">
                {healthCounts.total > 0 && (
                  <div className="flex rounded-full overflow-hidden h-6">
                    {healthCounts.healthy > 0 && <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(healthCounts.healthy / healthCounts.total) * 100}%` }}>{healthCounts.healthy}</div>}
                    {healthCounts.near > 0 && <div className="bg-yellow-400 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(healthCounts.near / healthCounts.total) * 100}%` }}>{healthCounts.near}</div>}
                    {healthCounts.below > 0 && <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(healthCounts.below / healthCounts.total) * 100}%` }}>{healthCounts.below}</div>}
                  </div>
                )}
                <div className="space-y-3 mt-4">
                  {[
                    { label: 'Healthy', color: 'bg-green-500', count: healthCounts.healthy },
                    { label: 'Near Minimum', color: 'bg-yellow-400', count: healthCounts.near },
                    { label: 'Below Minimum', color: 'bg-red-500', count: healthCounts.below },
                  ].map(h => (
                    <div key={h.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${h.color}`}></span>
                        <span className="text-sm text-[#8a9bb8]">{h.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#e8ecf4]">{h.count}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By Responsible Person</h4>
                  <div className="space-y-2">
                    {byResponsible.map((r: any) => (
                      <div key={r.name} className="flex items-center justify-between text-sm">
                        <span className="text-[#8a9bb8]">{r.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium">{r.count} acct{r.count !== 1 ? 's' : ''}</span>
                          {r.belowCount > 0 && <span className="text-xs bg-[rgba(239,68,68,0.15)] text-[#ef4444] px-1.5 py-0.5 rounded">{r.belowCount} below</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Forecast vs Actuals by Category */}
          {categoryComparison.length > 0 && (
            <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#e8ecf4] mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#a78bfa]"></span>Forecast vs Actuals by Category</h3>
              <ResponsiveContainer width="100%" height={Math.max(350, categoryComparison.length * 44)}>
                <BarChart data={categoryComparison} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} stroke={COLORS.grid} />
                  <YAxis type="category" dataKey="name" width={210} tick={{ fontSize: 11, fill: '#8a9bb8' }} stroke={COLORS.grid} />
                  <Tooltip content={<CategoryTooltip />} />
                  <Legend />
                  <Bar dataKey="forecast" name="Forecast" fill={COLORS.cyan} radius={[0, 4, 4, 0]} fillOpacity={0.6} />
                  <Bar dataKey="actual" name="Actual" fill={COLORS.green} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Row 3: Revenue & Expense Time Series */}
          <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#e8ecf4] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22d3ee]"></span>
                Revenue & Expense — Historical & Projections
              </h3>
              <div className="flex gap-2">
                <button onClick={selectAll}
                  className="px-2 py-0.5 text-[0.7rem] font-semibold rounded-lg bg-[#111b2e] text-[#5a6f8f] border border-[#1e3054] hover:text-[#e8ecf4] hover:border-[#3b82f6] transition-all">
                  All
                </button>
                <button onClick={clearAll}
                  className="px-2 py-0.5 text-[0.7rem] font-semibold rounded-lg bg-[#111b2e] text-[#5a6f8f] border border-[#1e3054] hover:text-[#e8ecf4] hover:border-[#ef4444] transition-all">
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {categoryTimeSeries.map((c: any) => {
                const isSelected = selectedCategories.has(c.lineItem);
                const isRevenue = c.category === 'addition';
                return (
                  <button
                    key={c.lineItem}
                    onClick={() => toggleCategory(c.lineItem)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                      isSelected
                        ? isRevenue
                          ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40'
                          : 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                        : 'bg-[#111b2e] text-[#5a6f8f] border-[#1e3054] hover:text-[#8a9bb8]'
                    }`}
                  >
                    {isRevenue ? '+' : '\u2212'} {c.lineItem}
                  </button>
                );
              })}
            </div>
            {netTimeSeriesData.length > 0 ? (
              <>
                <div className="text-xs text-[#5a6f8f] mb-2">
                  {selectedCategories.size} categor{selectedCategories.size === 1 ? 'y' : 'ies'} selected
                  {selectedCategories.size > 1 && ' — showing net result'}
                  {mcChartData.some((d: any) => d.mcP50 != null) && ' — yellow = Monte Carlo 6-month projection (10th/90th band)'}
                </div>
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={mcChartData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="date" tick={axisTickSm} stroke={COLORS.grid} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="mcP90" name="MC 90th Pctl" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
                    <Line type="monotone" dataKey="mcP10" name="MC 10th Pctl" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
                    <Line type="monotone" dataKey="mcP50" name="MC Median" stroke="#f59e0b" strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="forecast" name="Forecast" stroke={COLORS.cyan} strokeWidth={2} dot={false} strokeDasharray="6 3" connectNulls />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke={COLORS.green} strokeWidth={2.5} dot={false} connectNulls />
                    <ReferenceLine y={0} stroke="#5a6f8f" strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex items-center justify-center h-[380px] text-[#5a6f8f] text-sm">
                Select one or more categories above to view the net historical trend and future projections
              </div>
            )}
          </div>

          {/* Cash Flow Section */}
          {hasCashflowData && (
            <>
              <div className="border-t pt-6 mt-2">
                <h2 className="text-lg font-bold text-[#e8ecf4] mb-1">Cash Flow Analysis</h2>
                <p className="text-sm text-gray-500 mb-4">Weekly additions, subtractions, and ending cash position</p>
              </div>

              {endingCashSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {endingCashSummary.latestActual && (
                    <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1"><DollarSign className="h-4 w-4 text-green-500" /> Latest Actual</div>
                      <div className="text-xl font-bold text-[#e8ecf4]">{formatCurrency(endingCashSummary.latestActual.actual)}</div>
                      <div className="text-xs text-[#5a6f8f]">Week of {endingCashSummary.latestActual.date}</div>
                    </div>
                  )}
                  {endingCashSummary.monthEndProjection && (
                    <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1"><Calendar className="h-4 w-4 text-blue-500" /> Month-End Projection</div>
                      <div className="text-xl font-bold text-[#e8ecf4]">{formatCurrency(endingCashSummary.monthEndProjection.forecast)}</div>
                      <div className="text-xs text-[#5a6f8f]">Week of {endingCashSummary.monthEndProjection.date}</div>
                    </div>
                  )}
                  {endingCashSummary.lastProjected && endingCashSummary.lastProjected.forecast != null && (
                    <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1"><TrendingDown className="h-4 w-4 text-purple-500" /> Furthest Projection</div>
                      <div className="text-xl font-bold text-[#e8ecf4]">{formatCurrency(endingCashSummary.lastProjected.forecast)}</div>
                      <div className="text-xs text-[#5a6f8f]">Week of {endingCashSummary.lastProjected.date}</div>
                    </div>
                  )}
                  {endingCashSummary.wowChange != null && (
                    <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                        {endingCashSummary.wowChange >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                        Week-over-Week
                      </div>
                      <div className={`text-xl font-bold ${endingCashSummary.wowChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {endingCashSummary.wowChange >= 0 ? '+' : ''}{formatCurrency(endingCashSummary.wowChange)}
                      </div>
                      <div className="text-xs text-[#5a6f8f]">Projected change</div>
                    </div>
                  )}
                </div>
              )}

              {waterfallChartData.length > 0 && (
                <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Cash Flow Waterfall — Additions vs Subtractions</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={waterfallChartData} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                      <Tooltip content={<WaterfallTooltip />} />
                      <Legend />
                      <Bar dataKey="additions" name="Additions (Forecast)" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="subtractions" name="Subtractions (Forecast)" fill={COLORS.red} radius={[0, 0, 4, 4]} />
                      <Line type="monotone" dataKey="net" name="Net Cash Flow" stroke={COLORS.cyan} strokeWidth={2} dot={{ r: 4 }} />
                      <ReferenceLine y={0} stroke="#5a6f8f" strokeDasharray="3 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {endingCashData.length > 0 && (
                  <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Ending Cash Position — Forecast vs Actual</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={endingCashData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                        <Tooltip content={<EndingCashTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="forecast" name="Ending Cash (Forecast)" stroke={COLORS.cyan} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="actual" name="Ending Cash (Actual)" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                        {endingCashData.some((d: any) => d.target != null) && (
                          <Line type="monotone" dataKey="target" name="Target" stroke={COLORS.red} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {varianceChartData.length > 0 && (
                  <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Forecast vs Actual Variance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={varianceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                        <Tooltip content={<VarianceTooltip />} />
                        <ReferenceLine y={0} stroke="#5a6f8f" strokeWidth={1} />
                        <Bar dataKey="variance" name="Variance ($)" radius={[4, 4, 0, 0]}>
                          {varianceChartData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.isPositive ? '#16a34a' : '#dc2626'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-[#5a6f8f] mt-2 text-center">Green = actual exceeded forecast &middot; Red = actual fell short</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'pigment' ? (
        <div className="space-y-6">
          {!pigmentData ? (
            <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-12 text-center">
              <h3 className="text-lg font-medium text-[#e8ecf4]">No Pigment data available</h3>
              <p className="text-[#5a6f8f] mt-2">Sync Pigment data to view FP&A metrics.</p>
            </div>
          ) : (
            <>
              {/* Pigment KPI Cards */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#e8ecf4]">FP&A Metrics from Pigment</h2>
                  <p className="text-xs text-[#5a6f8f] mt-0.5">Scenario: {pigmentData.scenario} &middot; Synced: {new Date(pigmentData.lastSynced).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#5a6f8f] text-sm mb-1">
                    <DollarSign className="h-4 w-4 text-[#22d3ee]" /> FY26 Revenue
                  </div>
                  <div className="text-2xl font-bold text-[#e8ecf4]">{formatCurrency(pigmentData.summary.fy26Revenue)}</div>
                  <div className="text-xs mt-1">
                    <span className={pigmentData.summary.revenueGrowth >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                      {pigmentData.summary.revenueGrowth >= 0 ? '+' : ''}{(pigmentData.summary.revenueGrowth * 100).toFixed(1)}% YoY
                    </span>
                    <span className="text-[#5a6f8f] ml-1">vs FY25 {formatCurrency(pigmentData.summary.fy25Revenue)}</span>
                  </div>
                </div>
                <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#5a6f8f] text-sm mb-1">
                    <TrendingUp className="h-4 w-4 text-[#a78bfa]" /> Latest ARR
                  </div>
                  <div className="text-2xl font-bold text-[#e8ecf4]">{formatCurrency(pigmentData.summary.latestARR)}</div>
                  <div className="text-xs mt-1">
                    <span className={pigmentData.summary.arrGrowth >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                      {pigmentData.summary.arrGrowth >= 0 ? '+' : ''}{(pigmentData.summary.arrGrowth * 100).toFixed(1)}% YoY
                    </span>
                  </div>
                </div>
                <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#5a6f8f] text-sm mb-1">
                    <BarChart3 className="h-4 w-4 text-[#10b981]" /> FY26 Operating Cash Flow
                  </div>
                  <div className="text-2xl font-bold text-[#e8ecf4]">{formatCurrency(pigmentData.summary.fy26OCF)}</div>
                  <div className="text-xs mt-1">
                    <span className={pigmentData.summary.ocfGrowth >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                      {pigmentData.summary.ocfGrowth >= 0 ? '+' : ''}{(pigmentData.summary.ocfGrowth * 100).toFixed(1)}% YoY
                    </span>
                    <span className="text-[#5a6f8f] ml-1">vs FY25 {formatCurrency(pigmentData.summary.fy25OCF)}</span>
                  </div>
                </div>
              </div>

              {/* Revenue FY25 vs FY26 */}
              <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[#e8ecf4] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22d3ee]"></span>
                  Monthly Revenue — FY25 vs FY26
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={pigmentData.revenueChart} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="month" tick={axisTickSm} stroke={COLORS.grid} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend />
                    <Bar dataKey="fy25" name="FY25" fill={COLORS.gray} radius={[4, 4, 0, 0]} fillOpacity={0.5} />
                    <Bar dataKey="fy26" name="FY26" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ARR Trend */}
              <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[#e8ecf4] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#a78bfa]"></span>
                  ARR Trajectory — FY25 through FY26
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={pigmentData.arrChart} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="label" tick={axisTickSm} stroke={COLORS.grid} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="value" name="ARR" stroke={COLORS.purple} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.purple }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Operating Cash Flow FY25 vs FY26 */}
              <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[#e8ecf4] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  Operating Cash Flow — FY25 vs FY26
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={pigmentData.ocfChart} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="month" tick={axisTickSm} stroke={COLORS.grid} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend />
                    <Bar dataKey="fy25" name="FY25 OCF" fill={COLORS.gray} radius={[4, 4, 0, 0]} fillOpacity={0.5} />
                    <Bar dataKey="fy26" name="FY26 OCF" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                    <ReferenceLine y={0} stroke="#5a6f8f" strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Side-by-side: Pigment OCF vs GSheet Cash Flow */}
              {pigmentData.comparison?.length > 0 && (
                <>
                  <div className="border-t border-[#1e3054] pt-6 mt-2">
                    <h2 className="text-lg font-bold text-[#e8ecf4] mb-1">Pigment vs Treasury GSheet — Side by Side</h2>
                    <p className="text-xs text-[#5a6f8f] mb-4">Pigment FP&A operating cash flow compared to the weekly Treasury cash forecast (aggregated monthly)</p>
                  </div>

                  {/* Cash Flow Comparison Chart */}
                  <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#e8ecf4] mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                      Monthly Net Cash Flow — Pigment OCF vs GSheet Treasury
                    </h3>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={pigmentData.comparison.filter((c: any) => c.pigmentOCF != null)} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                        <XAxis dataKey="label" tick={axisTickSm} stroke={COLORS.grid} />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                        <Tooltip content={<DarkTooltip />} />
                        <Legend />
                        <Bar dataKey="pigmentOCF" name="Pigment OCF (FP&A)" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="gsheetNetCashFlow" name="GSheet Net Cash Flow (Treasury)" fill={COLORS.cyan} radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                        <ReferenceLine y={0} stroke="#5a6f8f" strokeDasharray="3 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-[#5a6f8f] mt-2 text-center">
                      Pigment OCF = FP&A operating cash flow (monthly) &middot; GSheet = Treasury weekly additions + subtractions (aggregated to monthly)
                    </p>
                  </div>

                  {/* Ending Cash Comparison */}
                  <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#e8ecf4] mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#22d3ee]"></span>
                      Month-End Cash Position — GSheet Forecast vs Actual
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={pigmentData.comparison} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                        <XAxis dataKey="label" tick={axisTickSm} stroke={COLORS.grid} />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                        <Tooltip content={<DarkTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="gsheetEndingCash" name="GSheet Ending (Forecast)" stroke={COLORS.cyan} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="gsheetEndingActual" name="GSheet Ending (Actual)" stroke={COLORS.green} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pigment Revenue vs GSheet Additions */}
                  <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#e8ecf4] mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#a78bfa]"></span>
                      Pigment Revenue vs GSheet Cash Additions
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={pigmentData.comparison.filter((c: any) => c.pigmentRevenue != null)} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                        <XAxis dataKey="label" tick={axisTickSm} stroke={COLORS.grid} />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                        <Tooltip content={<DarkTooltip />} />
                        <Legend />
                        <Bar dataKey="pigmentRevenue" name="Pigment Revenue (Accrual)" fill={COLORS.purple} radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                        <Bar dataKey="gsheetAdditions" name="GSheet Cash Additions (Treasury)" fill={COLORS.green} radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-[#5a6f8f] mt-2 text-center">
                      Revenue (accrual) vs actual cash collected — timing differences are expected
                    </p>
                  </div>

                  {/* Detailed Comparison Table */}
                  <div className="bg-[#162038] border border-[#1e3054] rounded-xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#111b2e] border-b border-[#1e3054]">
                          <th className="px-4 py-3 text-left font-medium text-[#5a6f8f]">Month</th>
                          <th className="px-4 py-3 text-right font-medium text-[#a78bfa]">Pigment OCF</th>
                          <th className="px-4 py-3 text-right font-medium text-[#22d3ee]">GSheet Net CF</th>
                          <th className="px-4 py-3 text-right font-medium text-[#5a6f8f]">Variance</th>
                          <th className="px-4 py-3 text-right font-medium text-[#a78bfa]">Pigment Rev</th>
                          <th className="px-4 py-3 text-right font-medium text-[#10b981]">GSheet Additions</th>
                          <th className="px-4 py-3 text-right font-medium text-[#22d3ee]">End Cash (Fcst)</th>
                          <th className="px-4 py-3 text-right font-medium text-[#10b981]">End Cash (Actual)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pigmentData.comparison.map((c: any) => {
                          const variance = c.pigmentOCF != null ? c.pigmentOCF - c.gsheetNetCashFlow : null;
                          return (
                            <tr key={c.month} className="border-b border-[#1e3054] hover:bg-[rgba(59,130,246,0.06)]">
                              <td className="px-4 py-3 font-medium text-[#e8ecf4]">{c.label}</td>
                              <td className="px-4 py-3 text-right font-mono text-[#a78bfa]">{c.pigmentOCF != null ? formatCurrency(c.pigmentOCF) : '-'}</td>
                              <td className={`px-4 py-3 text-right font-mono ${c.gsheetNetCashFlow >= 0 ? 'text-[#22d3ee]' : 'text-[#ef4444]'}`}>{formatCurrency(c.gsheetNetCashFlow)}</td>
                              <td className={`px-4 py-3 text-right font-mono text-xs ${variance != null ? (variance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]') : 'text-[#5a6f8f]'}`}>
                                {variance != null ? `${variance >= 0 ? '+' : ''}${formatCurrency(variance)}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[#a78bfa]">{c.pigmentRevenue != null ? formatCurrency(c.pigmentRevenue) : '-'}</td>
                              <td className="px-4 py-3 text-right font-mono text-[#10b981]">{formatCurrency(c.gsheetAdditions)}</td>
                              <td className="px-4 py-3 text-right font-mono text-[#22d3ee]">{c.gsheetEndingCash != null ? formatCurrency(c.gsheetEndingCash) : '-'}</td>
                              <td className="px-4 py-3 text-right font-mono text-[#10b981]">{c.gsheetEndingActual != null ? formatCurrency(c.gsheetEndingActual) : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ) : activeTab === 'monthly' ? (
        <div className="space-y-6">
          <div className="bg-[#162038] border border-[#1e3054] rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#111b2e] border-b border-[#1e3054]">
                  <th className="px-6 py-3 text-left font-medium text-[#5a6f8f]">Month</th>
                  <th className="px-6 py-3 text-right font-medium text-[#5a6f8f]">Additions (Fcst)</th>
                  <th className="px-6 py-3 text-right font-medium text-[#5a6f8f]">Subtractions (Fcst)</th>
                  <th className="px-6 py-3 text-right font-medium text-[#5a6f8f]">Net Cash Flow</th>
                  <th className="px-6 py-3 text-right font-medium text-[#5a6f8f]">Month-End Cash</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m: any) => {
                  const isCurrent = today.startsWith(m.month);
                  return (
                    <tr key={m.month} className={`border-b ${isCurrent ? 'bg-[rgba(59,130,246,0.08)]' : 'hover:bg-[rgba(59,130,246,0.06)]'}`}>
                      <td className="px-6 py-4 font-medium text-[#e8ecf4]">
                        {formatMonth(m.month)}
                        {isCurrent && <span className="ml-2 text-xs bg-[rgba(59,130,246,0.15)] text-[#3b82f6] px-1.5 py-0.5 rounded">Current</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[#10b981]">{formatCurrency(m.additions)}</td>
                      <td className="px-6 py-4 text-right font-mono text-[#ef4444]">{formatCurrency(Math.abs(m.subtractions))}</td>
                      <td className={`px-6 py-4 text-right font-mono font-semibold ${m.net >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-[#e8ecf4]">
                        {m.endingCash != null ? formatCurrency(m.endingCash) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {monthlyData.length > 0 && (
            <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cash Flow Summary</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={monthlyData.map((m: any) => ({
                  month: formatMonth(m.month), additions: m.additions, subtractions: -Math.abs(m.subtractions), net: m.net, endingCash: m.endingCash,
                }))} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="flow" tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                  <YAxis yAxisId="balance" orientation="right" tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend />
                  <Bar yAxisId="flow" dataKey="additions" name="Additions" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="flow" dataKey="subtractions" name="Subtractions" fill={COLORS.red} radius={[0, 0, 4, 4]} />
                  <Line yAxisId="balance" type="monotone" dataKey="endingCash" name="Month-End Cash" stroke={COLORS.cyan} strokeWidth={2} dot={{ r: 5 }} connectNulls />
                  <ReferenceLine yAxisId="flow" y={0} stroke="#5a6f8f" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#162038] border border-[#1e3054] rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111b2e] border-b border-[#1e3054]">
                <th className="px-4 py-3 text-left font-medium text-gray-600 sticky left-0 bg-[#111b2e]">Account</th>
                <th className="px-4 py-3 text-right font-medium text-[#5a6f8f]">Min Balance</th>
                <th className="px-4 py-3 text-left font-medium text-[#5a6f8f]">Responsible</th>
                {dates.map((d: string) => <th key={d} className="px-4 py-3 text-right font-medium text-[#5a6f8f]">{formatDateHeader(d)}</th>)}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc: any, idx: number) => (
                <tr key={idx} className="border-b hover:bg-[rgba(59,130,246,0.06)]">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-[#162038]">{acc.accountName}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#5a6f8f]">{acc.minBalance != null ? formatCurrency(acc.minBalance) : '-'}</td>
                  <td className="px-4 py-3 text-[#5a6f8f]">{acc.responsiblePerson || '-'}</td>
                  {dates.map((d: string) => {
                    const val = acc.forecasts[d]?.forecast;
                    return <td key={d} className={`px-4 py-3 text-right font-mono ${getCellColor(val, acc.minBalance)}`}>{val != null ? formatCurrency(val) : '-'}</td>;
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
