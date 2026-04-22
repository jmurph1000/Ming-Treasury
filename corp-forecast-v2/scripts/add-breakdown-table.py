"""
1. Expand keyItems to all 24 line items and remove the WHERE filter
2. Add a cashflowBreakdown endpoint (latest week forecast/actual/variance per item)
3. Add a breakdown table to the page between the time series chart and cash flow section
"""
import pathlib

# ── 1. Update API: fetch ALL addition/subtraction items for time series ──
api = pathlib.Path('src/app/api/cashflow/route.ts')
ac = api.read_text()

# Replace the keyItems + filtered query with a query that gets everything
old_api = """  // Build per-category time series using FULL date range (not limited by weeks_back)
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
  });"""

new_api = """  // Build per-category time series using FULL date range
  const fullRows = db.prepare(
    `SELECT line_item, category, line_type, flow_date, amount
     FROM corp_cashflow_items
     WHERE category IN ('addition', 'subtraction')
       AND line_type IN ('forecast', 'actual')
     ORDER BY line_item, flow_date`
  ).all() as any[];

  const tsMap = new Map<string, { category: string; forecast: Record<string, number>; actual: Record<string, number> }>();
  for (const row of fullRows) {
    if (!tsMap.has(row.line_item)) tsMap.set(row.line_item, { category: row.category, forecast: {}, actual: {} });
    const entry = tsMap.get(row.line_item)!;
    if (row.line_type === 'forecast') entry.forecast[row.flow_date] = row.amount;
    else entry.actual[row.flow_date] = row.amount;
  }

  // Ordered: additions first, then subtractions (matching spreadsheet layout)
  const additionOrder = ['Revenue inflow', 'Customer cash: interest deposits', 'Other (>$5k)',
    'Symmetry (Excess cash)', 'Transfer from Morgan Stanley'];
  const subtractionOrder = ['Payroll', 'Canada Payroll/AP CAD', 'Mexico Payroll/Tax MXN',
    'Turkiye Payroll/Tax TRY', 'Fidelity/401k/Collective Health', 'Estimated A/P run',
    'Airbase, Emburse, expense reports', 'AMEX payments', 'Checks',
    'Wires (eg. GiftBJt funding)', 'Promotion payouts (ACH)', 'Partner Rev Share (ACH)',
    'Employee HI / benefits', 'Business tax', 'Customer cash: loss transfers',
    'Cashout funding', 'Loan interest', 'Other (>$5k)', 'Transfer TO Morgan Stanley'];
  const allOrderedItems = [...additionOrder, ...subtractionOrder];

  const categoryTimeSeries = allOrderedItems
    .map(name => {
      const entry = tsMap.get(name);
      if (!entry) return null;
      const allDts = new Set([...Object.keys(entry.forecast), ...Object.keys(entry.actual)]);
      const series = Array.from(allDts).sort().map(d => ({
        date: d,
        forecast: entry.forecast[d] != null ? Math.abs(entry.forecast[d]) : null,
        actual: entry.actual[d] != null ? Math.abs(entry.actual[d]) : null,
      }));
      return { lineItem: name, category: entry.category, series };
    })
    .filter(Boolean);

  // Build latest-week breakdown for the table
  const breakdownRows = db.prepare(
    `SELECT line_item, category, line_type, flow_date, amount
     FROM corp_cashflow_items
     WHERE category IN ('addition', 'subtraction', 'addition_total', 'subtraction_total', 'ending')
       AND flow_date = (SELECT MAX(flow_date) FROM corp_cashflow_items WHERE line_type = 'forecast' AND category = 'addition_total')
     ORDER BY category, line_item`
  ).all() as any[];

  const breakdown: any[] = [];
  const bdMap = new Map<string, any>();
  for (const row of breakdownRows) {
    const key = `${row.category}::${row.line_item}`;
    if (!bdMap.has(key)) {
      bdMap.set(key, { lineItem: row.line_item, category: row.category, date: row.flow_date, forecast: null, actual: null, variance: null });
    }
    const e = bdMap.get(key)!;
    if (row.line_type === 'forecast') e.forecast = row.amount;
    else if (row.line_type === 'actual') e.actual = row.amount;
    else if (row.line_type === 'variance') e.variance = row.amount;
  }

  // Order the breakdown to match the spreadsheet
  const breakdownOrder = [
    ...additionOrder.map(n => `addition::${n}`),
    'addition_total::Subtotal',
    ...subtractionOrder.map(n => `subtraction::${n}`),
    'subtraction_total::Subtotal',
    'ending::Ending Cash',
  ];
  for (const key of breakdownOrder) {
    const entry = bdMap.get(key);
    if (entry) breakdown.push(entry);
  }

  return NextResponse.json({
    success: true,
    data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison, categoryTimeSeries, breakdown },
  });"""

ac = ac.replace(old_api, new_api)
api.write_text(ac)
print('API updated')

# ── 2. Update page: add breakdown table ──
page = pathlib.Path('src/app/page.tsx')
pc = page.read_text()

# Add the table between time series chart and cash flow section
old_marker = "          {/* Cash Flow Section */}"

table_block = """          {/* Row 4: Cash Flow Breakdown Table */}
          {(cashflowData?.data?.breakdown || []).length > 0 && (() => {
            const breakdown: any[] = cashflowData.data.breakdown;
            const addItems = breakdown.filter((r: any) => r.category === 'addition');
            const addTotal = breakdown.find((r: any) => r.category === 'addition_total');
            const subItems = breakdown.filter((r: any) => r.category === 'subtraction');
            const subTotal = breakdown.find((r: any) => r.category === 'subtraction_total');
            const ending = breakdown.find((r: any) => r.category === 'ending');
            const fmtCell = (v: number | null) => v != null ? formatCurrency(Math.abs(v)) : '\\u2014';
            const varColor = (v: number | null) => {
              if (v == null || v === 0) return 'text-[#5a6f8f]';
              return v > 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
            };
            const renderRow = (r: any, indent: boolean = true) => (
              <tr key={`${r.category}-${r.lineItem}`} className="border-b border-[rgba(30,48,84,0.5)] hover:bg-[rgba(59,130,246,0.06)] transition-colors">
                <td className={`px-4 py-2 text-[#e8ecf4] ${indent ? 'pl-8' : 'font-semibold'}`}>{r.lineItem}</td>
                <td className="px-4 py-2 text-right font-mono text-[#22d3ee]">{fmtCell(r.forecast)}</td>
                <td className="px-4 py-2 text-right font-mono text-[#8a9bb8]">{fmtCell(r.actual)}</td>
                <td className={`px-4 py-2 text-right font-mono ${varColor(r.variance)}`}>{r.variance != null && r.variance !== 0 ? (r.variance > 0 ? '+' : '') + formatCurrency(r.variance) : '\\u2014'}</td>
              </tr>
            );
            const renderTotal = (r: any, label: string, accent: string) => (
              <tr key={`${r.category}-total`} className="border-b border-[#1e3054]" style={{ background: 'rgba(26,39,68,0.6)' }}>
                <td className={`px-4 py-2.5 font-bold ${accent}`}>{label}</td>
                <td className={`px-4 py-2.5 text-right font-mono font-bold ${accent}`}>{fmtCell(r.forecast)}</td>
                <td className={`px-4 py-2.5 text-right font-mono font-bold ${accent}`}>{fmtCell(r.actual)}</td>
                <td className={`px-4 py-2.5 text-right font-mono font-bold ${varColor(r.variance)}`}>{r.variance != null && r.variance !== 0 ? (r.variance > 0 ? '+' : '') + formatCurrency(r.variance) : '\\u2014'}</td>
              </tr>
            );
            return (
              <div className="bg-[#162038] border border-[#1e3054] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1e3054] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#e8ecf4] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                    Cash Flow Breakdown
                  </h3>
                  <span className="text-xs text-[#5a6f8f]">Week of {breakdown[0]?.date || ''}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e3054]" style={{ background: '#111b2e' }}>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#5a6f8f]">Line Item</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[#22d3ee]">Forecast</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[#8a9bb8]">Actual</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[#5a6f8f]">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1e3054]" style={{ background: 'rgba(16,185,129,0.06)' }}>
                      <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#10b981]">Additions</td>
                    </tr>
                    {addItems.map((r: any) => renderRow(r))}
                    {addTotal && renderTotal(addTotal, 'Total Additions', 'text-[#10b981]')}
                    <tr className="border-b border-[#1e3054]" style={{ background: 'rgba(239,68,68,0.06)' }}>
                      <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#ef4444]">Subtractions</td>
                    </tr>
                    {subItems.map((r: any) => renderRow(r))}
                    {subTotal && renderTotal(subTotal, 'Total Subtractions', 'text-[#ef4444]')}
                    {ending && (
                      <tr style={{ background: 'rgba(59,130,246,0.08)' }}>
                        <td className="px-4 py-3 font-bold text-[#e8ecf4]">{ending.lineItem}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#22d3ee]">{fmtCell(ending.forecast)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#e8ecf4]">{fmtCell(ending.actual)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${varColor(ending.variance)}`}>{ending.variance != null && ending.variance !== 0 ? (ending.variance > 0 ? '+' : '') + formatCurrency(ending.variance) : '\\u2014'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Cash Flow Section */}"""

pc = pc.replace(old_marker, table_block)

page.write_text(pc)
print('Page updated')
print('Has breakdown table:', 'Cash Flow Breakdown' in pc)
