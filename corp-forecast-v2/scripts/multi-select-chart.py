"""Replace single-select dropdown with multi-select toggle buttons and net result chart."""
import pathlib

page = pathlib.Path('src/app/page.tsx')
content = page.read_text()

# 1. Replace state: single selectedCategory -> Set of selectedCategories
content = content.replace(
    "const [selectedCategory, setSelectedCategory] = useState<string | null>(null);",
    "const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());\n\n"
    "  const toggleCategory = (name: string) => {\n"
    "    setSelectedCategories(prev => {\n"
    "      const next = new Set(prev);\n"
    "      if (next.has(name)) next.delete(name);\n"
    "      else next.add(name);\n"
    "      return next;\n"
    "    });\n"
    "  };\n\n"
    "  const selectAll = () => {\n"
    "    const all = (cashflowData?.data?.categoryTimeSeries || []).map((c: any) => c.lineItem);\n"
    "    setSelectedCategories(new Set(all));\n"
    "  };\n\n"
    "  const clearAll = () => setSelectedCategories(new Set());"
)

# 2. Replace the old memos
old_memos = """  const categoryTimeSeries: any[] = cashflowData?.data?.categoryTimeSeries || [];
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
  }, [selectedSeries]);"""

new_memos = """  const categoryTimeSeries: any[] = cashflowData?.data?.categoryTimeSeries || [];

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
  }, [categoryTimeSeries, selectedCategories]);"""

content = content.replace(old_memos, new_memos)

# 3. Replace the entire chart section (from Row 3 comment to Cash Flow Section comment)
old_chart_start = "          {/* Row 3: Revenue & Expense Time Series */}"
old_chart_end = "          {/* Cash Flow Section */}"

start_idx = content.index(old_chart_start)
end_idx = content.index(old_chart_end)
old_block = content[start_idx:end_idx]

# Category button colors for visual distinction
new_block = """          {/* Row 3: Revenue & Expense Time Series */}
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
                    {isRevenue ? '+' : '\\u2212'} {c.lineItem}
                  </button>
                );
              })}
            </div>
            {netTimeSeriesData.length > 0 ? (
              <>
                <div className="text-xs text-[#5a6f8f] mb-2">
                  {selectedCategories.size} categor{selectedCategories.size === 1 ? 'y' : 'ies'} selected
                  {selectedCategories.size > 1 && ' — showing net result'}
                </div>
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={netTimeSeriesData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="date" tick={axisTickSm} stroke={COLORS.grid} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisTick} width={80} stroke={COLORS.grid} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend />
                    <Bar dataKey="forecast" name="Net Forecast" fill={COLORS.cyan} fillOpacity={0.35} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="actual" name="Net Actual" stroke={COLORS.green} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.green }} connectNulls />
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

"""

content = content[:start_idx] + new_block + content[end_idx:]

page.write_text(content)
print('page.tsx updated')
print('Has selectedCategories:', 'selectedCategories' in content)
print('Has toggleCategory:', 'toggleCategory' in content)
print('Has netTimeSeriesData:', 'netTimeSeriesData' in content)
print('selectedCategory removed:', 'selectedCategory' not in content)
