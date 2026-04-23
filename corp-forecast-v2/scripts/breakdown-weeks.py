"""
Change breakdown API to return 5 weeks of data, add week selector buttons to page.
"""
import pathlib

# ── 1. API: return 5 weeks instead of 1 ──
api = pathlib.Path('src/app/api/cashflow/route.ts')
ac = api.read_text()

old_api = """  // Build latest-week breakdown: pick the most recent date with broadest item coverage
  const bestDate = db.prepare(
    `SELECT flow_date as d, COUNT(DISTINCT line_item) as items
     FROM corp_cashflow_items
     WHERE line_type = 'forecast' AND category IN ('addition', 'subtraction')
     GROUP BY flow_date HAVING items >= 10
     ORDER BY flow_date DESC LIMIT 1`
  ).get() as any;
  const breakdownDate = bestDate?.d || db.prepare(
    `SELECT MAX(flow_date) as d FROM corp_cashflow_items WHERE line_type = 'forecast' AND category IN ('addition', 'subtraction')`
  ).get()?.d;
  const breakdownRows = breakdownDate ? db.prepare(
    `SELECT line_item, category, line_type, flow_date, amount
     FROM corp_cashflow_items
     WHERE category IN ('addition', 'subtraction', 'addition_total', 'subtraction_total', 'ending')
       AND flow_date = ?
     ORDER BY category, line_item`
  ).all(breakdownDate) as any[] : [];

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
  }"""

new_api = """  // Build breakdown for 5 most recent weeks with broad coverage
  const topDates = db.prepare(
    `SELECT flow_date as d, COUNT(DISTINCT line_item) as items
     FROM corp_cashflow_items
     WHERE line_type = 'forecast' AND category IN ('addition', 'subtraction')
     GROUP BY flow_date HAVING items >= 5
     ORDER BY flow_date DESC LIMIT 5`
  ).all() as any[];
  const breakdownDates = topDates.map((r: any) => r.d).reverse();

  const breakdownByWeek: Record<string, any[]> = {};
  const breakdownOrder = [
    ...additionOrder.map(n => `addition::${n}`),
    'addition_total::Subtotal',
    ...subtractionOrder.map(n => `subtraction::${n}`),
    'subtraction_total::Subtotal',
    'ending::Ending Cash',
  ];

  for (const date of breakdownDates) {
    const rows2 = db.prepare(
      `SELECT line_item, category, line_type, flow_date, amount
       FROM corp_cashflow_items
       WHERE category IN ('addition', 'subtraction', 'addition_total', 'subtraction_total', 'ending')
         AND flow_date = ?
       ORDER BY category, line_item`
    ).all(date) as any[];

    const bdMap = new Map<string, any>();
    for (const row of rows2) {
      const key = `${row.category}::${row.line_item}`;
      if (!bdMap.has(key)) {
        bdMap.set(key, { lineItem: row.line_item, category: row.category, date: row.flow_date, forecast: null, actual: null, variance: null });
      }
      const e = bdMap.get(key)!;
      if (row.line_type === 'forecast') e.forecast = row.amount;
      else if (row.line_type === 'actual') e.actual = row.amount;
      else if (row.line_type === 'variance') e.variance = row.amount;
    }

    const ordered: any[] = [];
    for (const key of breakdownOrder) {
      const entry = bdMap.get(key);
      if (entry) ordered.push(entry);
    }
    breakdownByWeek[date] = ordered;
  }"""

ac = ac.replace(old_api, new_api)

# Update the return to include breakdownByWeek and breakdownDates instead of breakdown
ac = ac.replace(
    "data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison, categoryTimeSeries, breakdown },",
    "data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison, categoryTimeSeries, breakdownByWeek, breakdownDates },",
)

api.write_text(ac)
print('API updated')

# ── 2. Page: add week selector buttons ──
page = pathlib.Path('src/app/page.tsx')
pc = page.read_text()

# Add breakdownWeek state near the top (after selectedCategories state)
pc = pc.replace(
    "const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());",
    "const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());\n  const [breakdownWeek, setBreakdownWeek] = useState(0);",
)

# Replace the entire breakdown table section
old_table_start = "          {/* Row 4: Cash Flow Breakdown Table */}"
old_table_end = "          {/* Cash Flow Section */}"

start_idx = pc.index(old_table_start)
end_idx = pc.index(old_table_end)

new_table = """          {/* Row 4: Cash Flow Breakdown Table */}
          {(() => {
            const breakdownDates: string[] = cashflowData?.data?.breakdownDates || [];
            const breakdownByWeek: Record<string, any[]> = cashflowData?.data?.breakdownByWeek || {};
            if (breakdownDates.length === 0) return null;
            const weekIdx = Math.min(breakdownWeek, breakdownDates.length - 1);
            const activeDate = breakdownDates[breakdownDates.length - 1 - weekIdx];
            const breakdown: any[] = breakdownByWeek[activeDate] || [];
            if (breakdown.length === 0) return null;
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
            const weekLabel = (d: string) => { const dt = new Date(d + 'T12:00:00'); return `${dt.getMonth()+1}/${dt.getDate()}`; };
            return (
              <div className="bg-[#162038] border border-[#1e3054] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1e3054] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#e8ecf4] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                    Cash Flow Breakdown
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {breakdownDates.slice().reverse().map((d: string, i: number) => (
                        <button key={d} onClick={() => setBreakdownWeek(i)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            weekIdx === i
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40'
                              : 'bg-[#111b2e] text-[#5a6f8f] border-[#1e3054] hover:text-[#8a9bb8] hover:border-[#f59e0b]/30'
                          }`}>
                          {i === 0 ? '1W' : `${i+1}W`}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-[#5a6f8f]">Week of {weekLabel(activeDate)}</span>
                  </div>
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

"""

pc = pc[:start_idx] + new_table + pc[end_idx:]

page.write_text(pc)
print('Page updated')
print('Has breakdownWeek:', 'breakdownWeek' in pc)
print('Has breakdownDates:', 'breakdownDates' in pc)
print('Has 1W button:', "'1W'" in pc)
