const Database = require('better-sqlite3');
const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'public', 'data');
mkdirSync(OUT_DIR, { recursive: true });

// ── Forecast ──
function exportForecast() {
  const db = new Database(resolve(ROOT, 'forecast.db'));
  db.pragma('journal_mode = WAL');
  const daysBack = 728; // 104 weeks

  const rows = db.prepare(
    `SELECT account_name, forecast_date, forecast_amount, actual_amount, min_balance, responsible_person
     FROM corp_forecast_snapshots
     WHERE forecast_date >= date((SELECT MAX(forecast_date) FROM corp_forecast_snapshots), '-' || ? || ' days')
       AND account_name NOT LIKE '%Morgan Stanley%'
       AND account_name NOT LIKE '%(MS)%'
     ORDER BY account_name, forecast_date`
  ).all(daysBack.toString());

  const accountMap = new Map();
  for (const row of rows) {
    if (!accountMap.has(row.account_name)) {
      accountMap.set(row.account_name, {
        accountName: row.account_name,
        minBalance: row.min_balance,
        responsiblePerson: row.responsible_person,
        forecasts: {},
      });
    }
    const acc = accountMap.get(row.account_name);
    if (row.min_balance != null) acc.minBalance = row.min_balance;
    if (row.responsible_person) acc.responsiblePerson = row.responsible_person;
    acc.forecasts[row.forecast_date] = {
      forecast: row.forecast_amount,
      actual: row.actual_amount,
    };
  }

  const dates = [...new Set(rows.map(r => r.forecast_date))].sort();
  const accounts = Array.from(accountMap.values());

  const latestDate = dates[dates.length - 1];
  let belowMinimum = 0, nearMinimum = 0, totalForecast = 0;
  for (const acc of accounts) {
    const latest = acc.forecasts[latestDate];
    if (latest && latest.forecast != null) {
      totalForecast += latest.forecast;
      if (acc.minBalance != null) {
        if (latest.forecast < acc.minBalance) belowMinimum++;
        else if (latest.forecast < acc.minBalance * 1.2) nearMinimum++;
      }
    }
  }

  const result = { success: true, data: { accounts, dates, summary: { belowMinimum, nearMinimum, totalForecast } } };
  writeFileSync(resolve(OUT_DIR, 'forecast.json'), JSON.stringify(result));
  console.log(`  forecast.json: ${accounts.length} accounts, ${dates.length} dates`);
  db.close();
}

// ── Cashflow ──
function exportCashflow() {
  const db = new Database(resolve(ROOT, 'forecast.db'));
  db.pragma('journal_mode = WAL');
  const daysBack = 728;
  const daysForward = 728;

  const rows = db.prepare(
    `SELECT line_item, category, line_type, flow_date, amount, frequency, responsible_person
     FROM corp_cashflow_items
     WHERE flow_date >= date((SELECT MAX(flow_date) FROM corp_cashflow_items), '-' || ? || ' days')
       AND flow_date <= date((SELECT MAX(flow_date) FROM corp_cashflow_items), '+' || ? || ' days')
     ORDER BY category, line_item, flow_date`
  ).all(daysBack.toString(), daysForward.toString());

  const itemMap = new Map();
  const dates = new Set();

  for (const row of rows) {
    dates.add(row.flow_date);
    const key = `${row.category}::${row.line_item}::${row.line_type}`;
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        lineItem: row.line_item, category: row.category, lineType: row.line_type,
        frequency: row.frequency, responsiblePerson: row.responsible_person,
        values: {},
      });
    }
    itemMap.get(key).values[row.flow_date] = row.amount;
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
      date: d, additionsForecast: addFcst, subtractionsForecast: Math.abs(subFcst),
      netForecast: addFcst + subFcst, additionsActual: addActual,
      subtractionsActual: Math.abs(subActual), netActual: addActual + subActual,
    };
  });

  const endingTrend = sortedDates.map(d => {
    const forecast = ending.find(i => i.lineItem === 'Ending Cash' && i.lineType === 'forecast')?.values[d] ?? null;
    const actual = ending.find(i => i.lineItem === 'Ending Cash' && i.lineType === 'actual')?.values[d] ?? null;
    const variance = ending.find(i => i.lineItem === 'Ending Cash' && i.lineType === 'variance')?.values[d] ?? null;
    const target = ending.find(i => i.lineItem === 'TARGET' && i.lineType === 'forecast')?.values[d] ?? null;
    return { date: d, forecast, actual, variance, target };
  });

  const monthlyMap = new Map();
  for (const d of sortedDates) {
    const month = d.substring(0, 7);
    if (!monthlyMap.has(month)) monthlyMap.set(month, { additions: 0, subtractions: 0, net: 0, endingCash: null, additionsActual: 0, subtractionsActual: 0 });
    const m = monthlyMap.get(month);
    const w = waterfall.find(ww => ww.date === d);
    if (w) { m.additions += w.additionsForecast; m.subtractions += w.subtractionsForecast; m.net += w.netForecast; m.additionsActual += w.additionsActual; m.subtractionsActual += w.subtractionsActual; }
    const ec = endingTrend.find(e => e.date === d);
    if (ec && ec.forecast != null) m.endingCash = ec.forecast;
  }
  const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));

  const today = new Date().toISOString().split('T')[0];

  const categoryComparison = [...additions, ...subtractions]
    .map(item => {
      const fcstItem = allItems.find(i => i.category === item.category && i.lineItem === item.lineItem && i.lineType === 'forecast');
      const actItem = allItems.find(i => i.category === item.category && i.lineItem === item.lineItem && i.lineType === 'actual');
      if (!fcstItem && !actItem) return null;
      if (item.lineType !== 'forecast') return null;
      const fcstTotal = fcstItem ? Object.values(fcstItem.values).reduce((s, v) => s + v, 0) : 0;
      const actTotal = actItem ? Object.values(actItem.values).reduce((s, v) => s + v, 0) : 0;
      return {
        lineItem: item.lineItem, category: item.category,
        forecast: Math.abs(fcstTotal), actual: Math.abs(actTotal),
        variance: Math.abs(actTotal) - Math.abs(fcstTotal),
        hasActual: !!actItem && actTotal !== 0,
      };
    })
    .filter(Boolean)
    .filter(item => item.forecast > 0 || item.actual > 0);

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
  ).all(...keyItems);

  const tsMap = new Map();
  for (const row of fullRows) {
    if (!tsMap.has(row.line_item)) tsMap.set(row.line_item, { category: row.category, forecast: {}, actual: {} });
    const entry = tsMap.get(row.line_item);
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

  const result = { success: true, data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison, categoryTimeSeries } };
  writeFileSync(resolve(OUT_DIR, 'cashflow.json'), JSON.stringify(result));
  console.log(`  cashflow.json: ${sortedDates.length} dates, ${categoryTimeSeries.length} time series`);
  db.close();
}

// ── Pigment ──
function exportPigment() {
  try {
    const raw = readFileSync(resolve(ROOT, 'pigment-data.json'), 'utf-8');
    const data = JSON.parse(raw);

    let gsheet = null;
    try { gsheet = JSON.parse(readFileSync(resolve(ROOT, 'gsheet-cashflow.json'), 'utf-8')); } catch {}

    const MONTH_ORDER = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    function shortMonth(pigmentMonth) { return pigmentMonth.split(' ')[0]; }

    const revenueChart = MONTH_ORDER.map((m, i) => {
      const fy25 = data.revenue.fy25[i]; const fy26 = data.revenue.fy26[i];
      return { month: m, fy25: fy25?.value ?? null, fy26: fy26?.value ?? null };
    });

    const arrChart = [...data.arr.fy25, ...data.arr.fy26].map(d => ({
      month: shortMonth(d.month), year: d.month.split(' ')[1], label: d.month, value: d.value,
    }));

    const ocfChart = MONTH_ORDER.map((m, i) => {
      const fy25 = data.operatingCashFlow.fy25[i]; const fy26 = data.operatingCashFlow.fy26[i];
      return { month: m, fy25: fy25?.value ?? null, fy26: fy26?.value ?? null };
    });

    const fy26Rev = data.revenue.fy26.reduce((s, d) => s + d.value, 0);
    const fy25Rev = data.revenue.fy25.reduce((s, d) => s + d.value, 0);
    const latestARR = data.arr.fy26[data.arr.fy26.length - 1]?.value ?? 0;
    const prevARR = data.arr.fy25[data.arr.fy25.length - 1]?.value ?? 0;
    const fy26OCF = data.operatingCashFlow.fy26.reduce((s, d) => s + d.value, 0);
    const fy25OCF = data.operatingCashFlow.fy25.reduce((s, d) => s + d.value, 0);

    let comparison = [];
    if (gsheet?.weeks) {
      const monthlyGsheet = new Map();
      for (const w of gsheet.weeks) {
        const d = new Date(w.date + 'T12:00:00');
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyGsheet.has(ym)) monthlyGsheet.set(ym, { netFcst: 0, netActual: 0, addFcst: 0, subFcst: 0, endFcst: null, endActual: null, hasActual: false });
        const m = monthlyGsheet.get(ym);
        m.addFcst += w.addFcst ?? 0; m.subFcst += w.subFcst ?? 0;
        m.netFcst += (w.addFcst ?? 0) + (w.subFcst ?? 0);
        if (w.endActual != null) { m.netActual += (w.addFcst ?? 0) + (w.subFcst ?? 0); m.hasActual = true; }
        if (w.endFcst != null && w.endFcst !== 0) m.endFcst = w.endFcst;
        if (w.endActual != null && w.endActual !== 0) m.endActual = w.endActual;
      }

      const pigmentOCF = new Map();
      const monthNameToNum = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
      for (const fy of ['fy25', 'fy26']) {
        for (const pt of data.operatingCashFlow[fy]) {
          const [mName, yr] = pt.month.split(' ');
          const fullYear = yr.length === 2 ? `20${yr}` : yr;
          pigmentOCF.set(`${fullYear}-${monthNameToNum[mName]}`, pt.value);
        }
      }

      const pigmentRev = new Map();
      for (const fy of ['fy25', 'fy26']) {
        for (const pt of data.revenue[fy]) {
          const [mName, yr] = pt.month.split(' ');
          const fullYear = yr.length === 2 ? `20${yr}` : yr;
          pigmentRev.set(`${fullYear}-${monthNameToNum[mName]}`, pt.value);
        }
      }

      const allMonths = Array.from(monthlyGsheet.keys()).sort();
      comparison = allMonths.map(ym => {
        const gs = monthlyGsheet.get(ym);
        const [y, m] = ym.split('-');
        const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = `${MONTHS[parseInt(m)]} ${y.slice(2)}`;
        return {
          month: ym, label,
          gsheetNetCashFlow: gs.netFcst, gsheetAdditions: gs.addFcst, gsheetSubtractions: gs.subFcst,
          gsheetEndingCash: gs.endFcst, gsheetEndingActual: gs.endActual,
          pigmentOCF: pigmentOCF.get(ym) ?? null, pigmentRevenue: pigmentRev.get(ym) ?? null,
          hasActuals: gs.hasActual,
        };
      });
    }

    const result = {
      success: true,
      data: {
        lastSynced: data.lastSynced, scenario: data.scenario,
        summary: {
          fy26Revenue: fy26Rev, fy25Revenue: fy25Rev, revenueGrowth: (fy26Rev - fy25Rev) / fy25Rev,
          latestARR, arrGrowth: (latestARR - prevARR) / prevARR,
          fy26OCF, fy25OCF, ocfGrowth: fy25OCF !== 0 ? (fy26OCF - fy25OCF) / Math.abs(fy25OCF) : 0,
        },
        revenueChart, arrChart, ocfChart, comparison,
      },
    };
    writeFileSync(resolve(OUT_DIR, 'pigment.json'), JSON.stringify(result));
    console.log(`  pigment.json: ${comparison.length} comparison months`);
  } catch (e) {
    writeFileSync(resolve(OUT_DIR, 'pigment.json'), JSON.stringify({ success: false, error: e.message }));
    console.log(`  pigment.json: error - ${e.message}`);
  }
}

console.log('Exporting static data...');
exportForecast();
exportCashflow();
exportPigment();
console.log('Done! Files written to public/data/');
