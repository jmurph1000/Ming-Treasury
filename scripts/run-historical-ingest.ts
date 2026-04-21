/**
 * run-historical-ingest.ts
 * Comprehensive historical data ingestion from Corporate Forecast Google Sheet
 * into the local SQLite database (treasury.db).
 *
 * Data source: Google Sheet 1Byfis_uaLgWIjRmKGb6G5ROxPwRIF62TdhacOXRa890, sheet "Forecast"
 * Date columns JU:NP (100 weekly dates from 4/1/24 to 2/23/26)
 *
 * Usage: npx tsx scripts/run-historical-ingest.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

// ---------------------------------------------------------------------------
// 1. DATE HEADERS (row 2, columns JU:NP) -- 100 weekly dates
// ---------------------------------------------------------------------------
const RAW_DATES = [
  '4/1/24','4/8/24','4/15/24','4/22/24','4/29/24','5/6/24','5/13/24','5/20/24','5/28/24','6/3/24',
  '6/10/24','6/17/24','6/24/24','7/1/24','7/8/24','7/15/24','7/22/24','7/29/24','8/5/24','8/12/24',
  '8/19/24','8/26/24','9/2/24','9/9/24','9/16/24','9/23/24','9/30/24','10/7/24','10/14/24','10/21/24',
  '10/28/24','11/4/24','11/11/24','11/18/24','11/25/24','12/2/24','12/9/24','12/16/24','12/23/24','12/30/24',
  '1/6/25','1/13/25','1/20/25','1/27/25','2/3/25','2/10/25','2/18/25','2/24/25','3/3/25','3/10/25',
  '3/17/25','3/24/25','3/31/25','4/7/25','4/14/25','4/21/25','4/28/25','5/5/25','5/12/25','5/19/25',
  '5/26/25','6/2/25','6/9/25','6/16/25','6/23/25','6/30/25','7/7/25','7/14/25','7/21/25','7/28/25',
  '8/4/25','8/11/25','8/18/25','8/25/25','9/1/25','9/8/25','9/15/25','9/22/25','9/29/25','10/6/25',
  '10/13/25','10/20/25','10/27/25','11/3/25','11/10/25','11/17/25','11/24/25','12/1/25','12/8/25','12/15/25',
  '12/22/25','12/29/25','1/5/26','1/12/26','1/19/26','1/26/26','2/2/26','2/9/26','2/16/26','2/23/26',
];

function toISO(d: string): string {
  const parts = d.split('/');
  const m = parts[0].padStart(2, '0');
  const day = parts[1].padStart(2, '0');
  let yr = parts[2];
  if (yr.length === 2) yr = (parseInt(yr) >= 50 ? '19' : '20') + yr;
  return `${yr}-${m}-${day}`;
}

const DATES = RAW_DATES.map(toISO);

// ---------------------------------------------------------------------------
// 2. ACCOUNT METADATA (rows 4-26, 23 accounts)
// ---------------------------------------------------------------------------
interface AccountMeta {
  name: string;
  minBalance: number | null;
  responsiblePerson: string | null;
}

const ACCOUNTS: AccountMeta[] = [
  { name: 'Corporate cash (SVB ZP)', minBalance: 12000000, responsiblePerson: 'Jecah' },
  { name: 'Corporate cash (SVB ZPI)', minBalance: 1500000, responsiblePerson: 'Jecah' },
  { name: 'Corporate cash (SVB Gusto Capital)', minBalance: 300000, responsiblePerson: 'Jecah' },
  { name: 'Corporate cash (SVB Ardius)', minBalance: 300000, responsiblePerson: 'Jecah' },
  { name: 'Corporate cash (Chase ZP)', minBalance: 200000, responsiblePerson: 'Aileen' },
  { name: 'Corporate cash (Chase Gusto Capital)', minBalance: 50000, responsiblePerson: 'Aileen' },
  { name: 'Corporate Cash (Chase CAD)', minBalance: 350000, responsiblePerson: 'Aileen' },
  { name: 'Corporate Cash (Chase ZPI)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate Cash (Chase Ardius)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate Cash (Chase Symmetry)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate Cash (Chase MXN)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate Cash (Chase PEO & HR)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate cash (PNC)', minBalance: 200000, responsiblePerson: 'Aileen' },
  { name: 'Corporate cash (BRB)', minBalance: 50000, responsiblePerson: 'Aileen' },
  { name: 'Corporate cash (Sunrise)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate cash (Bank Leumi)', minBalance: 50000, responsiblePerson: 'Jecah' },
  { name: 'Corporate cash (Pathward)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate cash (Guideline)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate cash (Symmetry)', minBalance: null, responsiblePerson: 'Leslie' },
  { name: 'Corporate cash (NBKC)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate cash (GH, BBVA, BofA, Scotia, Stripe)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate cash (JPM Collateral)', minBalance: null, responsiblePerson: null },
  { name: 'Corporate cash (MS)', minBalance: null, responsiblePerson: null },
];

// ---------------------------------------------------------------------------
// 3. CASHFLOW LINE METADATA  (keyed by 0-based row offset within each range)
// ---------------------------------------------------------------------------
interface CashflowMeta {
  lineItem: string;
  category: string;
  lineType: string;
  frequency: string | null;
  responsiblePerson: string | null;
}

// Additions section rows 28-50 (range JU28:NP50 => 23 rows, 0-based)
// Row 28 = offset 0, Row 29 = offset 1, Row 30 = offset 2, Row 31 = offset 3, etc.
const ADDITION_ROWS: Record<number, CashflowMeta> = {
  3:  { lineItem: 'Revenue inflow', category: 'addition', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'Rachel' },
  4:  { lineItem: 'Revenue inflow', category: 'addition', lineType: 'actual', frequency: null, responsiblePerson: null },
  5:  { lineItem: 'Revenue inflow', category: 'addition', lineType: 'variance', frequency: null, responsiblePerson: null },
  6:  { lineItem: 'Reasonably guaranteed financing', category: 'addition', lineType: 'forecast', frequency: 'Varies', responsiblePerson: 'JJ' },
  7:  { lineItem: 'Sublease income', category: 'addition', lineType: 'forecast', frequency: 'Monthly', responsiblePerson: 'JJ' },
  8:  { lineItem: 'Customer cash: interest deposits', category: 'addition', lineType: 'forecast', frequency: 'Monthly', responsiblePerson: 'Treasury' },
  9:  { lineItem: 'Customer cash: interest deposits', category: 'addition', lineType: 'actual', frequency: null, responsiblePerson: null },
  10: { lineItem: 'Customer cash: interest deposits', category: 'addition', lineType: 'variance', frequency: null, responsiblePerson: null },
  11: { lineItem: 'Other (>$5k)', category: 'addition', lineType: 'forecast', frequency: 'Varies', responsiblePerson: 'All' },
  12: { lineItem: 'Other (>$5k)', category: 'addition', lineType: 'actual', frequency: null, responsiblePerson: null },
  13: { lineItem: 'Other (>$5k)', category: 'addition', lineType: 'variance', frequency: null, responsiblePerson: null },
  14: { lineItem: 'Symmetry (Excess cash)', category: 'addition', lineType: 'forecast', frequency: 'Varies', responsiblePerson: 'Chad/Leslie' },
  15: { lineItem: 'Symmetry (Excess cash)', category: 'addition', lineType: 'actual', frequency: null, responsiblePerson: null },
  16: { lineItem: 'Symmetry (Excess cash)', category: 'addition', lineType: 'variance', frequency: null, responsiblePerson: null },
  17: { lineItem: 'Transfer from Morgan Stanley', category: 'addition', lineType: 'forecast', frequency: 'Varies', responsiblePerson: 'JJ' },
  18: { lineItem: 'Transfer from Morgan Stanley', category: 'addition', lineType: 'actual', frequency: null, responsiblePerson: null },
  19: { lineItem: 'Transfer from Morgan Stanley', category: 'addition', lineType: 'variance', frequency: null, responsiblePerson: null },
  20: { lineItem: 'Subtotal', category: 'addition_total', lineType: 'forecast', frequency: null, responsiblePerson: null },
  21: { lineItem: 'Subtotal', category: 'addition_total', lineType: 'actual', frequency: null, responsiblePerson: null },
  22: { lineItem: 'Subtotal', category: 'addition_total', lineType: 'variance', frequency: null, responsiblePerson: null },
};

// Subtractions part 1: rows 51-70 (range JU51:NP70 => 20 rows, 0-based)
// Row 51 = offset 0, Row 52 = offset 1, etc.  But row 51 is blank header row.
// Actual data: row 52 = offset 1 (but the fetch starts at row 51 so offset mapping adjusts)
// Looking at the data: first 2 lines are blank, then data starts.
// Row 52 = offset 2, Row 53 = offset 3, etc.
const SUBTRACTION_ROWS_P1: Record<number, CashflowMeta> = {
  2:  { lineItem: 'Payroll', category: 'subtraction', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'Michelle' },
  3:  { lineItem: 'Payroll', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  4:  { lineItem: 'Payroll', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  5:  { lineItem: 'Canada Payroll/AP CAD', category: 'subtraction', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'Michelle' },
  6:  { lineItem: 'Canada Payroll/AP CAD', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  7:  { lineItem: 'Canada Payroll/AP CAD', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  8:  { lineItem: 'Mexico Payroll/Tax MXN', category: 'subtraction', lineType: 'forecast', frequency: null, responsiblePerson: 'Charles' },
  9:  { lineItem: 'Mexico Payroll/Tax MXN', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  10: { lineItem: 'Mexico Payroll/Tax MXN', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  11: { lineItem: 'Turkiye Payroll/Tax TRY', category: 'subtraction', lineType: 'forecast', frequency: null, responsiblePerson: null },
  12: { lineItem: 'Turkiye Payroll/Tax TRY', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  13: { lineItem: 'Turkiye Payroll/Tax TRY', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  14: { lineItem: 'Fidelity/401k/Collective Health', category: 'subtraction', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'Kevin Hamilton' },
  15: { lineItem: 'Fidelity/401k/Collective Health', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  16: { lineItem: 'Fidelity/401k/Collective Health', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  17: { lineItem: 'Estimated A/P run', category: 'subtraction', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'Roselle/Diana' },
  18: { lineItem: 'Estimated A/P run', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  19: { lineItem: 'Estimated A/P run', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
};

// Subtractions part 2: rows 71-106 (range JU71:NP106 => 36 rows, 0-based)
// Row 71 = offset 0, Row 72 = offset 1, ...
// But first 2 rows are blank in the fetch, so row 71 = offset 0, row 72 = offset 1, row 73 = offset 2
const SUBTRACTION_ROWS_P2: Record<number, CashflowMeta> = {
  2:  { lineItem: 'Airbase, Emburse, expense reports', category: 'subtraction', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'Gisela' },
  3:  { lineItem: 'AMEX payments', category: 'subtraction', lineType: 'forecast', frequency: 'Monthly', responsiblePerson: 'Gisela' },
  4:  { lineItem: 'Checks', category: 'subtraction', lineType: 'forecast', frequency: null, responsiblePerson: null },
  5:  { lineItem: 'Wires (eg. GiftBJt funding)', category: 'subtraction', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'All' },
  6:  { lineItem: 'Wires (eg. GiftBJt funding)', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  7:  { lineItem: 'Wires (eg. GiftBJt funding)', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  8:  { lineItem: 'Promotion payouts (ACH)', category: 'subtraction', lineType: 'forecast', frequency: 'Monthly', responsiblePerson: 'Aimee' },
  9:  { lineItem: 'Promotion payouts (ACH)', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  10: { lineItem: 'Promotion payouts (ACH)', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  11: { lineItem: 'Partner Rev Share (ACH)', category: 'subtraction', lineType: 'forecast', frequency: 'Monthly', responsiblePerson: 'Aimee' },
  12: { lineItem: 'Partner Rev Share (ACH)', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  13: { lineItem: 'Partner Rev Share (ACH)', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  14: { lineItem: 'Employee HI / benefits', category: 'subtraction', lineType: 'forecast', frequency: 'Weekly', responsiblePerson: 'Kevin Hamilton' },
  15: { lineItem: 'Employee HI / benefits', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  16: { lineItem: 'Employee HI / benefits', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  17: { lineItem: 'Business tax', category: 'subtraction', lineType: 'forecast', frequency: 'Varies', responsiblePerson: 'John' },
  18: { lineItem: 'Business tax', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  19: { lineItem: 'Business tax', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  20: { lineItem: 'Customer cash: loss transfers', category: 'subtraction', lineType: 'forecast', frequency: 'Ad hoc', responsiblePerson: 'Zhe' },
  21: { lineItem: 'Customer cash: loss transfers', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  22: { lineItem: 'Customer cash: loss transfers', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  23: { lineItem: 'Cashout funding', category: 'subtraction', lineType: 'forecast', frequency: 'Ad hoc', responsiblePerson: 'Zhe' },
  24: { lineItem: 'Cashout funding', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  25: { lineItem: 'Cashout funding', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  26: { lineItem: 'Loan interest', category: 'subtraction', lineType: 'forecast', frequency: 'Quarterly', responsiblePerson: 'Zhe' },
  27: { lineItem: 'Loan interest', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  28: { lineItem: 'Loan interest', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  29: { lineItem: 'Other (>$5k)', category: 'subtraction', lineType: 'forecast', frequency: 'Varies', responsiblePerson: 'All' },
  30: { lineItem: 'Other (>$5k)', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  31: { lineItem: 'Other (>$5k)', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  32: { lineItem: 'Transfer TO Morgan Stanley', category: 'subtraction', lineType: 'forecast', frequency: 'Varies', responsiblePerson: 'JJ' },
  33: { lineItem: 'Transfer TO Morgan Stanley', category: 'subtraction', lineType: 'actual', frequency: null, responsiblePerson: null },
  34: { lineItem: 'Transfer TO Morgan Stanley', category: 'subtraction', lineType: 'variance', frequency: null, responsiblePerson: null },
  35: { lineItem: 'Subtotal', category: 'subtraction_total', lineType: 'forecast', frequency: null, responsiblePerson: null },
};

// The subtraction totals continue -- we need the last line from this range but the range actually ends at row 106.
// Offsets 33, 34, 35 = rows 104, 105, 106  (subtotal fcst/actual/variance)
// Let me recalculate: range is rows 71-106 = 36 rows. Row 71=offset 0 ... row 106=offset 35.
// Row 104 = offset 33, Row 105 = offset 34, Row 106 = offset 35
// Overwrite offset 33-35:
// Actually rows 104=33, 105=34, 106=35.  But row 104 - 71 = 33. Yes.
// We already have offset 33 as 'Transfer TO Morgan Stanley' actual -- that's wrong.
// Let me recount. Row 71 = offset 0.
// Row 71=0, 72=1, 73=2, 74=3, 75=4, 76=5, 77=6, 78=7, 79=8, 80=9, 81=10, 82=11, 83=12, 84=13, 85=14
// 86=15, 87=16, 88=17, 89=18, 90=19, 91=20, 92=21, 93=22, 94=23, 95=24, 96=25, 97=26, 98=27, 99=28, 100=29
// 101=30, 102=31, 103=32, 104=33, 105=34, 106=35

// Fix: offset 30 = row 101, 31 = row 102, 32 = row 103, 33 = row 104, 34 = row 105, 35 = row 106

// But looking at the fetched data, the first two lines of JU71:NP106 are blank (rows 71, 72).
// Wait - actually the range is JU71:NP106 but when there are blank header lines in the response, they still appear as empty lines.
// Let me recount by looking at actual data lines in the fetch response.
// The fetch content has rows starting at row 71. But the data shows blank rows at the top.
// Each \n-separated line = one row from the sheet.

// Actually, let me be more careful. The fetched range starts at row 71.
// offset 0 = row 71 (Airbase) -- but looking at data it starts with blank lines
//
// Wait, the data shows:
// Line 0: blank
// Line 1: blank
// Then actual data lines.
//
// Hmm, looking more carefully at the raw response, the first content line after headers
// might have the data shifted. Let me parse more carefully.
//
// Actually the issue is that row 70 = the end of part 1 range, and the part 2 range starts at row 71.
// Row 71 = "Airbase, Emburse, expense reports (fcst)" but the actual row label is in col D,
// and JU:NP just has the data values.
// Some rows might be blank if there's no data across all 100 columns.
//
// Looking at the actual response for JU71:NP106:
// First line is blank/empty tabs, second is blank
// Third line (offset 2) has data for Airbase
// This matches: row 71 offset 0 is a separator, row 72 offset 1 is AMEX,
// but wait -- let me just look at what offsets have data and match them.
//
// REVISED approach: I'll parse the raw data and use the offset mapping as defined above,
// but I need to account for the actual structure. Let me look at the raw data lines.
//
// For the P2 range (JU71:NP106), examining the content:
// The fetch starts after "Spreadsheet:" and "Range:" header lines.
// Data line 0 (row 71): blank => row 71 is "Airbase..." fcst row? No.
// Actually row 71 in the sheet might be blank or a separator row between sections.
//
// Let me re-examine the user's specification:
// Row 71: Airbase, Emburse, expense reports - subtraction/forecast
// Row 72: AMEX payments - subtraction/forecast
// Row 73: Checks - subtraction/forecast
// Row 74: Wires fcst, 75: Wires actual, 76: Wires variance
// ...
// Row 104: Subtotal fcst, 105: Subtotal actual, 106: Subtotal variance
//
// The range JU71:NP106 fetches rows 71-106. That's 36 rows = offsets 0 through 35.
// offset 0 = row 71 (Airbase), offset 1 = row 72 (AMEX), offset 2 = row 73 (Checks),
// offset 3 = row 74 (Wires fcst), etc.
// offset 33 = row 104, offset 34 = row 105, offset 35 = row 106
//
// But we need to look at the ACTUAL data from the fetch to see how many blank/non-blank lines there are.
// The raw content starts with two blank lines, then data.
// So the actual offset mapping is: data_line_0 = blank, data_line_1 = blank, data_line_2 = first real data
//
// This means the range includes 2 preceding blank rows (perhaps rows that don't exist or header rows).
//
// WAIT - looking at the fetch more carefully, the "Range" in the response is "Forecast!JU71:NP106".
// The content starts with blank lines. Let me count: the first non-empty line in the P2 response
// appears to be "Airbase" data at offset 2.
//
// This is getting complex. Let me just use a reliable parsing approach:
// Parse all lines, and for each section, use the offset-to-metadata mapping that accounts for
// any blank rows at the start. I'll adjust mappings after checking the actual data.

// ---------------------------------------------------------------------------
// Ending cash section: rows 108-112 (range JU108:NP112 => 5 rows)
// ---------------------------------------------------------------------------
const ENDING_ROWS: Record<number, CashflowMeta> = {
  0: { lineItem: 'Ending Cash', category: 'ending', lineType: 'forecast', frequency: null, responsiblePerson: null },
  1: { lineItem: 'Ending Cash', category: 'ending', lineType: 'actual', frequency: null, responsiblePerson: null },
  2: { lineItem: 'Ending Cash', category: 'ending', lineType: 'variance', frequency: null, responsiblePerson: null },
  // Row 110 (offset 2) is Variance ($)
  // Row 111 (offset 3) is Variance (%) -- skip or store
  // Row 112 (offset 4) is TARGET
  4: { lineItem: 'TARGET', category: 'ending', lineType: 'forecast', frequency: null, responsiblePerson: null },
};

// ---------------------------------------------------------------------------
// 4. RAW SHEET DATA (fetched via mcp__gsheetsgusto__fetch)
// ---------------------------------------------------------------------------

const RAW_FORECAST_ACCOUNTS = `1,753,863.00\t2,004,235.09\t2,212,394.23\t2,433,899.23\t2,586,035.97\t63,925.72\t66,879.34\t66,840.24\t387,201.50\t387,267.26\t382,186.26\t378,776.30\t312,660.14\t145,678.20\t149,690.53\t130,152.47\t129,839.33\t177,862.14\t192,894.26\t63,605.67\t52,750.08\t(77,537.77)\t122,795.49\t127,781.67\t127,781.67\t332,791.23\t113,551.36\t106,835.71\t119,148.27\t316,698.35\t316,698.35\t316,698.35\t316,698.35\t316,698.35\t393,058.55\t393,058.55\t393,058.55\t393,058.55\t393,058.55\t393,058.55\t393,058.55\t393,058.55\t393,058.55\t82,933.83\t76,508.68\t76,508.68\t76,508.68\t76,508.68\t253,389.72\t253,389.72\t295,316.02\t295,316.02\t295,316.02\t295,316.02\t295,316.02\t295,316.02\t295,316.02\t396,925.83\t396,925.83\t396,925.83\t748,466.06\t748,466.06\t748,466.06\t748,466.06\t748,466.06\t588,268.24\t588,268.24\t588,268.24\t588,268.24\t588,268.24\t588,268.24\t588,268.24\t588,268.24\t588,268.24\t79,479.80\t79,479.80\t79,479.80\t69,867.67\t167,469.30\t167,469.30\t167,469.30\t167,469.30\t167,469.30\t167,469.30\t0.00\t0.00\t0.00\t0.00\t0.00
94,139.13\t94,139.13\t94,139.13\t94,139.13\t93,347.64\t93,347.64\t93,347.64\t93,347.64\t92,597.64\t92,520.27\t92,520.27\t92,520.27\t92,520.27\t91,693.82\t91,693.82\t91,693.82\t91,693.82\t87,438.22\t87,438.22\t87,438.22\t87,438.22\t84,846.42\t84,769.16\t84,769.16\t84,769.16\t84,769.16\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t82,381.23\t67,590.53\t67,590.53\t67,590.53\t67,590.53\t67,590.53\t67,590.53\t66,524.53\t66,524.53\t66,524.53\t66,524.53\t66,524.53\t66,524.53\t66,524.53\t66,524.53\t66,524.53\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t66,492.27\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
181,053.12\t181,053.12\t181,053.12\t181,053.12\t180,553.12\t180,553.12\t180,553.12\t180,553.12\t180,005.44\t180,005.44\t180,005.44\t180,005.44\t180,005.44\t179,459.88\t179,459.88\t179,459.88\t179,459.88\t178,959.88\t178,959.88\t178,911.90\t178,911.90\t178,411.90\t178,411.90\t178,411.90\t178,411.90\t178,411.90\t177,784.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t177,384.88\t175,672.96\t175,672.96\t175,672.96\t175,672.96\t175,672.96\t175,672.96\t(0.01)\t(0.01)\t(0.01)\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
12,699.76\t12,699.76\t12,699.76\t12,699.76\t12,699.76\t12,441.56\t12,441.56\t12,441.56\t12,213.13\t12,213.13\t12,213.13\t12,213.13\t12,213.13\t11,984.84\t11,984.84\t11,984.84\t11,984.84\t11,984.84\t11,984.84\t11,756.31\t11,756.31\t11,756.31\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t11,527.84\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
14,522,264.49\t41,606,405.79\t24,708,678.79\t30,915,403.24\t17,074,035.95\t53,693,948.87\t36,388,331.37\t21,436,229.50\t16,860,406.02\t16,052,374.16\t53,534,508.34\t25,742,184.55\t22,495,020.87\t16,630,829.94\t55,495,658.11\t24,507,609.19\t18,687,190.60\t27,141,896.53\t24,032,711.72\t50,339,252.69\t24,581,273.75\t22,513,130.88\t15,701,068.06\t57,381,969.39\t16,031,794.79\t22,637,332.63\t16,712,717.18\t60,705,925.27\t31,913,332.15\t27,663,434.58\t28,831,119.15\t17,827,470.32\t59,707,297.25\t38,465,693.20\t33,168,278.36\t16,239,524.87\t12,557,090.38\t56,677,360.28\t31,681,302.64\t34,926,879.26\t18,095,486.56\t24,743,880.99\t36,508,734.94\t28,238,081.92\t15,614,248.54\t66,991,144.47\t45,979,988.19\t34,893,745.71\t15,544,454.67\t56,055,927.92\t31,204,025.22\t34,593,186.77\t14,939,481.97\t65,288,394.16\t42,975,475.86\t36,432,486.90\t9,969,122.43\t62,684,491.81\t49,453,605.19\t44,874,835.41\t38,188,069.23\t11,798,390.34\t62,970,699.66\t40,178,912.12\t49,787,127.52\t29,053,470.41\t78,872,583.27\t47,942,850.25\t97,767,566.38\t39,517,781.11\t37,736,902.96\t78,215,572.73\t50,171,018.65\t58,439,872.61\t36,213,648.78\t84,361,426.98\t67,847,874.26\t182,217,174.28\t157,919,495.95\t208,068,472.46\t66,418,667.11\t51,159,111.22\t50,930,747.88\t170,099,640.31\t96,362,025.63\t68,455,624.99\t63,557,423.26\t66,947,926.28\t83,304,408.43\t45,821,396.60\t62,338,746.24\t51,267,126.98\t87,439,655.75\t73,903,349.06\t39,375,937.70\t46,816,123.71\t156,369,744.67\t100,002,720.64\t71,456,055.80\t75,111,593.75
195,808.42\t154,010.67\t144,576.09\t181,629.51\t430,519.51\t149,728.05\t153,006.39\t151,229.14\t150,898.85\t151,333.55\t366,901.94\t188,930.12\t188,835.12\t208,018.81\t205,159.81\t464,491.98\t248,185.97\t249,579.02\t220,180.71\t212,054.33\t222,327.67\t213,424.14\t214,110.98\t462,406.28\t166,691.23\t166,691.23\t166,691.34\t140,684.23\t537,274.29\t215,922.42\t215,872.42\t208,745.23\t214,122.12\t225,722.28\t225,722.28\t265,368.90\t225,894.90\t465,299.90\t319,452.05\t323,509.33\t323,344.33\t519,153.85\t382,912.63\t647,512.63\t647,734.75\t667,489.31\t593,056.50\t315,589.61\t384,025.55\t484,441.52\t645,561.64\t746,047.82\t746,047.82\t969,881.58\t878,661.88\t893,847.91\t899,152.42\t591,547.55\t591,544.28\t588,764.28\t592,376.23\t599,784.68\t572,193.78\t576,222.72\t888,457.70\t597,665.70\t599,533.38\t646,756.56\t608,431.43\t657,431.43\t754,613.66\t823,883.05\t697,792.02\t697,792.02\t778,834.65\t1,196,247.09\t947,593.07\t933,539.10\t1,399,235.09\t1,375,562.08\t897,762.66\t876,589.96\t876,589.96\t233,457.68\t320,526.06\t226,658.87\t679,551.33\t406,577.74\t413,986.85\t833,986.85\t458,539.64\t523,539.64\t658,037.85\t1,869,468.16\t1,408,112.99\t392,970.24\t411,427.89\t507,262.97\t923,202.18\t567,788.97
217,871.38\t218,724.26\t9,858.58\t211,370.09\t208,835.88\t208,584.44\t208,584.44\t7,828.92\t382,404.23\t165,379.88\t307,626.05\t29,518.51\t29,261.64\t58,044.20\t102,660.40\t101,227.45\t101,227.45\t602,242.68\t225,266.51\t172,729.02\t171,258.63\t184,720.03\t115,529.83\t169,366.07\t123,040.01\t123,559.21\t118,872.78\t277,333.76\t277,322.74\t363,300.86\t362,453.79\t351,521.29\t276,705.14\t279,740.39\t273,600.37\t195,418.12\t195,418.12\t134,283.41\t134,272.69\t126,584.16\t126,573.45\t81,567.87\t66,086.34\t160,802.95\t158,656.09\t51,643.71\t21,961.91\t21,393.75\t65,767.32\t1,145.47\t55,989.41\t54,409.60\t103,808.53\t38,485.89\t65,368.44\t65,368.44\t37,968.36\t46,170.17\t46,170.17\t27,856.75\t35,689.96\t110,093.93\t45,934.59\t87,630.28\t87,613.75\t471,403.42\t100,973.71\t117,732.04\t117,732.04\t493,608.26\t230,013.01\t151,515.35\t167,675.11\t167,004.89\t196,864.58\t171,036.91\t196,038.40\t191,273.85\t230,562.08\t228,256.76\t195,269.50\t193,686.82\t193,686.82\t225,412.50\t649,312.27\t192,861.87\t186,775.45\t228,606.45\t333,575.05\t351,466.25\t797,467.34\t387,529.36\t387,529.36\t754,625.60\t143,154.66\t142,003.20\t132,232.13\t546,456.82\t76,610.37\t578,512.63
944,389.17\t2,766,970.35\t97,442.38\t456,487.03\t357,655.41\t565,855.43\t2,615,064.98\t2,961,962.47\t5,558,651.78\t787,931.05\t3,033,222.25\t1,503,430.64\t2,782,616.17\t1,838,994.47\t2,873,639.66\t541,536.89\t2,232,451.07\t2,399,022.40\t3,925,995.84\t5,714,954.37\t6,488,755.79\t1,537,916.26\t3,101,353.61\t2,283,833.07\t2,660,998.09\t1,786,334.56\t3,609,065.11\t1,439,106.10\t2,625,499.56\t630,951.01\t2,273,805.23\t2,134,717.96\t440,343.40\t1,010,030.93\t2,193,890.40\t282,781.76\t1,511,110.34\t352,992.18\t545,325.63\t935,764.90\t440,638.67\t751,369.48\t2,620,098.02\t4,736,281.98\t461,055.74\t2,193,370.43\t1,699,432.15\t5,052,630.77\t651,810.38\t3,121,116.81\t5,442,124.31\t2,128,765.72\t4,869,083.59\t3,022,493.81\t3,462,512.72\t3,313,498.54\t623,586.76\t2,309,300.93\t1,573,846.14\t2,963,874.83\t489,707.10\t771,403.51\t3,440,256.61\t2,795,887.96\t3,898,242.37\t1,605,630.75\t2,714,327.22\t4,249,070.90\t6,806,546.93\t7,012,318.27\t5,539,180.74\t2,495,383.87\t4,957,740.15\t4,036,787.40\t3,335,284.73\t5,660,258.88\t2,564,086.33\t5,454,106.83\t5,642,093.62\t2,350,271.37\t1,172,367.59\t852,822.52\t3,984,647.48\t1,188,392.10\t1,205,334.30\t2,768,340.89\t5,198,819.82\t2,942,978.81\t1,805,952.26\t3,468,806.78\t4,094,671.74\t2,291,172.34\t2,014,308.27\t4,323,140.91\t6,158,000.56\t3,039,181.20\t1,146,546.44\t3,526,266.40\t2,062,053.53\t3,303,743.95
274,805.30\t324,334.97\t421,109.58\t473,216.61\t1,284,876.10\t326,274.58\t353,547.57\t376,129.91\t1,033,750.08\t1,042,848.20\t1,062,221.85\t1,080,659.41\t1,081,163.14\t345,212.72\t457,130.12\t463,380.54\t482,634.99\t816,539.82\t835,111.97\t837,903.88\t839,579.04\t1,133,325.96\t1,138,529.50\t141,563.01\t148,099.15\t226,204.46\t471,639.60\t604,632.68\t617,963.68\t621,630.37\t899,852.00\t902,231.41\t926,683.03\t927,562.46\t1,014,503.39\t64,894.28\t1,264,894.28\t79,975.63\t55,748.64\t55,959.99\t224,867.82\t225,273.72\t240,912.10\t241,582.52\t240,480.18\t400,720.16\t420,136.89\t466,468.17\t692,150.17\t690,602.95\t693,557.65\t693,768.67\t1,162,509.81\t181,866.01\t183,225.55\t185,146.91\t1,026,695.22\t1,013,500.79\t214,130.08\t222,070.31\t250,086.47\t631,691.94\t626,041.68\t622,359.05\t647,222.38\t856,219.91\t859,113.32\t860,151.65\t863,928.77\t1,138,278.82\t1,145,880.77\t1,149,548.72\t1,149,548.72\t1,150,531.55\t1,426,308.56\t1,430,155.19\t1,441,684.30\t1,447,401.35\t1,745,296.58\t1,749,625.62\t1,749,625.62\t1,749,625.62\t1,749,625.62\t249,625.62\t254,115.61\t254,115.61\t693,412.66\t1,078,403.54\t1,072,645.46\t1,074,362.18\t1,082,998.71\t1,271,624.89\t1,274,425.61\t1,285,512.61\t1,285,672.76\t285,672.76\t447,461.89\t444,992.53\t444,884.12\t444,884.12
0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
220,239.94\t220,161.60\t164,236.75\t268,807.67\t268,124.78\t207,243.23\t202,102.84\t315,269.91\t314,538.17\t254,651.26\t254,651.26\t135,968.61\t274,094.97\t202,463.04\t202,463.04\t197,557.59\t255,693.28\t254,975.02\t193,114.63\t187,958.61\t327,884.77\t273,535.69\t210,160.08\t210,160.08\t473,841.10\t367,521.69\t367,521.69\t236,219.06\t223,902.03\t6,811,295.60\t5,116,258.16\t4,184,818.39\t4,107,236.39\t5,707,577.89\t4,895,099.37\t192,163.21\t192,163.21\t192,163.21\t410,729.60\t294,418.64\t294,418.64\t250,962.46\t250,962.46\t333,101.58\t257,608.97\t212,590.82\t156,624.15\t236,317.05\t192,012.17\t191,782.28\t108,609.78\t250,221.76\t250,221.76\t207,579.97\t203,808.40\t318,082.06\t280,277.25\t223,873.91\t220,073.63\t284,830.79\t4,977,473.58\t4,119,220.61\t215,440.41\t166,566.73\t255,376.56\t255,132.29\t210,414.37\t206,582.70\t253,846.21\t253,215.46\t204,223.98\t210,246.67\t154,733.47\t285,903.85\t177,234.64\t127,266.33\t299,503.73\t199,391.60\t198,737.40\t159,444.32\t150,231.05\t286,677.38\t286,677.38\t286,677.38\t251,926.52\t150,099.02\t403,203.58\t376,585.41\t376,585.41\t368,596.93\t220,043.34\t236,168.32\t192,557.56\t328,635.30\t284,947.16\t211,882.35\t175,137.19\t175,137.19\t137,933.00\t105,445.75
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
75,000.00\t75,000.00\t75,000.00\t75,000.00\t75,000.00\t489,643.69\t638,728.32\t807,168.83\t987,471.01\t1,038,655.06\t1,249,260.00\t1,421,056.10\t1,615,147.33\t673,702.41\t887,971.75\t1,094,427.60\t1,306,288.92\t1,448,283.21\t1,532,364.74\t1,744,406.72\t1,909,170.43\t2,102,041.08\t2,132,411.23\t2,397,154.63\t2,592,859.13\t2,810,316.92\t348,944.85\t593,544.89\t762,531.93\t1,033,676.33\t1,208,420.13\t1,264,852.97\t1,498,998.06\t1,653,188.88\t1,854,979.81\t1,971,697.81\t1,882,567.75\t58,511.18\t262,876.67\t508,698.88\t806,616.35\t1,080,770.81\t579,708.24\t867,864.73\t158,377.05\t226,020.72\t769,757.01\t1,097,248.46\t396,661.00\t749,095.95\t1,008,802.24\t1,326,191.95\t462,363.24\t875,121.26\t1,161,788.29\t1,493,797.76\t1,716,634.24\t451,567.94\t664,960.10\t981,782.30\t1,169,333.84\t1,257,811.84\t1,589,731.22\t1,832,576.96\t311,114.77\t438,129.04\t806,079.31\t1,111,521.52\t1,427,282.91\t1,648,222.61\t1,792,237.50\t2,114,445.67\t444,871.79\t651,981.66\t725,701.25\t1,090,052.97\t1,331,823.03\t1,427,709.20\t1,515,002.85\t1,488,333.08\t1,590,825.44\t261,412.95\t282,868.40\t236,217.15\t381,027.89\t474,834.21\t574,372.88\t602,003.16\t719,330.78\t773,975.72\t882,364.68\t928,153.83\t192,854.13\t297,544.53\t397,547.62\t497,197.16\t482,353.09\t604,416.73\t707,826.15\t805,628.38
100,159.86\t100,159.86\t100,159.86\t100,159.86\t100,159.86\t0.00\t100,952.69\t100,952.69\t100,952.69\t100,952.69\t101,791.69\t101,791.69\t101,791.69\t101,791.69\t102,537.77\t102,491.77\t102,491.77\t102,491.77\t102,491.77\t94,702.89\t94,702.89\t94,702.89\t94,702.89\t87,028.73\t86,948.73\t86,948.73\t86,948.73\t74,556.72\t1,029,017.19\t1,029,017.19\t1,029,017.19\t1,029,017.19\t1,029,017.19\t1,029,017.19\t1,029,017.19\t1,029,017.19\t1,029,017.19\t3,110,611.29\t120,225.54\t120,225.54\t142,936.07\t142,936.07\t142,936.07\t1,112,483.49\t1,112,483.49\t1,112,483.49\t1,268,727.82\t1,268,727.82\t242,796.04\t242,796.04\t242,796.04\t242,796.04\t242,796.04\t242,796.04\t242,796.04\t242,796.04\t30,747.23\t30,747.23\t115,616.62\t115,616.62\t115,616.62\t115,616.62\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t206,993.26\t1,589,244.04\t1,589,244.04\t1,589,244.04\t2,745,973.19\t745,973.19\t745,973.19\t745,973.19\t745,973.19\t745,973.19\t1,900,334.17\t3,053,366.96\t3,053,076.88\t3,052,877.88\t3,052,678.88\t3,055,872.38\t4,209,079.69\t4,208,887.69\t4,208,887.69\t4,208,827.69\t5,510,578.25\t5,489,831.32\t488,823.94
11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t11,310.39\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
15,523.13\t15,232.23\t15,002.80\t14,920.48\t14,996.71\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13\t15,130.13
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t250,000.00\t250,000.00\t250,000.00\t250,000.00\t250,000.00\t250,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t750,000.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00\t499,995.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t0.00\t29,574,319.56\t41,644,265.20\t37,597,895.08\t34,697,681.82\t15,923,402.65\t15,923,116.53\t15,956,401.48\t19,464,933.51\t22,890,887.45\t25,714,509.43\t29,073,316.71\t10,606,591.97\t15,051,568.50\t11,340,543.24
6,544,504.71\t6,626,611.28\t7,137,469.28\t8,098,469.28\t1,466,662.35\t1,939,866.56\t1,924,838.84\t2,892,929.81\t2,860,727.67\t3,722,250.77\t3,647,531.52\t3,647,531.52\t4,164,017.62\t4,516,069.38\t4,639,776.10\t4,769,898.96\t5,201,935.25\t1,470,458.96\t2,380,291.44\t1,800,993.20\t2,099,764.76\t2,099,764.76\t2,543,523.83\t3,115,580.11\t3,507,209.30\t4,024,482.18\t4,189,091.67\t4,266,637.90\t4,583,804.54\t4,917,570.51\t5,292,038.87\t5,292,038.87\t2,274,266.44\t2,401,666.95\t2,466,645.52\t2,503,204.11\t2,503,204.11\t2,917,713.07\t2,979,587.23\t2,979,587.23\t3,529,237.95\t4,504,618.68\t4,618,857.42\t4,734,897.51\t4,734,897.51\t1,270,390.97\t2,159,954.86\t2,282,211.07\t3,816,358.41\t4,108,282.25\t5,057,068.16\t5,431,756.86\t5,576,975.94\t5,968,969.91\t6,137,731.83\t7,388,283.65\t1,077,113.47\t1,327,387.63\t1,462,468.97\t1,677,159.21\t1,330,003.77\t1,464,643.92\t2,032,138.63\t2,811,781.61\t3,610,783.32\t4,084,184.63\t4,119,499.91\t4,588,394.30\t4,852,754.97\t4,852,754.97\t1,046,009.06\t1,046,009.06\t1,280,029.16\t1,957,299.02\t2,053,296.72\t2,053,296.72\t2,745,036.03\t4,488,248.07\t5,995,290.82\t5,661,026.33\t5,661,026.33\t6,146,757.21\t6,146,757.21\t6,146,757.21\t1,494,027.06\t1,494,027.06\t1,494,027.06\t1,494,027.06\t1,494,027.06\t1,494,027.06\t3,338,906.21\t3,338,906.21\t5,168,985.55\t5,766,015.11\t6,435,861.74\t6,617,923.71\t1,588,697.59\t1,727,982.80\t1,986,318.38\t2,081,062.95
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t1,366,621.37\t1,355,307.33\t1,363,400.75\t1,779,337.87\t1,699,859.75\t2,503,870.27\t2,526,130.48\t2,495,706.57\t2,552,888.86\t2,428,811.71\t2,516,623.81\t2,417,186.04\t5,584,904.75\t5,753,293.55\t6,383,072.15\t6,216,757.73
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t1,055,207.10\t1,055,207.10\t1,055,207.10\t1,462,954.54\t1,462,954.54\t1,462,853.48\t1,462,948.79\t1,462,948.79\t1,388,751.95\t1,388,678.79\t1,388,678.79\t1,388,678.79\t1,391,691.93\t1,091,794.51\t1,109,637.03\t1,115,092.44
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t7,796,548.46\t7,796,548.46\t7,796,548.46\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,811,606.71\t7,840,030.51\t7,840,030.51
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t287,698,045.31\t122,201,258.38\t122,201,258.38\t122,201,258.38\t122,201,258.38\t122,201,258.38\t122,710,713.75\t122,710,713.75\t122,710,713.75\t122,710,713.75\t122,710,713.75\t122,710,713.75\t122,710,713.75\t253,392,834.34\t253,587,896.00\t253,743,647.43`;

const RAW_ADDITIONS = `\t\t\t\t\t5/6/2024\t5/13/2024\t5/20/2024\t5/28/2024\t6/3/2024\t6/10/2024\t6/17/2024\t6/24/2024\t7/1/2024\t7/8/2024\t7/15/2024\t7/22/2024\t7/29/2024\t8/5/2024\t8/12/2024\t8/19/2024\t8/26/2024\t9/2/2024\t9/9/2024\t9/16/2024\t9/23/2024\t9/30/2024\t10/7/2024\t10/14/2024\t10/21/2024\t10/28/2024\t11/4/2024\t11/11/2024\t11/18/2024\t11/25/2024\t12/2/2024\t12/9/2024\t12/16/2024\t12/23/2024\t12/30/2024\t1/6/2025\t1/13/2025\t1/20/2025\t1/27/2025\t2/3/2025\t2/10/2025\t2/18/2025\t2/24/2025\t3/3/2025\t3/10/2025\t3/17/2025\t3/24/2025\t3/31/2025\t4/7/2025\t4/14/2025\t4/21/2025\t4/28/2025\t5/5/2025\t5/12/2025\t5/19/2025\t5/26/2025\t6/2/2025\t6/9/2025\t6/16/2025\t6/23/2025\t6/30/2025\t7/7/2025\t7/14/2025\t7/21/2025\t7/28/2025\t8/4/2025\t8/11/2025\t8/18/2025\t8/25/2025\t9/1/2025\t9/8/2025
\n
44,201,604.94\t1,746,945.48\t2,500,000.00\t8,734,727.42\t48,736,180.00\t1,566,052.88\t3,394,771.76\t4,909,086.57\t3,874,920.67\t46,619,787.58\t3,844,220.04\t2,218,217.22\t2,886,198.12\t47,178,134.42\t2,385,739.47\t2,704,329.66\t4,049,218.58\t47,516,770.71\t2,807,155.60\t1,888,158.05\t3,258,574.70\t1,915,609.58\t50,139,062.28\t3,012,371.70\t2,270,234.98\t2,536,321.10\t52,646,015.39\t3,162,990.29\t2,383,746.72\t2,663,137.15\t0.00\t50,654,739.74\t1,978,139.10\t2,371,689.28\t0.00\t50,050,090.89\t2,717,833.70\t2,341,890.33\t1,733,152.75\t50,142,252.03\t2,619,654.36\t2,365,775.44\t1,465,429.97\t0.00\t58,547,116.00\t2,833,492.78\t2,373,737.15\t1,953,906.62\t53,671,772.28\t2,763,698.09\t2,395,166.51\t1,742,743.65\t52,355,158.40\t2,695,902.24\t2,336,411.06\t1,699,992.67\t6,000,000.00\t55,373,232.72\t2,830,697.35\t2,453,231.61\t7,784,992.31\t56,404,117.99\t395,518.23\t3,706,698.27\t408,603.28\t57,211,567.99\t407,383.78\t73,302.01\t3,395,556.25\t4,338,967.12\t58,546,188.22\t419,605.29\t662,035.54\t4,338,967.12\t60,302,573.87\t662,035.54\t4,796,887.16\t5,147,008.88\t60,528,475.13\t3,050,832.19\t1,859,734.80\t4,786,950.35\t2,499,168.07\t65,623,909.22\t3,050,832.19\t1,859,734.80\t4,786,950.35\t62,595,215.04\t1,295,825.13\t10,020,112.03\t3,411,235.50\t4,167,634.08\t62,506,769.41\t1,020,245.60\t6,748,284.34\t2,663,674.05\t64,271,621.63\t1,050,852.97\t2,718,707.12\t2,994,246.78
\t\t\t\t46,530,171.00\t2,866,996.16\t2,834,656.24\t4,786,948.79\t758,053.43\t48,843,029.38\t2,432,125.00\t1,983,816.35\t3,311,488.36\t48,600,591.63\t3,122,345.63\t2,734,159.59\t1,677,286.95\t12,609,519.12\t1,258,082.65\t\t\t\t51,667,113.46\t1,243,343.76\t1,686,054.23\t2,977,301.64\t49,327,589.49\t277,488.89\t2,155,949.31\t1,387,005.55\t1,761,930.56\t50,035,987.96\t1,824,691.60\t215,415.93\t2,212,444.75\t50,994,473.85\t2,942,452.27\t4,474,449.47\t1,946,215.99\t12,090,905.75\t39,937,444.11\t1,694,509.16\t422,283.46\t2,480,540.87\t58,314,506.27\t4,315,929.33\t2,449,131.88\t3,869,900.47\t54,677,851.01\t59,024.56\t4,358,392.34\t3,395,584.45\t59,636,755.93\t1,125,670.82\t364,379.57\t3,514,261.20\t7,837,489.31\t53,861,694.30\t383,998.28\t3,598,736.18\t396,702.21\t59,028,449.19\t71,167.00\t3,296,656.55\t4,212,589.44\t33,861,449.54\t26,407,604.88\t642,752.95\t4,000,000.00\t4,853,713.71\t63,721,383.00\t2,443,137.00\t4,657,172.00\t4,997,096.00\t61,820,213.00\t2,961,973.00\t1,805,567.77\t4,647,524.61\t63,712,533.22\t2,062,972.00\t3,184,553.00\t509,825.30\t4,046,246.68\t64,718,783.85\t1,258,082.65\t9,728,264.11\t3,311,879.13\t64,658,808.46\t990,529.71\t6,551,732.37\t2,586,091.31\t7,160,434.54\t61,525,178.89\t2,639,521.48\t5,109,052.32\t2,907,035.71\t76,899,322.16\t2,534,464.76\t5,289,534.13\t3,478,809.66
\t\t\t\t2,206,009.00\t(1,300,943.28)\t560,115.52\t122,137.78\t3,116,867.24\t(2,223,241.80)\t1,412,095.04\t234,400.87\t(425,290.24)\t(1,422,457.21)\t(736,606.16)\t(29,829.93)\t2,371,931.63\t34,907,251.59\t1,549,072.95\t1,888,158.05\t3,258,574.70\t1,915,609.58\t(1,528,051.18)\t1,769,027.94\t584,180.75\t(440,980.54)\t3,318,425.90\t2,885,501.40\t227,797.41\t1,276,131.60\t(1,761,930.56)\t618,751.78\t153,447.50\t2,156,273.35\t(2,212,444.75)\t(944,382.96)\t(224,618.57)\t(2,132,559.14)\t(213,063.24)\t38,051,346.28\t(37,317,789.75)\t671,266.28\t1,043,146.51\t(2,480,540.87)\t232,609.73\t(1,482,436.55)\t(75,394.73)\t(1,915,993.85)\t(1,006,078.73)\t2,704,673.53\t(1,963,225.83)\t(1,652,840.80)\t(7,281,597.53)\t1,570,231.42\t1,972,031.49\t(1,814,268.53)\t(1,837,489.31)\t1,511,538.42\t2,446,699.07\t(1,145,504.57)\t7,388,290.10\t(2,624,331.20)\t324,351.23\t410,041.72\t(3,803,986.16)\t23,350,118.45\t(26,000,221.10)\t(569,450.94)\t(604,443.75)\t(514,746.59)\t(5,175,194.78)\t(2,023,531.71)\t(3,995,136.46)\t(2,299,937.46)\t2,991,319.39\t499,484.27\t(3,184,058.09)\t987,860.19\t(1,324,818.20)\t4,277,125.05\t(1,547,078.61)\t905,125.37\t1,792,749.54\t(7,868,529.31)\t1,475,071.22\t(2,063,593.42)\t305,295.42\t3,468,379.66\t825,144.19\t(2,992,800.46)\t981,590.52\t(1,619,275.88)\t1,639,232.02\t(243,361.66)\t(12,627,700.53)\t(1,483,611.79)\t(2,570,827.01)\t(484,562.88)
\n
\n
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t2,156,491.00
\n
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t2,156,491.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\n
\t\t\t\t\t3,200.00\t\t\t\t\t\t1,077,935.96\t775.50\t4,900.46\t\t391.45\t\t0.24\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t18,822.41
\t\t\t\t0.00\t(3,200.00)\t0.00\t0.00\t0.00\t0.00\t0.00\t(1,077,935.96)\t(775.50)\t(4,900.46)\t0.00\t(391.45)\t0.00\t(0.24)\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t(18,822.41)\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t\t7,500,000.00\t\t\t\t\t\t\t\t\t\t\t\t\t4,000,000.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t4,000,000.00\t\t\t\t\t\t\t\t\t\t\t\t6,700,000.00
\n
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t4,000,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t4,000,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t6,700,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t\t20,000,000.00\t\t\t\t\t10,000,000.00\t\t\t\t5,000,000.00\t\t\t\t10,000,000.00\t\t\t\t\t10,000,000.00\t\t\t\t10,000,000.00\t\t\t\t\t10,000,000.00\t10,000,000.00\t\t\t\t\t\t\t\t\t\t7,500,000.00\t\t6,000,000.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t125,000,000.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t125,000,000.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t10,000,000.00\t0.00\t0.00\t0.00\t5,000,000.00\t0.00\t0.00\t0.00\t10,000,000.00\t0.00\t0.00\t0.00\t0.00\t10,000,000.00\t0.00\t0.00\t0.00\t10,000,000.00\t0.00\t0.00\t0.00\t0.00\t10,000,000.00\t10,000,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t7,500,000.00\t0.00\t6,000,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
44,201,604.94\t1,746,945.48\t2,500,000.00\t36,234,727.42\t48,736,180.00\t1,566,052.88\t3,394,771.76\t4,909,086.57\t13,874,920.67\t46,619,787.58\t3,844,220.04\t2,218,217.22\t7,886,198.12\t47,178,134.42\t2,385,739.47\t2,704,329.66\t18,049,218.58\t47,516,770.71\t2,807,155.60\t1,888,158.05\t3,258,574.70\t11,915,609.58\t50,139,062.28\t3,012,371.70\t2,270,234.98\t12,536,321.10\t52,646,015.39\t3,162,990.29\t2,383,746.72\t2,663,137.15\t10,000,000.00\t60,654,739.74\t1,978,139.10\t2,371,689.28\t0.00\t50,050,090.89\t2,717,833.70\t2,341,890.33\t1,733,152.75\t50,142,252.03\t2,619,654.36\t9,865,775.44\t1,465,429.97\t10,000,000.00\t58,547,116.00\t2,833,492.78\t2,373,737.15\t1,953,906.62\t53,671,772.28\t2,763,698.09\t2,395,166.51\t1,742,743.65\t52,355,158.40\t2,695,902.24\t2,336,411.06\t8,399,992.67\t6,000,000.00\t55,373,232.72\t2,830,697.35\t2,453,231.61\t7,784,992.31\t56,404,117.99\t395,518.23\t5,863,189.27\t408,603.28\t57,211,567.99\t407,383.78\t73,302.01\t3,395,556.25\t4,338,967.12\t58,546,188.22\t419,605.29\t662,035.54\t4,338,967.12\t60,302,573.87\t662,035.54\t4,796,887.16\t5,147,008.88\t60,528,475.13\t3,050,832.19\t1,859,734.80\t4,786,950.35\t127,499,168.07\t65,623,909.22\t3,050,832.19\t1,859,734.80\t4,786,950.35\t62,595,215.04\t1,295,825.13\t10,020,112.03\t3,411,235.50\t4,167,634.08\t62,506,769.41\t1,020,245.60\t6,748,284.34\t2,663,674.05\t64,271,621.63\t1,050,852.97\t2,718,707.12\t2,994,246.78
\t\t\t\t46,530,171.00\t2,870,196.16\t2,834,656.24\t4,786,948.79\t758,053.43\t48,843,029.38\t2,432,125.00\t3,061,752.31\t3,312,263.86\t48,605,492.09\t3,122,345.63\t2,734,551.04\t1,677,286.95\t12,609,519.36\t1,258,082.65\t0.00\t0.00\t0.00\t51,667,113.46\t1,243,343.76\t1,686,054.23\t2,977,301.64\t49,327,589.49\t277,488.89\t2,155,949.31\t1,387,005.55\t1,761,930.56\t50,035,987.96\t1,824,691.60\t215,415.93\t2,212,444.75\t50,994,473.85\t2,942,452.27\t4,474,449.47\t1,946,215.99\t12,090,905.75\t39,937,444.11\t1,713,331.57\t422,283.46\t2,480,540.87\t58,314,506.27\t4,315,929.33\t2,449,131.88\t3,869,900.47\t54,677,851.01\t59,024.56\t4,358,392.34\t3,395,584.45\t59,636,755.93\t1,125,670.82\t364,379.57\t3,514,261.20\t7,837,489.31\t53,861,694.30\t383,998.28\t3,598,736.18\t396,702.21\t59,028,449.19\t71,167.00\t3,296,656.55\t4,212,589.44\t33,861,449.54\t26,407,604.88\t642,752.95\t4,000,000.00\t4,853,713.71\t63,721,383.00\t2,443,137.00\t4,657,172.00\t4,997,096.00\t61,820,213.00\t2,961,973.00\t1,805,567.77\t4,647,524.61\t63,712,533.22\t2,062,972.00\t3,184,553.00\t509,825.30\t129,046,246.68\t64,718,783.85\t1,258,082.65\t9,728,264.11\t3,311,879.13\t64,658,808.46\t990,529.71\t6,551,732.37\t2,586,091.31\t7,160,434.54\t61,525,178.89\t2,639,521.48\t5,109,052.32\t2,907,035.71\t76,899,322.16\t2,534,464.76\t5,289,534.13\t3,478,809.66
\t\t\t\t2,206,009.00\t(1,304,143.28)\t560,115.52\t122,137.78\t13,116,867.24\t(2,223,241.80)\t1,412,095.04\t(843,535.09)\t4,573,934.26\t(1,427,357.67)\t(736,606.16)\t(30,221.38)\t16,371,931.63\t34,907,251.35\t1,549,072.95\t1,888,158.05\t3,258,574.70\t11,915,609.58\t(1,528,051.18)\t1,769,027.94\t584,180.75\t9,559,019.46\t3,318,425.90\t2,885,501.40\t227,797.41\t1,276,131.60\t8,238,069.44\t10,618,751.78\t153,447.50\t2,156,273.35\t(2,212,444.75)\t(944,382.96)\t(224,618.57)\t(2,132,559.14)\t(213,063.24)\t38,051,346.28\t(37,317,789.75)\t8,152,443.87\t1,043,146.51\t7,519,459.13\t232,609.73\t(1,482,436.55)\t(75,394.73)\t(1,915,993.85)\t(1,006,078.73)\t2,704,673.53\t(1,963,225.83)\t(1,652,840.80)\t(7,281,597.53)\t1,570,231.42\t1,972,031.49\t4,885,731.47\t(1,837,489.31)\t1,511,538.42\t2,446,699.07\t(1,145,504.57)\t7,388,290.10\t(2,624,331.20)\t324,351.23\t2,566,532.72\t(3,803,986.16)\t23,350,118.45\t(26,000,221.10)\t(569,450.94)\t(604,443.75)\t(514,746.59)\t(5,175,194.78)\t(2,023,531.71)\t(3,995,136.46)\t(2,299,937.46)\t2,991,319.39\t499,484.27\t(3,184,058.09)\t987,860.19\t(1,324,818.20)\t4,277,125.05\t(1,547,078.61)\t905,125.37\t1,792,749.54\t(7,868,529.31)\t1,475,071.22\t(2,063,593.42)\t305,295.42\t3,468,379.66\t825,144.19\t(2,992,800.46)\t981,590.52\t(1,619,275.88)\t1,639,232.02\t(243,361.66)\t(12,627,700.53)\t(1,483,611.79)\t(2,570,827.01)\t(484,562.88)`;

const RAW_SUBTRACTIONS_P1 = `\n\n2,710,085.25\t9,973,000.00\t2,400,000.00\t10,912,262.94\t2,519,744.42\t10,304,606.37\t10,170,431.21\t2,519,744.42\t12,422,138.67\t102,400.40\t12,500,000.00\t27,285.57\t13,267,654.64\t32,419.02\t13,411,324.78\t86,775.10\t26,606.79\t11,050,094.06\t26,606.79\t13,695,489.32\t2,444,797.49\t12,246,629.12\t2,400,000.00\t10,739,033.01\t2,475,535.00\t11,875,727.00\t2,440,110.83\t11,620,463.05\t2,454,847.30\t0.00\t12,064,491.90\t2,480,025.63\t11,464,293.78\t2,391,229.15\t11,304,541.63\t0.00\t14,814,424.17\t0.00\t15,085,528.61\t0.00\t0.00\t13,492,431.02\t0.00\t11,298,893.83\t2,436,253.93\t11,397,049.00\t2,377,438.97\t12,250,600.00\t2,500,550.00\t12,350,600.00\t2,414,094.72\t13,000,080.68\t2,463,001.98\t12,533,760.23\t2,459,215.56\t0.00\t15,666,383.00\t120,000.00\t15,753,786.00\t120,000.00\t15,753,786.00\t120,000.00\t17,459,650.00\t50,000.00\t15,214,781.83\t50,000.00\t16,552,286.14\t50,000.00\t2,400,000.00\t15,200,000.00\t2,500,000.00\t15,200,000.00\t2,500,000.00\t15,200,000.00\t2,600,000.00\t14,300,000.00\t2,600,000.00\t9,000,000.00\t10,000,000.00\t50,000.00\t17,600,000.00\t50,000.00\t21,100,000.00\t50,000.00\t20,150,000.00\t50,000.00\t24,000,000.00\t50,000.00\t19,200,000.00\t50,000.00\t2,800,000.00\t18,000,000.00\t3,200,000.00\t20,400,000.00\t3,500,000.00\t17,800,000.00\t3,500,000.00\t17,500,000.00\t3,500,000.00\t18,000,000.00
\t\t\t\t2,432,166.00\t15,065.97\t12,548,354.93\t208,890.97\t13,121,597.42\t49,772.06\t14,132,334.58\t1,662.26\t12,980,042.35\t28,386.05\t14,405,778.46\t14,351.03\t2,373,373.46\t10,669,787.35\t2,528,853.00\t10,878,986.00\t32,334.67\t11,875,727.53\t2,316,138.30\t12,844,108.00\t2,271,461.00\t11,368,110.00\t2,328,951.32\t10,742,162.52\t2,299,862.79\t0.00\t13,912,049.57\t0.00\t13,557,034.75\t0.00\t12,956,383.00\t0.00\t13,878,233.00\t0.00\t14,340,769.92\t0.00\t\t12,026,754.85\t2,437,507.00\t12,351,600.00\t2,602,539.93\t12,142,559.04\t2,413,548.00\t14,506,083.00\t2,372,918.00\t12,409,693.00\t2,290,532.00\t13,006,375.00\t2,320,145.00\t12,771,137.00\t2,233,170.00\t\t15,753,786.00\t43,321.00\t15,150,239.00\t28,768.00\t17,459,650.00\t109,446.70\t15,749,559.30\t31,162.06\t16,447,649.13\t2,945.49\t23,182,980.72\t14,255.91\t2,539,660.52\t15,140,896.30\t2,556,357.00\t14,915,000.00\t2,473,920.00\t18,103,920.94\t2,457,446.43\t15,641,409.54\t2,329,606.01\t11,086,526.24\t3,301,540.43\t567,298.00\t17,023,208.00\t26,555.23\t19,064,353.93\t58,583.36\t20,151,368.22\t266,162.82\t23,456,505.44\t191,560.00\t20,299,007.00\t927,980.40\t3,622,954.01\t17,500,279.80\t3,710,373.24\t17,257,972.15\t3,241,066.78\t18,112,049.11\t3,430,608.76\t17,005,473.04\t4,575,556.71\t21,200,017.78
\t\t\t\t87,578.42\t10,289,540.40\t(2,377,923.72)\t2,310,853.45\t(699,458.75)\t52,628.34\t(1,632,334.58)\t25,623.31\t287,612.29\t4,032.97\t(994,453.68)\t72,424.07\t(2,346,766.67)\t380,306.71\t(2,502,246.21)\t2,816,503.32\t2,412,462.82\t370,901.59\t83,861.70\t(2,105,074.99)\t204,074.00\t507,617.00\t111,159.51\t878,300.53\t154,984.51\t0.00\t(1,847,557.67)\t2,480,025.63\t(2,092,740.97)\t2,391,229.15\t(1,651,841.37)\t0.00\t936,191.17\t0.00\t744,758.69\t0.00\t0.00\t1,465,676.17\t(2,437,507.00)\t(1,052,706.17)\t(166,286.00)\t(745,510.04)\t(36,109.03)\t(2,255,483.00)\t127,632.00\t(59,093.00)\t142,856.98\t(6,294.32)\t142,856.98\t(237,376.77)\t226,045.56\t0.00\t(87,403.00)\t76,679.00\t603,547.00\t91,232.00\t(1,705,864.00)\t10,553.30\t1,710,090.70\t18,837.94\t(1,232,867.30)\t47,054.51\t(6,630,694.58)\t35,744.09\t(139,660.52)\t59,103.70\t(56,357.00)\t285,000.00\t26,080.00\t(2,903,920.94)\t142,553.57\t(1,341,409.54)\t270,393.99\t(2,086,526.24)\t6,698,459.57\t(517,298.00)\t576,792.00\t23,444.77\t2,035,646.07\t(8,583.36)\t(1,368.22)\t(216,162.82)\t543,494.56\t(141,560.00)\t(1,099,007.00)\t(877,980.40)\t(822,954.01)\t499,720.20\t(510,373.24)\t3,142,027.85\t258,933.22\t(312,049.11)\t69,391.24\t494,526.96\t(1,075,556.71)\t(3,200,017.78)
\t277,290.00\t\t275,403.00\t0.00\t275,403.00\t\t\t275,125.41\t\t275,310.47\t\t317,161.15\t\t501,825.63\t\t\t416,323.19\t\t350,846.37\t\t336,203.25\t\t348,077.05\t\t395,519.75\t\t375,994.16\t\t356,562.53\t\t400,249.68\t0.00\t365,861.50\t0.00\t0.00\t362,035.60\t0.00\t0.00\t380,701.78\t\t\t\t\t\t\t\t307,399.99\t0.00\t301,977.34\t0.00\t246,571.45\t0.00\t274,555.24\t0.00\t244,564.16\t0.00\t384,034.67\t0.00\t392,614.00\t0.00\t0.00\t388,324.33\t0.00\t464,382.55\t0.00\t0.00\t458,026.12\t0.00\t0.00\t0.00\t533,212.92\t0.00\t0.00\t0.00\t0.00\t550,000.00\t0.00\t0.00\t\t512,739.53\t\t\t531,984.15\t\t\t\t\t\t\t\t\t\t\t\t455,882.35\t\t\t\t470,588.24
\t\t\t\t0.00\t\t275,125.41\t\t296,158.16\t\t380,199.89\t\t499,118.85\t29,425.01\t369,650.84\t\t\t294,380.42\t\t444,918.00\t\t393,059.98\t\t417,983.90\t\t401,709.63\t\t\t\t\t\t\t\t\t401,220.96\t\t\t\t\t80,000.00\t\t307,399.99\t\t449,749.63\t\t389,721.97\t\t403,217.00\t\t392,416.00\t\t382,209.00\t\t377,479.00\t\t296,069.57\t\t\t297,101.45\t\t540,440.77\t\t362,318.84\t\t471,318.76\t\t\t766,001.15\t\t\t\t525,000.00\t\t\t\t\t\t12,739.53\t\t\t535,632.00\t\t\t607,253.49\t\t\t\t\t\t\t\t\t\t\t\t469,296.81\t\t\t\t469,000.00
\t\t\t\t0.00\t275,403.00\t(275,125.41)\t0.00\t(21,032.75)\t0.00\t(104,889.42)\t0.00\t(181,957.70)\t(29,425.01)\t132,174.80\t0.00\t0.00\t121,942.77\t0.00\t(94,071.63)\t0.00\t(56,856.73)\t0.00\t(69,906.85)\t0.00\t(6,189.88)\t0.00\t375,994.16\t0.00\t356,562.53\t0.00\t400,249.68\t0.00\t365,861.50\t(401,220.96)\t0.00\t362,035.60\t0.00\t0.00\t300,701.78\t0.00\t(307,399.99)\t0.00\t(449,749.63)\t0.00\t(389,721.97)\t0.00\t(95,817.01)\t0.00\t(90,438.66)\t0.00\t(135,637.55)\t0.00\t(102,923.76)\t0.00\t(51,505.41)\t0.00\t384,034.67\t(297,101.45)\t392,614.00\t(540,440.77)\t0.00\t26,005.49\t0.00\t(6,936.21)\t0.00\t0.00\t(307,975.03)\t0.00\t0.00\t0.00\t8,212.92\t0.00\t0.00\t0.00\t0.00\t550,000.00\t(12,739.53)\t0.00\t0.00\t(22,892.47)\t0.00\t0.00\t(75,269.34)\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t(13,414.46)\t0.00\t0.00\t0.00\t1,588.24
\t191,000.00\t200,000.00\t\t0.00\t\t200,000.00\t\t\t\t\t\t\t\t\t\t\t\t\t178,046.30\t\t59,711.80\t\t132,095.34\t\t40,107.30\t\t174,814.85\t\t106,840.97\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t0.00\t162,033.33\t0.00\t0.00\t0.00\t164,253.33\t0.00\t0.00\t0.00\t176,774.44\t0.00\t0.00\t0.00\t0.00\t212,830.00\t0.00\t0.00\t0.00\t0.00\t200,000.00\t0.00\t0.00\t0.00\t200,000.00\t\t\t\t200,000.00
\t\t191,690.00\t\t0.00\t87,127.00\t2,650,717.56\t\t58,813.48\t\t201,099.20\t57,243.14\t66,484.79\t\t4,691.23\t141,349.71\t\t53,837.12\t\t191,250.00\t\t0.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t282,620.00\t\t\t\t\t168,400.00\t\t\t\t126,690.00\t\t\t\t\t191,010.00\t\t\t\t175,060.00\t\t\t\t\t\t\t\t\t212,830.00\t0.00\t\t\t191,590.00\t\t\t\t\t175,320.00\t\t\t\t0.00\t\t\t\t254,540.00\t\t\t\t\t257,330.00\t\t\t\t\t257,330.00
\t\t\t\t0.00\t(87,127.00)\t(2,450,717.56)\t0.00\t(58,813.48)\t0.00\t(201,099.20)\t(57,243.14)\t(66,484.79)\t0.00\t(4,691.23)\t(141,349.71)\t0.00\t(53,837.12)\t0.00\t(13,203.70)\t0.00\t59,711.80\t0.00\t132,095.34\t0.00\t40,107.30\t0.00\t174,814.85\t0.00\t106,840.97\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t(282,620.00)\t0.00\t0.00\t0.00\t0.00\t(168,400.00)\t0.00\t0.00\t0.00\t(126,690.00)\t0.00\t0.00\t0.00\t0.00\t(191,010.00)\t0.00\t0.00\t0.00\t(13,026.67)\t0.00\t0.00\t0.00\t164,253.33\t0.00\t0.00\t0.00\t176,774.44\t(212,830.00)\t0.00\t0.00\t0.00\t21,240.00\t0.00\t0.00\t0.00\t0.00\t24,680.00\t0.00\t0.00\t0.00\t200,000.00\t0.00\t0.00\t0.00\t(54,540.00)\t0.00\t0.00\t0.00\t0.00\t(257,330.00)\t0.00\t0.00\t0.00\t0.00\t(257,330.00)\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t\t\t\t\t\t191,124.41\t\t\t\t\t\t\t\t\t\t30,000.00\t\t182,857.14\t\t0.00\t\t\t187,848.81\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t245,537.27\t\t\t\t\t\t\t\t\t\t\t0.00\t0.00\t281,878.97\t0.00\t0.00\t0.00\t281,878.97\t0.00\t0.00\t0.00\t281,878.97\t0.00\t0.00\t0.00\t0.00\t272,066.20\t0.00\t0.00\t0.00\t269,230.77\t0.00\t0.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t310,232.56\t\t\t\t311,627.91\t\t\t\t\t380,000.00\t\t0.00
\t\t\t\t\t\t\t\t\t\t190,397.09\t\t\t\t181,237.54\t\t\t\t\t191,911.79\t\t\t\t\t\t\t\t225,219.11\t\t\t\t504.28\t\t249,054.57\t\t\t\t262,338.14\t\t\t\t\t\t38,552.50\t\t\t282,000.00\t\t\t281,878.97\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t272,066.20\t\t\t269,230.77\t\t\t\t330,000.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t311,627.91\t\t\t\t\t382,122.26\t\t\t\t312,500.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t(181,237.54)\t\t\t\t\t(9,054.65)\t\t0.00\t\t\t187,848.81\t0.00\t0.00\t(225,219.11)\t0.00\t0.00\t0.00\t(504.28)\t0.00\t(249,054.57)\t0.00\t0.00\t0.00\t(262,338.14)\t0.00\t0.00\t0.00\t245,537.27\t0.00\t(38,552.50)\t0.00\t0.00\t(282,000.00)\t0.00\t0.00\t(281,878.97)\t0.00\t0.00\t0.00\t0.00\t281,878.97\t0.00\t0.00\t0.00\t281,878.97\t0.00\t0.00\t0.00\t281,878.97\t0.00\t(272,066.20)\t0.00\t0.00\t2,835.43\t0.00\t0.00\t0.00\t(60,769.23)\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t(1,395.35)\t0.00\t0.00\t0.00\t311,627.91\t(382,122.26)\t0.00\t0.00\t0.00\t67,500.00\t0.00\t0.00
\t122,000.00\t\t\t1,000,000.00\t947,000.00\t\t960,000.00\t\t1,040,000.00\t\t1,050,000.00\t\t1,050,000.00\t110,000.00\t1,050,000.00\t955,000.00\t870,039.41\t0.00\t988,838.08\t0.00\t960,013.14\t0.00\t109,083.68\t864,095.16\t108,778.24\t893,365.05\t109,083.68\t715,973.92\t108,926.08\t944,441.63\t650,183.28\t864,095.16\t174,000.00\t954,906.11\t0.00\t0.00\t887,730.10\t0.00\t930,904.26\t924,513.49\t0.00\t132,642.03\t0.00\t914,382.62\t583,941.75\t119,642.03\t943,417.33\t1,100,000.00\t1,179,472.44\t127,333.33\t1,007,805.78\t937,568.69\t1,006,122.85\t456,000.00\t1,064,467.03\t842,196.63\t0.00\t1,255,102.04\t0.00\t1,100,000.00\t0.00\t0.00\t0.00\t1,300,000.00\t0.00\t0.00\t1,100,000.00\t0.00\t150,000.00\t1,100,000.00\t0.00\t0.00\t1,100,000.00\t0.00\t0.00\t120,000.00\t1,200,000.00\t120,000.00\t1,200,000.00\t120,000.00\t1,200,000.00\t120,000.00\t1,200,000.00\t1,300,000.00\t0.00\t1,100,000.00\t1,250,000.00\t200,000.00\t1,300,000.00\t250,000.00\t1,200,000.00\t1,300,000.00\t1,300,000.00\t1,500,000.00\t1,435,177.00\t125,274.00\t1,367,554.00\t150,000.00\t1,700,000.00
\t\t947,000.00\t\t1,000,000.00\t\t\t959,071.72\t\t1,040,549.85\t\t947,285.47\t\t978,678.93\t110,000.00\t845,000.00\t110,000.00\t870,039.41\t109,251.04\t800,000.00\t108,000.00\t0.00\t1,016,000.00\t840,000.00\t\t\t\t991,000.00\t935,000.00\t\t\t987,000.00\t\t\t0.00\t1,005,000.00\t\t\t115,000.00\t730,000.00\t135,000.00\t1,265,000.00\t137,000.00\t0.00\t1,350,000.00\t1,245,000.00\t\t130,000.00\t124,000.00\t1,119,000.00\t125,000.00\t0.00\t1,253,000.00\t0.00\t1,230,000.00\t0.00\t1,282,306.11\t0.00\t1,218,734.00\t0.00\t0.00\t1,335,000.00\t\t\t115,000.00\t\t\t1,259,216.18\t124,059.00\t1,202,342.00\t0.00\t124,345.00\t120,193.00\t\t126,432.00\t0.00\t1,159,298.00\t0.00\t1,210,209.00\t0.00\t1,119,366.42\t928,182.12\t0.00\t1,170,000.00\t1,505,116.78\t0.00\t1,299,641.00\t588,795.09\t1,751,923.78\t2,019,296.88\t1,481,614.54\t1,912,866.36\t799,716.94\t3,088,861.95\t772,973.66\t2,943,740.58\t852,961.19\t3,126,304.56\t844,893.91\t1,131,841.33
0.00\t122,000.00\t(947,000.00)\t0.00\t0.00\t947,000.00\t0.00\t928.28\t0.00\t(549.85)\t0.00\t102,714.53\t0.00\t71,321.07\t0.00\t205,000.00\t845,000.00\t0.00\t(109,251.04)\t188,838.08\t(108,000.00)\t960,013.14\t(1,016,000.00)\t(730,916.32)\t864,095.16\t108,778.24\t893,365.05\t(881,916.32)\t(219,026.08)\t108,926.08\t944,441.63\t(336,816.72)\t864,095.16\t174,000.00\t954,906.11\t(1,005,000.00)\t0.00\t887,730.10\t(115,000.00)\t200,904.26\t789,513.49\t(1,265,000.00)\t(4,357.97)\t0.00\t(435,617.38)\t(661,058.25)\t119,642.03\t813,417.33\t976,000.00\t60,472.44\t2,333.33\t1,007,805.78\t(315,431.31)\t1,006,122.85\t(774,000.00)\t1,064,467.03\t(440,109.48)\t0.00\t36,368.04\t0.00\t1,100,000.00\t(1,335,000.00)\t0.00\t0.00\t1,185,000.00\t0.00\t0.00\t(159,216.18)\t(124,059.00)\t(1,052,342.00)\t1,100,000.00\t(124,345.00)\t(120,193.00)\t1,100,000.00\t(126,432.00)\t0.00\t(1,039,298.00)\t1,200,000.00\t(1,090,209.00)\t1,200,000.00\t(999,366.42)\t271,817.88\t120,000.00\t30,000.00\t(205,116.78)\t0.00\t(199,641.00)\t661,204.91\t(1,551,923.78)\t(719,296.88)\t(1,231,614.54)\t(712,866.36)\t500,283.06\t(1,788,861.95)\t727,026.34\t(1,508,563.58)\t(727,687.19)\t(1,758,750.56)\t125,274.00\t568,158.67
5,650,000.00\t4,200,000.00\t10,200,000.00\t12,000,000.00\t10,700,000.00\t1,520,000.00\t1,800,000.00\t3,470,231.86\t3,077,098.32\t7,200,000.00\t2,600,000.00\t3,957,666.67\t2,600,000.00\t7,500,000.00\t4,700,000.00\t4,900,000.00\t2,441,027.35\t7,000,000.00\t7,000,000.00\t3,704,927.92\t4,182,820.59\t4,165,538.46\t8,818,819.70\t4,203,023.29\t4,410,554.17\t3,014,020.72\t8,025,048.42\t3,668,309.31\t4,187,531.53\t3,074,615.98\t7,772,939.90\t5,772,503.11\t4,410,554.17\t3,014,020.72\t6,973,114.17\t7,356,666.67\t5,413,333.33\t4,254,333.33\t6,180,000.00\t1,300,000.00\t7,218,333.33\t6,523,333.33\t5,411,000.00\t11,003,333.33\t7,347,777.78\t4,670,473.01\t4,226,451.35\t8,052,149.17\t8,208,333.33\t7,597,026.08\t7,117,026.08\t10,083,333.33\t4,814,333.33\t7,681,000.00\t5,584,825.81\t11,230,395.67\t7,983,333.33\t6,620,000.00\t3,124,166.67\t4,046,666.67\t10,773,729.00\t6,656,000.00\t6,620,000.00\t4,836,666.67\t10,364,972.00\t8,624,333.33\t5,222,666.67\t4,389,000.00\t10,026,666.67\t7,705,000.00\t4,676,000.00\t3,867,333.33\t6,730,000.00\t10,980,000.00\t8,475,919.00\t8,154,473.00\t3,054,629.00\t8,863,748.43\t6,759,514.86\t5,676,157.62\t5,132,225.65\t5,329,621.25\t11,000,000.00\t2,693,291.46\t7,948,281.89\t7,654,361.01\t7,360,440.13\t7,066,579.25\t6,772,598.37\t6,184,756.61\t5,890,835.73\t7,658,511.74\t7,650,000.00\t7,600,000.00\t7,500,000.00\t7,400,000.00\t7,650,000.00\t7,600,000.00\t7,500,000.00\t7,400,000.00
\t\t\t12,500,000.00\t11,822,215.00\t2,238,667.04\t2,205,713.87\t3,016,799.27\t3,997,825.76\t7,195,883.21\t2,487,443.76\t2,615,945.04\t2,717,808.01\t7,438,360.90\t6,421,626.12\t6,915,717.46\t2,424,254.15\t5,780,981.60\t7,000,000.00\t3,700,000.00\t3,900,000.00\t5,300,000.00\t7,700,000.00\t4,600,000.00\t3,500,000.00\t8,000,000.00\t6,300,000.00\t4,200,000.00\t4,630,000.00\t3,100,000.00\t8,600,000.00\t8,070,000.00\t7,440,000.00\t4,633,000.00\t7,440,000.00\t6,755,000.00\t7,000,000.00\t7,500,000.00\t8,500,000.00\t1,200,000.00\t9,800,000.00\t7,851,078.25\t5,381,314.04\t10,750,000.00\t4,700,000.00\t5,000,000.00\t6,000,000.00\t12,000,000.00\t8,543,000.00\t8,135,000.00\t2,900,000.00\t10,941,187.00\t6,830,000.00\t6,725,000.00\t5,610,000.00\t9,380,000.00\t14,440,000.00\t3,328,000.00\t2,000,000.00\t2,055,000.00\t10,500,000.00\t6,905,000.00\t5,615,000.00\t5,502,000.00\t10,200,000.00\t8,000,000.00\t5,085,000.00\t4,045,000.00\t7,935,000.00\t5,960,000.00\t6,879,000.00\t3,751,500.00\t7,503,000.00\t6,004,230.73\t9,750,000.00\t4,060,000.00\t9,780,000.00\t13,418,325.65\t8,250,000.00\t9,217,000.00\t5,510,000.00\t5,304,000.00\t11,169,000.00\t6,646,000.00\t7,914,000.00\t6,338,706.00\t7,360,000.00\t12,022,103.16\t6,769,000.00\t6,911,122.96\t8,648,636.53\t11,183,636.53\t11,062,611.98\t7,311,636.53\t6,499,469.73\t12,009,000.00\t10,617,944.32\t10,005,000.00\t7,916,438.85\t10,000,500.00
\t\t\t\t(1,122,215.00)\t(718,667.04)\t(405,713.87)\t453,432.59\t(920,727.44)\t4,116.79\t112,556.24\t1,341,721.63\t(117,808.01)\t61,639.10\t(1,721,626.12)\t(2,015,717.46)\t16,773.20\t1,219,018.40\t0.00\t4,927.92\t282,820.59\t(1,134,461.54)\t1,118,819.70\t(396,976.71)\t910,554.17\t(4,985,979.28)\t1,725,048.42\t(531,690.69)\t(442,468.47)\t(25,384.02)\t(827,060.10)\t(2,297,496.89)\t(3,029,445.83)\t(1,618,979.28)\t(466,885.83)\t601,666.67\t(1,586,666.67)\t(3,245,666.67)\t(2,320,000.00)\t100,000.00\t(2,581,666.67)\t(1,327,744.92)\t29,685.96\t253,333.33\t2,647,777.78\t(329,526.99)\t(1,773,548.65)\t(3,947,850.83)\t(334,666.67)\t(537,973.92)\t4,217,026.08\t(857,853.67)\t(2,015,666.67)\t956,000.00\t(25,174.19)\t1,850,395.67\t(6,456,666.67)\t3,292,000.00\t1,124,166.67\t1,991,666.67\t273,729.00\t(249,000.00)\t1,005,000.00\t(665,333.33)\t164,972.00\t624,333.33\t137,666.67\t344,000.00\t2,091,666.67\t1,745,000.00\t(2,203,000.00)\t115,833.33\t(773,000.00)\t4,975,769.27\t(1,274,081.00)\t4,094,473.00\t(6,725,371.00)\t(4,554,577.22)\t(1,490,485.14)\t(3,540,842.38)\t(377,774.35)\t25,621.25\t(169,000.00)\t(3,952,708.54)\t34,281.89\t1,315,655.01\t440.13\t(4,955,523.91)\t3,598.37\t(726,366.35)\t(2,757,800.80)\t(3,525,124.79)\t(3,412,611.98)\t288,363.47\t1,000,530.27\t(4,609,000.00)\t(2,967,944.32)\t(2,405,000.00)\t(416,438.85)\t(2,600,500.00)`;

const RAW_SUBTRACTIONS_P2 = `\n\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t34,435.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t9,000.00
\t\t\t\t\t\t1,000,000.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t2,000,000.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
594,010.81\t641,272.00\t528,766.00\t528,766.00\t588,016.27\t571,705.07\t571,705.07\t571,705.07\t571,705.07\t717,119.85\t644,981.24\t\t788,784.39\t747,215.41\t798,664.46\t836,504.70\t31,067.56\t193,322.61\t678,680.11\t661,058.13\t929,473.16\t634,231.87\t825,976.56\t652,634.57\t772,186.66\t711,681.26\t1,016,960.97\t701,567.94\t892,028.40\t909,377.93\t554,367.24\t\t\t\t\t\t\t\t\t\t\t\t73,878.27\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t876,460.71
\t\t\t\t312,902.00\t984,621.89\t413,263.12\t939,141.50\t873,825.75\t746,092.37\t691,957.24\t1,062,865.36\t835,547.24\t747,215.41\t798,664.46\t877,954.04\t786,412.61\t193,322.61\t1,286,706.53\t467,282.00\t1,106,173.93\t\t\t\t709,258.86\t\t59,366.92\t1,214,257.36\t\t\t\t\t\t\t\t\t\t\t\t\t\t68,542.85\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t\t\t\t\t\t\t\t\t1,023,222.77\t630,195.67
\t\t\t\t275,114.27\t(412,916.82)\t158,441.95\t(367,436.43)\t(302,120.68)\t(28,972.52)\t(46,976.00)\t(1,062,865.36)\t(46,762.85)\t0.00\t0.00\t(41,449.34)\t(755,345.05)\t0.00\t(608,026.42)\t193,776.13\t(176,700.77)\t634,231.87\t825,976.56\t652,634.57\t62,927.80\t711,681.26\t957,594.05\t(512,689.42)\t892,028.40\t909,377.93\t554,367.24\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t(68,542.85)\t73,878.27\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t(1,023,222.77)\t(630,195.67)\t0.00\t0.00\t876,460.71\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t1,170,276.98\t555,312.50\t\t\t1,196,589.06\t\t\t\t1,200,000.00\t\t\t\t1,253,928.89\t722,340.16\t\t\t\t1,269,008.77\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t1,338,442.11\t\t\t15,000.00\t1,350,328.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t\t\t\t\t\t\t\t\t\t\t15,395.00
\t\t\t\t\t\t1,178,783.78\t\t\t80,000.00\t1,210,239.94\t\t102,764.19\t\t\t29,500.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t81,112.04\t\t\t\t\t\t\t450,000.00\t\t\t\t\t\t\t\t\t\t0.00\t375,000.00
\t\t\t\t0.00\t0.00\t17,805.28\t0.00\t0.00\t(80,000.00)\t(10,239.94)\t0.00\t(102,764.19)\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t(375,000.00)\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t21,635,609.72
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t4,800,000.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t4,803,452.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t15,000.00\t\t\t\t\t\t\t\t\t54,000,000.00\t\t\t\t\t\t\t\t\t140,000,000.00\t\t\t\t15,000,000.00\t130,300,000.00\t\t\t(15,000,000.00)\t\t\t0.00\t19,000,000.00
\t\t\t\t\t111,978.42\t10,546.25\t10,245.27\t11,673.74\t319,772.57\t88,311.34\t19,953.43\t163,735.54\t27,571.60\t322,954.95\t8,631.57\t11,292.98\t3,521.07\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0.00\t\t\t\t53,000,000.00\t\t\t\t\t\t\t\t\t0.00\t\t\t\t0.00\t125,000,000.00\t\t\t0.00\t\t\t(15,000,000.00)\t19,000,000.00\t0.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t1,000,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
10,000,000.00\t5,000,000.00\t\t\t\t15,000,000.00\t\t\t\t\t15,000,000.00\t\t\t\t15,000,000.00\t\t\t\t\t\t\t\t\t\t\t\t\t10,000,000.00
\t\t\t\t\t15,000,000.00
\t\t\t\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t15,000,000.00\t0.00\t0.00\t0.00\t15,000,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t10,000,000.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00\t0.00
(18,954,096.06)\t(20,526,562.00)\t(14,690,732.98)\t(36,771,744.44)\t(14,807,760.69)\t(28,618,714.44)\t(14,938,725.34)\t(7,521,681.34)\t(16,346,067.47)\t(9,059,520.25)\t(32,220,291.71)\t(5,034,952.24)\t(16,973,600.18)\t(9,329,634.43)\t(37,775,743.77)\t(7,595,619.96)\t(3,453,701.70)\t(19,529,779.27)\t(7,705,286.90)\t(20,848,214.90)\t(7,557,091.23)\t(18,402,327.63)\t(12,044,796.26)\t(37,819,556.67)\t(8,522,370.98)\t(16,145,834.28)\t(12,375,485.27)\t(27,257,123.22)\t(7,643,333.31)\t(5,391,839.04)\t(21,041,982.32)\t(9,516,873.58)\t(16,738,943.11)\t(5,945,111.37)\t(19,232,561.91)\t(7,356,666.67)\t(20,589,793.10)\t(5,142,063.44)\t(21,265,528.61)\t(2,611,606.05)\t(8,142,846.83)\t(21,354,206.46)\t(5,617,520.30)\t(22,302,227.16)\t(10,713,414.33)\t(18,001,791.76)\t(6,723,532.35)\t(21,553,566.49)\t(11,808,883.33)\t(21,429,075.86)\t(9,658,454.13)\t(24,337,791.24)\t(8,214,904.00)\t(21,495,438.32)\t(8,662,074.71)\t(12,539,426.85)\t(24,491,912.96)\t(7,124,034.67)\t(20,297,308.04)\t(4,574,280.67)\t(27,627,515.00)\t(6,776,000.00)\t(24,644,748.78)\t(4,886,666.67)\t(27,344,136.38)\t(8,674,333.33)\t(30,449,286.14)\t(6,209,856.12)\t(66,426,666.67)\t(23,055,000.00)\t(8,276,000.00)\t(19,600,546.25)\t(9,430,000.00)\t(27,280,000.00)\t(11,075,919.00)\t(22,454,473.00)\t(6,540,024.00)\t(159,940,209.14)\t(16,879,514.86)\t(6,926,157.62)\t(23,564,965.18)\t(21,579,621.25)\t(162,520,000.00)\t(4,475,275.61)\t(29,398,281.89)\t7,295,638.99\t(32,460,440.13)\t(8,366,579.25)\t(26,172,598.37)\t(26,534,756.61)\t(8,940,835.73)\t(26,858,511.74)\t(12,150,000.00)\t(29,300,000.00)\t(12,500,000.00)\t(27,091,059.35)\t(16,075,274.00)\t(26,467,554.00)\t(11,150,000.00)\t(27,570,588.24)
\t\t\t\t(15,567,283.00)\t(18,437,460.32)\t(19,282,504.92)\t(5,134,148.73)\t(18,359,894.31)\t(9,432,070.06)\t(19,191,585.95)\t(4,704,954.70)\t(17,365,500.98)\t(9,249,637.90)\t(22,433,366.06)\t(8,832,503.81)\t(5,705,333.20)\t(17,865,869.58)\t(10,924,810.57)\t(16,482,436.00)\t(5,146,508.60)\t(17,568,787.51)\t(11,032,138.30)\t(18,702,091.90)\t(6,480,719.86)\t(19,769,819.63)\t(8,688,318.24)\t(17,147,419.88)\t(7,864,862.79)\t(3,100,000.00)\t(22,512,049.57)\t(9,057,000.00)\t(20,997,034.75)\t(4,633,000.00)\t(20,797,603.96)\t(7,760,000.00)\t(21,160,853.00)\t(7,500,000.00)\t(22,955,769.92)\t(2,010,000.00)\t(9,935,000.00)\t(21,687,175.94)\t(7,955,821.04)\t(23,551,349.63)\t(8,652,539.93)\t(18,903,971.01)\t(8,413,548.00)\t(27,120,412.04)\t(11,039,918.00)\t(22,056,109.00)\t(5,506,542.00)\t(24,329,771.00)\t(10,403,145.00)\t(19,873,616.00)\t(9,698,230.00)\t(9,676,069.57)\t(31,476,092.11)\t(3,371,321.00)\t(18,666,074.45)\t(2,083,768.00)\t(28,500,090.77)\t(8,349,446.70)\t(21,726,878.14)\t(5,745,992.06)\t(27,233,967.89)\t(8,377,945.49)\t(28,267,980.72)\t(6,276,063.24)\t(63,598,719.52)\t(22,303,238.30)\t(9,435,357.00)\t(19,315,845.00)\t(10,272,433.00)\t(25,131,374.44)\t(12,964,074.10)\t(19,701,409.54)\t(13,268,904.01)\t(24,517,591.42)\t(12,761,749.43)\t(9,784,298.00)\t(24,442,746.42)\t(6,258,737.35)\t(155,233,353.93)\t(8,481,836.85)\t(29,570,485.00)\t(6,862,198.82)\t(32,116,146.44)\t(12,802,458.25)\t(13,819,930.78)\t(28,858,400.24)\t(14,010,535.08)\t(30,596,782.69)\t(15,572,702.16)\t(27,658,470.63)\t(10,513,510.17)\t(33,534,086.50)\t(14,901,514.27)\t(30,136,777.60)\t(13,336,889.47)\t(32,801,359.11)
\t\t\t\t759,522.31\t(10,181,254.12)\t4,343,779.58\t(2,387,532.61)\t2,013,826.84\t372,549.81\t(13,028,705.76)\t(329,997.54)\t391,900.79\t(79,996.52)\t(15,342,377.71)\t1,236,883.86\t2,251,631.50\t(1,663,909.69)\t3,219,523.67\t(4,365,778.90)\t(2,410,582.63)\t(833,540.12)\t(1,012,657.96)\t(19,117,464.77)\t(2,041,651.12)\t3,623,985.35\t(3,687,167.03)\t(10,109,703.34)\t221,529.48\t(2,291,839.04)\t1,470,067.25\t(459,873.58)\t4,258,091.64\t(1,312,111.37)\t1,565,042.05\t403,333.33\t571,059.90\t2,357,936.56\t1,690,241.31\t(601,606.05)\t1,792,153.17\t332,969.47\t2,338,300.74\t1,249,122.47\t1,690,015.65\t5,566,845.55\t(768,965.33)\t627,033.14\t(4,151,912.13)\t(8,020.24)\t2,188,241.00\t(1,621,822.32)\t1,036,155.29\t(2,863,357.29)\t6,984,179.15\t(3,752,713.67)\t(1,631,233.59)\t(2,490,512.67)\t872,575.77\t1,573,446.70\t(2,917,870.64)\t859,325.39\t(110,168.49)\t(296,387.84)\t(2,181,305.42)\t66,207.12\t(2,827,947.15)\t(751,761.70)\t1,159,357.00\t(284,701.25)\t842,433.00\t(2,148,625.56)\t1,888,155.10\t(2,753,063.46)\t6,728,880.01\t(135,422,617.72)\t(4,117,765.43)\t2,858,140.38\t877,781.24\t(15,320,883.90)\t(7,286,646.07)\t4,006,561.24\t172,203.11\t14,157,837.81\t(344,293.69)\t4,435,879.00\t(12,352,667.59)\t2,323,643.63\t5,069,699.35\t3,738,270.95\t3,422,702.16\t(1,641,529.37)\t(1,986,489.83)\t6,443,027.15\t(1,173,759.73)\t3,669,223.60\t2,186,889.47\t5,230,770.87`;

const RAW_ENDING = `43,866,635.97\t29,004,820.70\t16,056,928.48\t34,893,079.10\t56,626,570.39\t28,965,325.29\t29,496,027.20\t23,923,799.68\t23,616,384.26\t57,852,839.80\t32,227,477.33\t28,076,760.27\t20,104,368.37\t58,362,814.54\t25,396,485.95\t23,021,164.24\t38,451,099.32\t61,484,707.49\t26,666,824.31\t40,712,058.28\t30,693,733.47\t21,789,996.26\t61,226,077.11\t28,755,227.39\t16,461,067.32\t25,229,336.90\t62,564,617.24\t40,382,439.96\t33,144,139.72\t36,254,959.30\t29,509,248.57\t79,655,673.74\t54,054,031.39\t46,339,543.94\t26,113,322.28\t63,625,083.38\t1,676,989.78\t58,950,289.15\t14,676,822.78\t85,501,951.86\t15,610,954.60\t16,986,749.41\t37,303,023.03\t24,388,122.48\t66,830,559.17\t57,033,376.82\t46,906,102.11\t24,098,674.17\t60,378,921.01\t43,217,885.92\t32,526,459.73\t17,828,621.81\t67,304,848.23\t52,415,363.70\t43,236,254.60\t39,193,871.45\t(3,519,447.98)\t116,090,257.00\t35,903,194.14\t48,428,440.85\t26,817,229.19\t69,873,530.31\t46,259,459.51\t48,285,070.53\t29,988,014.06\t82,703,080.47\t137,712,396.97\t187,598,702.77\t233,301,121.31\t266,194,138.68\t98,561,435.13\t66,867,849.39\t49,863,609.74\t43,310,543.12\t92,393,445.64\t72,556,920.47\t73,198,379.86\t37,380,697.40\t214,082,537.70\t213,327,794.12\t52,252,672.45\t41,527,138.58\t24,223,894.62\t234,596,628.97\t373,998,371.21\t217,091,360.90\t208,615,933.83\t305,620,626.24\t238,985,804.61\t209,917,446.46\t221,686,943.07\t191,525,240.27\t301,676,483.76\t218,777,486.17\t211,780,042.86\t198,342,276.57\t380,246,135.19\t366,800,359.52\t359,340,751.29\t339,682,339.47
47,784,437.22\t28,247,661.46\t35,430,096.12\t22,698,151.08\t56,017,986.85\t41,039,980.78\t26,536,394.45\t26,087,531.06\t20,292,572.47\t60,603,549.00\t30,893,495.29\t29,191,770.43\t20,514,314.54\t60,786,490.25\t27,912,454.54\t23,855,582.44\t33,497,716.05\t31,564,955.61\t59,672,115.13\t34,992,250.00\t28,276,714.31\t23,131,811.09\t63,562,412.35\t22,713,203.32\t28,838,850.08\t22,294,087.11\t64,476,572.89\t38,403,726.31\t38,983,661.18\t40,551,230.89\t28,517,807.58\t68,814,835.40\t49,912,966.04\t45,345,884.19\t20,931,659.16\t19,548,949.19\t61,750,462.26\t34,209,198.64\t37,971,305.88\t21,134,147.07\t28,475,180.43\t41,455,113.36\t36,690,349.64\t18,996,857.50\t72,201,675.80\t51,255,897.31\t43,698,334.03\t18,516,032.06\t61,883,263.70\t39,789,747.35\t40,423,669.40\t23,164,593.83\t71,214,899.79\t49,561,918.25\t43,333,305.63\t14,972,464.98\t67,841,058.95\t53,369,804.83\t50,549,489.91\t46,659,751.88\t20,245,412.32\t70,508,690.06\t47,308,547.93\t56,923,547.16\t34,165,845.81\t85,051,218.87\t56,022,859.91\t108,733,528.96\t51,609,050.25\t48,291,246.91\t86,048,790.35\t58,631,574.20\t66,251,576.00\t43,166,790.77\t94,349,357.93\t74,941,516.70\t192,173,897.66\t170,433,577.43\t217,203,119.55\t73,957,902.83\t58,319,809.48\t59,244,726.55\t173,447,995.36\t400,345,820.91\t207,935,987.11\t236,289,423.61\t251,391,990.45\t263,862,577.85\t226,432,091.03\t227,216,543.30\t214,216,117.93\t251,319,714.35\t247,057,240.56\t217,531,758.52\t222,769,661.87\t332,049,787.56\t392,217,060.55\t367,772,044.16\t364,258,680.92\t326,829,136.85
3,917,801.25\t(757,159.24)\t19,373,167.64\t(12,194,928.02)\t(608,583.54)\t12,074,655.49\t(2,959,632.75)\t2,163,731.38\t(3,323,811.79)\t2,750,709.20\t(1,333,982.04)\t1,115,010.16\t409,946.17\t2,423,675.72\t2,515,968.59\t834,418.20\t(4,953,383.27)\t(29,919,751.88)\t33,005,290.82\t(5,719,808.28)\t(2,417,019.16)\t1,341,814.83\t2,336,335.24\t(6,042,024.07)\t12,377,782.77\t(2,935,249.79)\t1,911,955.65\t(1,978,713.65)\t5,839,521.46\t4,296,271.59\t(991,440.99)\t(10,840,838.34)\t(4,141,065.35)\t(993,659.75)\t(5,181,663.12)\t(44,076,134.19)\t60,073,472.48\t(24,741,090.51)\t23,294,483.10\t(64,367,804.79)\t12,864,225.83\t24,468,363.95\t(612,673.39)\t(5,391,264.98)\t5,371,116.63\t(5,777,479.51)\t(3,207,768.08)\t(5,582,642.11)\t1,504,342.69\t(3,428,138.57)\t7,897,209.67\t5,335,972.02\t3,910,051.56\t(2,853,445.45)\t97,051.03\t(24,221,406.47)\t71,360,506.93\t(62,720,452.17)\t14,646,295.77\t(1,768,688.97)\t(6,571,816.87)\t635,159.75\t1,049,088.42\t8,638,476.63\t4,177,831.75\t2,348,138.40\t(81,689,537.06)\t(78,865,173.81)\t(181,692,071.06)\t(217,902,891.77)\t(12,512,644.78)\t(8,236,275.19)\t16,387,966.26\t(143,752.35)\t1,955,912.29\t2,384,596.23\t118,975,517.80\t133,052,880.03\t3,120,581.85\t(139,369,891.29)\t6,067,137.03\t17,717,587.97\t149,224,100.74\t165,749,191.94\t(166,062,384.09)\t19,198,062.71\t42,776,056.62\t(41,758,048.39)\t(12,553,713.57)\t17,299,096.84\t(7,470,825.14)\t59,794,474.08\t(54,619,243.19)\t(1,245,727.65)\t10,989,619.01\t133,707,510.99\t11,970,925.36\t971,684.64\t4,917,929.64\t(12,853,202.62)
0.08\t0.03\t0.55\t0.54\t0.01\t0.29\t0.11\t0.08\t0.16\t0.05\t0.04\t0.04\t0.02\t0.04\t0.09\t0.03\t0.15\t0.95\t0.55\t0.16\t0.09\t0.06\t0.04\t0.27\t0.43\t0.13\t0.03\t0.05\t0.15\t0.11\t0.03\t0.16\t0.08\t0.02\t0.25\t2.25\t0.97\t0.72\t0.61\t3.05\t0.45\t0.59\t0.02\t0.28\t0.07\t0.11\t0.07\t0.30\t0.02\t0.09\t0.20\t0.23\t0.05\t0.06\t0.00\t1.62\t1.05\t1.18\t0.29\t0.04\t0.32\t0.01\t0.02\t0.15\t0.12\t0.03\t1.46\t0.73\t3.52\t4.51\t0.15\t0.14\t0.25\t0.00\t0.02\t0.03\t0.62\t0.78\t0.01\t1.88\t0.10\t0.30\t0.86\t0.41\t0.80\t0.08\t0.17\t0.16\t0.06\t0.08\t0.03\t0.24\t0.22\t0.01\t0.05\t0.40\t0.03\t0.00\t0.01\t0.04
0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05\t0.05`;

// ---------------------------------------------------------------------------
// 5. PARSING HELPERS
// ---------------------------------------------------------------------------

function parseNumber(s: string): number | null {
  if (!s || s.trim() === '' || s.trim() === '-') return null;
  let cleaned = s.trim();
  // Handle negative in parentheses: (1,234.56) => -1234.56
  const isNeg = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNeg) cleaned = cleaned.slice(1, -1);
  cleaned = cleaned.replace(/,/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return isNeg ? -num : num;
}

function parseRows(raw: string): string[][] {
  return raw.split('\n').map(line => line.split('\t'));
}

// ---------------------------------------------------------------------------
// 6. MAIN
// ---------------------------------------------------------------------------
function main() {
  const DB_PATH = path.resolve('C:/Users/ming.huey/treasury-payment-portal/treasury.db');
  console.log(`Opening database: ${DB_PATH}`);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const SOURCE = 'corp_forecast_gsheet_historical';
  const NOW = new Date().toISOString();

  // --- Create tables if they don't exist ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS corp_forecast_snapshots (
      account_name TEXT NOT NULL,
      forecast_date TEXT NOT NULL,
      forecast_amount REAL,
      min_balance REAL,
      responsible_person TEXT,
      source TEXT,
      ingested_at TEXT,
      UNIQUE(account_name, forecast_date)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS corp_cashflow_items (
      line_item TEXT NOT NULL,
      category TEXT NOT NULL,
      line_type TEXT NOT NULL,
      flow_date TEXT NOT NULL,
      amount REAL,
      frequency TEXT,
      responsible_person TEXT,
      source TEXT,
      ingested_at TEXT,
      UNIQUE(line_item, category, line_type, flow_date)
    );
  `);

  // --- Prepare upsert statements ---
  const upsertForecast = db.prepare(`
    INSERT INTO corp_forecast_snapshots (account_name, forecast_date, forecast_amount, min_balance, responsible_person, source, ingested_at)
    VALUES (@account_name, @forecast_date, @forecast_amount, @min_balance, @responsible_person, @source, @ingested_at)
    ON CONFLICT(account_name, forecast_date) DO UPDATE SET
      forecast_amount = excluded.forecast_amount,
      min_balance = excluded.min_balance,
      responsible_person = excluded.responsible_person,
      source = excluded.source,
      ingested_at = excluded.ingested_at
  `);

  const upsertCashflow = db.prepare(`
    INSERT INTO corp_cashflow_items (line_item, category, line_type, flow_date, amount, frequency, responsible_person, source, ingested_at)
    VALUES (@line_item, @category, @line_type, @flow_date, @amount, @frequency, @responsible_person, @source, @ingested_at)
    ON CONFLICT(line_item, category, line_type, flow_date) DO UPDATE SET
      amount = excluded.amount,
      frequency = excluded.frequency,
      responsible_person = excluded.responsible_person,
      source = excluded.source,
      ingested_at = excluded.ingested_at
  `);

  let forecastCount = 0;
  let cashflowCount = 0;

  // === FORECAST ACCOUNTS ===
  console.log('Processing forecast account snapshots...');
  const accountRows = parseRows(RAW_FORECAST_ACCOUNTS);
  console.log(`  Parsed ${accountRows.length} account rows`);

  const insertForecasts = db.transaction(() => {
    for (let acctIdx = 0; acctIdx < ACCOUNTS.length; acctIdx++) {
      const acct = ACCOUNTS[acctIdx];
      if (acctIdx >= accountRows.length) {
        console.warn(`  WARNING: No data row for account index ${acctIdx} (${acct.name})`);
        continue;
      }
      const row = accountRows[acctIdx];
      for (let dateIdx = 0; dateIdx < DATES.length; dateIdx++) {
        const val = dateIdx < row.length ? parseNumber(row[dateIdx]) : null;
        if (val === null) continue;
        upsertForecast.run({
          account_name: acct.name,
          forecast_date: DATES[dateIdx],
          forecast_amount: val,
          min_balance: acct.minBalance,
          responsible_person: acct.responsiblePerson,
          source: SOURCE,
          ingested_at: NOW,
        });
        forecastCount++;
      }
    }
  });
  insertForecasts();
  console.log(`  Inserted/updated ${forecastCount} forecast snapshot records`);

  // === CASHFLOW ITEMS ===
  console.log('Processing cashflow items...');

  function processCashflowSection(
    rawData: string,
    metaMap: Record<number, CashflowMeta>,
    sectionName: string,
  ) {
    const rows = parseRows(rawData);
    console.log(`  ${sectionName}: ${rows.length} rows parsed`);
    let sectionCount = 0;
    for (const [offsetStr, meta] of Object.entries(metaMap)) {
      const offset = parseInt(offsetStr);
      if (offset >= rows.length) {
        console.warn(`    WARNING: offset ${offset} out of range for ${sectionName} (${meta.lineItem})`);
        continue;
      }
      const row = rows[offset];
      for (let dateIdx = 0; dateIdx < DATES.length; dateIdx++) {
        const val = dateIdx < row.length ? parseNumber(row[dateIdx]) : null;
        if (val === null) continue;
        upsertCashflow.run({
          line_item: meta.lineItem,
          category: meta.category,
          line_type: meta.lineType,
          flow_date: DATES[dateIdx],
          amount: val,
          frequency: meta.frequency,
          responsible_person: meta.responsiblePerson,
          source: SOURCE,
          ingested_at: NOW,
        });
        sectionCount++;
        cashflowCount++;
      }
    }
    console.log(`    => ${sectionCount} cashflow records from ${sectionName}`);
  }

  const insertCashflows = db.transaction(() => {
    processCashflowSection(RAW_ADDITIONS, ADDITION_ROWS, 'Additions (rows 28-50)');
    processCashflowSection(RAW_SUBTRACTIONS_P1, SUBTRACTION_ROWS_P1, 'Subtractions P1 (rows 51-70)');
    processCashflowSection(RAW_SUBTRACTIONS_P2, SUBTRACTION_ROWS_P2, 'Subtractions P2 (rows 71-106)');
    processCashflowSection(RAW_ENDING, ENDING_ROWS, 'Ending cash (rows 108-112)');
  });
  insertCashflows();
  console.log(`  Inserted/updated ${cashflowCount} total cashflow records`);

  // === SUMMARY ===
  const totalForecast = (db.prepare('SELECT COUNT(*) as cnt FROM corp_forecast_snapshots').get() as any).cnt;
  const totalCashflow = (db.prepare('SELECT COUNT(*) as cnt FROM corp_cashflow_items').get() as any).cnt;

  console.log('\n=== INGESTION COMPLETE ===');
  console.log(`Forecast snapshots inserted/updated this run: ${forecastCount}`);
  console.log(`Cashflow items inserted/updated this run:     ${cashflowCount}`);
  console.log(`Total records now in corp_forecast_snapshots:  ${totalForecast}`);
  console.log(`Total records now in corp_cashflow_items:      ${totalCashflow}`);
  console.log(`Total records written this run:                ${forecastCount + cashflowCount}`);

  db.close();
}

main();
