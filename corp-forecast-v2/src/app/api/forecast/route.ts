import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export function GET(req: NextRequest) {
  const weeksBack = parseInt(req.nextUrl.searchParams.get('weeks_back') || '4');
  const daysBack = weeksBack * 7;

  const db = getDb();
  const rows = db.prepare(
    `SELECT account_name, forecast_date, forecast_amount, actual_amount, min_balance, responsible_person
     FROM corp_forecast_snapshots
     WHERE forecast_date >= date((SELECT MAX(forecast_date) FROM corp_forecast_snapshots), '-' || ? || ' days')
       AND account_name NOT LIKE '%Morgan Stanley%'
       AND account_name NOT LIKE '%(MS)%'
     ORDER BY account_name, forecast_date`
  ).all(daysBack.toString()) as any[];

  const accountMap = new Map<string, any>();
  for (const row of rows) {
    if (!accountMap.has(row.account_name)) {
      accountMap.set(row.account_name, {
        accountName: row.account_name,
        minBalance: row.min_balance,
        responsiblePerson: row.responsible_person,
        forecasts: {},
      });
    }
    const acc = accountMap.get(row.account_name)!;
    if (row.min_balance != null) acc.minBalance = row.min_balance;
    if (row.responsible_person) acc.responsiblePerson = row.responsible_person;
    acc.forecasts[row.forecast_date] = {
      forecast: row.forecast_amount,
      actual: row.actual_amount,
    };
  }

  const dates = [...new Set(rows.map((r: any) => r.forecast_date))].sort();
  const accounts = Array.from(accountMap.values());

  const latestDate = dates[dates.length - 1];
  let belowMinimum = 0;
  let nearMinimum = 0;
  let totalForecast = 0;
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

  return NextResponse.json({
    success: true,
    data: { accounts, dates, summary: { belowMinimum, nearMinimum, totalForecast } },
  });
}
