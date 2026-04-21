"""Apply dark theme and category chart to page.tsx"""
import pathlib

page = pathlib.Path('src/app/page.tsx')
content = page.read_text()

# 1. Replace COLORS
content = content.replace(
    "const COLORS = {\n  green: '#107848',\n  yellow: '#d97706',\n  red: '#dc2626',\n  blue: '#2563eb',\n  gray: '#6b7280',\n};",
    "const COLORS = {\n  green: '#10b981',\n  yellow: '#f59e0b',\n  red: '#ef4444',\n  blue: '#3b82f6',\n  cyan: '#22d3ee',\n  purple: '#a78bfa',\n  gray: '#5a6f8f',\n  grid: '#1e3054',\n};\n\nconst axisTick = { fontSize: 11, fill: '#5a6f8f' };\nconst axisTickSm = { fontSize: 12, fill: '#5a6f8f' };"
)

# 2. Replace accountComparison with categoryComparison
old_ac = """const accountComparison = useMemo(() => {
    if (dates.length === 0) return [];
    const latestDate = dates[dates.length - 1];
    return accounts
      .filter((acc: any) => acc.minBalance != null)
      .map((acc: any) => {
        const forecast = acc.forecasts[latestDate]?.forecast ?? 0;
        const min = acc.minBalance ?? 0;
        const shortName = acc.accountName.length > 25 ? acc.accountName.slice(0, 22) + '...' : acc.accountName;
        return {
          name: shortName, fullName: acc.accountName, forecast, minBalance: min,
          status: forecast < min ? 'below' : forecast < min * 1.2 ? 'near' : 'healthy',
        };
      })
      .sort((a: any, b: any) => (a.forecast / a.minBalance) - (b.forecast / b.minBalance));
  }, [accounts, dates]);"""

new_cc = """const categoryComparison: any[] = useMemo(() => {
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
  }, [cashflowData]);"""

content = content.replace(old_ac, new_cc)

# 3. Fix healthCounts
content = content.replace(
    "accountComparison.forEach((a: any) => {\n      if (a.status === 'below') below++;\n      else if (a.status === 'near') near++;\n      else healthy++;\n    });\n    return { below, near, healthy, total: below + near + healthy };\n  }, [accountComparison]);",
    """if (dates.length === 0) return { below: 0, near: 0, healthy: 0, total: 0 };
    const latestDate = dates[dates.length - 1];
    accounts.filter((a: any) => a.minBalance != null).forEach((acc: any) => {
      const forecast = acc.forecasts[latestDate]?.forecast ?? 0;
      if (forecast < acc.minBalance) below++;
      else if (forecast < acc.minBalance * 1.2) near++;
      else healthy++;
    });
    return { below, near, healthy, total: below + near + healthy };
  }, [accounts, dates]);"""
)

# 4. Remove getBarColor, replace BarTooltip with CategoryTooltip
content = content.replace("function getBarColor(status: string): string {\n    if (status === 'below') return COLORS.red;\n    if (status === 'near') return COLORS.yellow;\n    return COLORS.green;\n  }\n\n  const CustomTooltip", "const DarkTooltip")

content = content.replace(
    """const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm max-w-xs">
        <p className="font-medium text-gray-900 mb-1">{d?.fullName || d?.name}</p>
        <p style={{ color: COLORS.blue }}>Forecast: {formatCurrency(d?.forecast)}</p>
        <p style={{ color: COLORS.gray }}>Min Balance: {formatCurrency(d?.minBalance)}</p>
      </div>
    );
  };""",
    """const CategoryTooltip = ({ active, payload }: any) => {
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
  };"""
)

# 5. Dark tooltips
content = content.replace('bg-white border rounded-lg shadow-lg', 'bg-[#162038] border border-[#1e3054] rounded-lg shadow-xl')
content = content.replace('text-gray-900 mb-1', 'text-[#e8ecf4] mb-1')

# 6. Replace CustomTooltip references
content = content.replace('content={<CustomTooltip />}', 'content={<DarkTooltip />}')

# 7. Chart grid
content = content.replace('stroke="#f0f0f0"', 'stroke={COLORS.grid}')

# 8. Card backgrounds
content = content.replace('bg-white rounded-lg shadow-sm border p-6', 'bg-[#162038] border border-[#1e3054] rounded-xl p-6')
content = content.replace('bg-white rounded-lg shadow-sm border p-4', 'bg-[#162038] border border-[#1e3054] rounded-xl p-4')
content = content.replace('bg-white rounded-lg shadow-sm border p-12', 'bg-[#162038] border border-[#1e3054] rounded-xl p-12')
content = content.replace('bg-white rounded-lg shadow-sm border overflow-x-auto', 'bg-[#162038] border border-[#1e3054] rounded-xl overflow-x-auto')

# 9. Text colors
replacements = [
    ('text-gray-900">', 'text-[#e8ecf4]">'),
    ('text-gray-700">', 'text-[#8a9bb8]">'),
    ('text-gray-600">', 'text-[#5a6f8f]">'),
    ('text-gray-500">', 'text-[#5a6f8f]">'),
    ('text-gray-500 mt-1', 'text-[#5a6f8f] mt-1'),
    ('text-gray-500 mt-2', 'text-[#5a6f8f] mt-2'),
    ('text-gray-400 mt-2', 'text-[#5a6f8f] mt-2'),
    ('text-2xl font-bold text-gray-900', 'text-2xl font-bold text-[#e8ecf4]'),
    ('text-xl font-bold text-gray-900', 'text-xl font-bold text-[#e8ecf4]'),
    ('text-xs text-gray-500', 'text-xs text-[#5a6f8f]'),
    ('font-mono text-gray-600', 'font-mono text-[#8a9bb8]'),
    ('font-mono font-bold text-gray-900', 'font-mono font-bold text-[#e8ecf4]'),
    ('font-medium text-gray-900', 'font-medium text-[#e8ecf4]'),
    ("text-red-600'>", "text-[#ef4444]'>"),
    ("text-green-600'>", "text-[#10b981]'>"),
    ('text-red-600">', 'text-[#ef4444]">'),
    ('text-green-600">', 'text-[#10b981]">'),
    ('text-yellow-600">', 'text-[#f59e0b]">'),
    ('text-green-700">', 'text-[#10b981]">'),
    ('text-red-700">', 'text-[#ef4444]">'),
    ("text-green-700'", "text-[#10b981]'"),
    ("text-red-700'", "text-[#ef4444]'"),
]
for old, new in replacements:
    content = content.replace(old, new)

# 10. Background/control colors
content = content.replace("bg-white p-4 rounded-lg shadow-sm border", "bg-[#162038] border border-[#1e3054] p-4 rounded-xl")
content = content.replace("bg-[#1E6B3C]", "bg-[#3b82f6]")
content = content.replace("bg-[#165C32]", "bg-[#2563eb]")
content = content.replace("hover:bg-gray-100", "hover:bg-[#1a2744]")
content = content.replace("hover:bg-gray-200", "hover:bg-[#1a2744]")
content = content.replace("hover:bg-gray-50", "hover:bg-[rgba(59,130,246,0.06)]")
content = content.replace("border-gray-200", "border-[#1e3054]")
content = content.replace("bg-gray-50 border-b", "bg-[#111b2e] border-b border-[#1e3054]")
content = content.replace("bg-gray-100 text-gray-600", "bg-[#111b2e] text-[#5a6f8f] border border-[#1e3054]")
content = content.replace("sticky left-0 bg-gray-50", "sticky left-0 bg-[#111b2e]")
content = content.replace("sticky left-0 bg-white", "sticky left-0 bg-[#162038]")
content = content.replace("bg-blue-50", "bg-[rgba(59,130,246,0.08)]")
content = content.replace("bg-red-100 text-red-700", "bg-[rgba(239,68,68,0.15)] text-[#ef4444]")
content = content.replace("bg-blue-100 text-blue-700", "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]")

# 11. Chart colors
content = content.replace('stroke={COLORS.blue}', 'stroke={COLORS.cyan}')
content = content.replace('fill="#16a34a"', 'fill={COLORS.green}')
content = content.replace('fill="#dc2626"', 'fill={COLORS.red}')
content = content.replace('stroke="#9ca3af"', 'stroke="#5a6f8f"')

# 12. Table cell colors for dark theme
content = content.replace("bg-red-100 text-red-800", "bg-red-500/15 text-red-400")
content = content.replace("bg-yellow-100 text-yellow-800", "bg-amber-500/15 text-amber-400")
content = content.replace("bg-green-50 text-green-800", "bg-emerald-500/10 text-emerald-400")

# 13. Replace the bar chart section
old_chart = """          {/* Row 2: Account bar chart */}
          <div className="bg-[#162038] border border-[#1e3054] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#8a9bb8] mb-4">Latest Forecast vs Minimum Balance by Account</h3>"""
if old_chart in content:
    # Find and replace the entire chart block
    idx = content.index(old_chart)
    end_marker = "          </div>\n\n          {/* Cash Flow"
    end_idx = content.index(end_marker, idx)
    old_block = content[idx:end_idx]
    new_block = """          {/* Row 2: Forecast vs Actuals by Category */}
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
"""
    content = content[:idx] + new_block + content[end_idx:]

page.write_text(content)
print('page.tsx updated successfully')
print('Has dark theme:', '#162038' in content)
print('Has categoryComparison:', 'categoryComparison' in content)
print('accountComparison removed:', 'accountComparison' not in content)
