"""Add categoryTimeSeries to cashflow API and a new time-series chart to page.tsx."""
import pathlib

# ── 1. Update cashflow API ──
api = pathlib.Path('src/app/api/cashflow/route.ts')
api_content = api.read_text()

# Add categoryTimeSeries before the return statement
old_return = """  return NextResponse.json({
    success: true,
    data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison },
  });"""

new_return = """  // Build per-category time series (forecast + actual over time)
  const keyItems = ['Revenue inflow', 'Payroll', 'Estimated A/P run', 'Fidelity/401k/Collective Health',
    'Canada Payroll/AP CAD', 'Mexico Payroll/Tax MXN', 'Turkiye Payroll/Tax TRY',
    'Employee HI / benefits', 'Business tax', 'Partner Rev Share (ACH)',
    'Loan interest', 'Cashout funding', 'Wires (eg. GiftBJt funding)'];

  const categoryTimeSeries = keyItems
    .map(name => {
      const fcst = allItems.find(i => (i.category === 'addition' || i.category === 'subtraction') && i.lineItem === name && i.lineType === 'forecast');
      const act = allItems.find(i => (i.category === 'addition' || i.category === 'subtraction') && i.lineItem === name && i.lineType === 'actual');
      if (!fcst && !act) return null;
      const allDates = new Set([
        ...Object.keys(fcst?.values || {}),
        ...Object.keys(act?.values || {}),
      ]);
      const series = Array.from(allDates).sort().map(d => ({
        date: d,
        forecast: fcst?.values[d] != null ? Math.abs(fcst.values[d]) : null,
        actual: act?.values[d] != null ? Math.abs(act.values[d]) : null,
      }));
      return {
        lineItem: name,
        category: fcst?.category || act?.category,
        series,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    success: true,
    data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison, categoryTimeSeries },
  });"""

api_content = api_content.replace(old_return, new_return)
api.write_text(api_content)
print('cashflow route.ts updated')

# ── 2. Update page.tsx ──
page = pathlib.Path('src/app/page.tsx')
content = page.read_text()

# Add state for selected category and the time series memo after categoryComparison
old_category = """const categoryComparison: any[] = useMemo(() => {"""
new_category = """const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryComparison: any[] = useMemo(() => {"""
content = content.replace(old_category, new_category)

# Add the time series data memo after categoryComparison
old_health = """  const healthCounts = useMemo"""
new_health = """  const categoryTimeSeries: any[] = cashflowData?.data?.categoryTimeSeries || [];
  const selectedSeries = useMemo(() => {
    if (!selectedCategory) return null;
    return categoryTimeSeries.find((c: any) => c.lineItem === selectedCategory) || null;
  }, [categoryTimeSeries, selectedCategory]);

  const timeSeriesChartData = useMemo(() => {
    if (!selectedSeries) return [];
    return selectedSeries.series.map((s: any) => {
      const d = new Date(s.date + 'T12:00:00');
      return { date: `${d.getMonth() + 1}/${d.getDate()}`, fullDate: s.date, forecast: s.forecast, actual: s.actual };
    });
  }, [selectedSeries]);

  const healthCounts = useMemo"""
content = content.replace(old_health, new_health)

# Add the time series chart after the category bar chart
# Find the end of the category chart section
old_cashflow = """          {/* Cash Flow Section */}"""

new_chart = """          {/* Row 3: Revenue & Expense Time Series */}
          <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#e8ecf4] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22d3ee]"></span>
                Revenue & Expense — Historical & Projections
              </h3>
              <select
                value={selectedCategory || ''}
                onChange={e => setSelectedCategory(e.target.value || null)}
                className="bg-[#111b2e] border border-[#1e3054] text-[#e8ecf4] rounded-lg px-3 py-1.5 text-sm focus:border-[#3b82f6] focus:outline-none min-w-[220px]"
              >
                <option value="">Select a category...</option>
                {categoryTimeSeries.map((c: any) => (
                  <option key={c.lineItem} value={c.lineItem}>
                    {c.category === 'addition' ? '+ ' : '- '}{c.lineItem}
                  </option>
                ))}
              </select>
            </div>
            {selectedSeries ? (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={timeSeriesChartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="date" tick={axisTickSm} stroke={COLORS.grid} />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend />
                  <Bar dataKey="forecast" name="Forecast" fill={COLORS.cyan} fillOpacity={0.4} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke={COLORS.green} strokeWidth={2} dot={{ r: 3, fill: COLORS.green }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-[#5a6f8f] text-sm">
                Select a revenue or expense category above to view its historical trend and future projections
              </div>
            )}
          </div>

          {/* Cash Flow Section */}"""

content = content.replace(old_cashflow, new_chart)

page.write_text(content)
print('page.tsx updated')
print('Has selectedCategory:', 'selectedCategory' in content)
print('Has categoryTimeSeries:', 'categoryTimeSeries' in content)
print('Has ComposedChart for timeseries:', 'Revenue & Expense' in content)
