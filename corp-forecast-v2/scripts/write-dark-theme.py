"""Write the dark-themed page.tsx and updated cashflow route."""
import pathlib, textwrap

# Cashflow API route with categoryComparison
pathlib.Path('src/app/api/cashflow/route.ts').write_text(open('src/app/api/cashflow/route.ts').read().replace(
    """  return NextResponse.json({
    success: true,
    data: { dates: sortedDates, today, waterfall, endingTrend, monthly },
  });""",
    """  const categoryComparison = [...additions, ...subtractions]
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

  return NextResponse.json({
    success: true,
    data: { dates: sortedDates, today, waterfall, endingTrend, monthly, categoryComparison },
  });"""
))
print('cashflow route.ts updated')
