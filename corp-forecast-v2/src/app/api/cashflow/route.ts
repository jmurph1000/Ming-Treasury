import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export function GET(req: NextRequest) {
  const weeksBack = parseInt(req.nextUrl.searchParams.get('weeks_back') || '4');
  const weeksForward = parseInt(req.nextUrl.searchParams.get('weeks_forward') || '8');
  const daysBack = weeksBack * 7;
  const daysForward = weeksForward * 7;

  const db = getDb();
  const rows = db.prepare(
    `SELECT line_item, category, line_type, flow_date, amount, frequency, responsible_person
     FROM corp_cashflow_items
     WHERE flow_date >= date((SELECT MAX(flow_date) FROM corp_cashflow_items), '-' || ? || ' days')
       AND flow_date <= date((SELECT MAX(flow_date) FROM corp_cashflow_items), '+' || ? || ' days')
     ORDER BY category, line_item, flow_date`
  ).all(daysBack.toString(), daysForward.toString()) as any[];

  const itemMap = new Map<string, any>();
  const dates = new Set<string>();

  for (const row of rows) {
    dates.add(row.flow_date);
    const key = `${row.category}::${row.line_item}::${row.line_type}`;
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        lineItem: row.line_item,
        category: row.category,
        lineType: row.line_type,
        frequency: row.frequency,
        responsiblePerson: row.responsible_person,
        values: {} as Record<string, number>,
      });
    }
    itemMap.get(key)!.values[row.flow_date] = row.amount;
  }

  const allItems = Array.from(itemMap.values());
  const additions = allItems.filter(i => i.category === 'addition');
  const subtractions = allItems.filter(i => i.category === 'subtraction');
  const additionTotals = allItems.filter(i => i.category === 'addition_total');
  const subtractionTotals = allItems.filter(i => i.category === 'subtraction_total');
  const ending = allItems.filter(i => i.category === 'ending');

  const sortedDates = Array.from(dates).sort();

  const waterfall = sortedDates.map(d => {
    const addFcst = additionTotals.find(i => i.lineType === 'forecast')?.values[d] ?? 0;
    const subFcst = subtractionTotals.find(i => i.lineType === 'forecast')?.values[d] ?? 0;
    const addActual = additionTotals.find(i => i.lineType === 'actual')?.values[d] ?? 0;
    const subActual = subtractionTotals.find(i => i.lineType === 'actual')?.values[d] ?? 0;
    return {
      date: d,
      additionsForecast: addFcst,
      subtractionsForecast: Math.abs(subFcst),
      netForecast: addFcst + subFcst,
      additionsActual: addActual,
      subtractionsActual: Math.abs(subActual),
      netActual: addActual + subActual,
    };
  });

  const endingTrend = sortedDates.map(d => {
    const forecast = ending.find(i => i.lineItem === 'Ending Cash' && i.lineType === 'forecast')?.values[d] ?? null;
    const actual = ending.find(i => i.lineItem === 'Ending Cash' && i.lineType === 'actual')?.values[d] ?? null;
    const variance = ending.find(i => i.lineItem === 'Ending Cash' && i.lineType === 'variance')?.values[d] ?? null;
    const target = ending.find(i => i.lineItem === 'TARGET' && i.lineType === 'forecast')?.values[d] ?? null;
    return { date: d, forecast, actual, variance, target };
  });

  const monthlyMap = new Map<string, { additions: number; subtractions: number; net: number; endingCash: number | null; additionsActual: number; subtractionsActual: number }>();
  for (const d of sortedDates) {
    const month = d.substring(0, 7);
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { additions: 0, subtractions: 0, net: 0, endingCash: null, additionsActual: 0, subtractionsActual: 0 });
    }
    const m = monthlyMap.get(month)!;
    const w = waterfall.find(ww => ww.date === d);
    if (w) {
      m.additions += w.additionsForecast;
      m.subtractions += w.subtractionsForecast;
      m.net += w.netForecast;
      m.additionsActual += w.additionsActual;
      m.subtractionsActual += w.subtractionsActual;
    }
    const ec = endingTrend.find(e => e.date === d);
    if (ec && ec.forecast != null) {
      m.endingCash = ec.forecast;
    }
  }
  const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));

  const today = new Date().toISOString().split('T')[0];

  const categoryComparison = [...additions, ...subtractions]
    .map(item => {
      const fcstItem = allItems.find(i => i.category === item.category && i.lineItem === item.lineItem && i.lineType === 'forecast');
      const actItem = allItems.find(i => i.category === item.category && i.lineItem === item.lineItem && i.lineType === 'actual');
      if (!fcstItem && !actItem) return null;
      if (item.lineType !== 'forecast') return null;
      const fcstTotal = fcstItem ? Object.values(fcstItem.values as Record<string, number>).reduce((s, v) => s + v, 0) : 0;
      const actTotal = actItem ? Object.values(actItem.values as Record<string, number>).reduce((s, v) => s + v, 0) : 0;
      return {
        lineItem: item.lineItem,
        category: item.category,
        forecast: Math.abs(fcstTotal),
        actual: Math.abs(actTotal),
        variance: Math.abs(actTotal) - Math.abs(fcstTotal),
        hasActual: !!actItem && actTotal !== 0,
      };
    })
    .filter(Boolean)
    .filter((item: any) => item.forecast > 0 || item.actual > 0);

  // Build per-category time series using FULL date range (not limited by weeks_back)
  const keyItems = ['Revenue inflow', 'Payroll', 'Estimated A/P run', 'Fidelity/401k/Collective Health',
    'Canada Payroll/AP CAD', 'Mexico Payroll/Tax MXN', 'Turkiye Payroll/Tax TRY',
    'Employee HI / benefits', 'Business tax', 'Partner Rev Share (ACH)',
    'Loan interest', 'Cashout funding', 'Wires (eg. GiftBJt funding)'];

  const fullRows = db.prepare(
    `SELECT line_item, category, line_type, flow_date, amount
     FROM corp_cashflow_items
     WHERE category IN ('addition', 'subtraction')
       AND line_type IN ('forecast', 'actual')
       AND line_item IN (${keyItems.map(() => '?').join(',')})
     ORDER BY line_item, flow_date`
  ).all(...keyItems) as any[];

  const tsMap = new Map<string, { category: string; forecast: Record<string, number>; actual: Record<string, number> }>();
  for (const row of fullRows) {
    if (!tsMap.has(row.line_item)) tsMap.set(row.line_item, { category: row.category, forecast: {}, actual: {} });
    const entry = tsMap.get(row.line_item)!;
    if (row.line_type === 'forecast') entry.forecast[row.flow_date] = row.amount;
    else entry.actual[row.flow_date] = row.amount;
  }

  const categoryTimeSeries = keyItems
    .map(name => {
      const entry = tsMap.get(name);
      if (!entry) return null;
      const allDates = new Set([...Object.keys(entry.forecast), ...Object.keys(entry.actual)]);
      const series = Array.from(allDates).sort().map(d => ({
        date: d,
        forecast: entry.forecast[d] != null ? Math.abs(entry.forecast[d]) : null,
        actual: entry.actual[d] != null ? Math.abs(entry.actual[d]) : null,
      }));
      return { lineItem: name, category: entry.category, series };
    })
    .filter(Boolean);

  return NextResponse.json({
    success: true,
    data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison, categoryTimeSeries },
  });
}
