/**
 * Treasury Flash Dashboard - Google Apps Script Web App
 *
 * Serves corporate and gustomer cash data as JSON from the
 * "Corporate Cash" and "Gustomer Cash" tabs of the Treasury Flash sheet.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open the Treasury Flash Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default Code.gs content with this entire file
 * 4. Click Deploy > New deployment
 * 5. Select type: "Web app"
 * 6. Set "Execute as": Me (your email)
 * 7. Set "Who has access": Anyone within Gusto (or anyone with the link)
 * 8. Click Deploy, then copy the Web app URL
 * 9. Paste that URL into dashboard.js as the APPS_SCRIPT_URL value
 *
 * USAGE:
 *   GET <web-app-url>                       -> returns both datasets
 *   GET <web-app-url>?type=corporate        -> corporate only
 *   GET <web-app-url>?type=gustomer         -> gustomer only
 *   GET <web-app-url>?days=15               -> last 15 business days (default: 12)
 */

// ============================================================
// Configuration
// ============================================================

var CONFIG = {
  SPREADSHEET_ID: '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE',
  CORPORATE_TAB: 'Corporate Cash',
  GUSTOMER_TAB: 'Gustomer Cash',
  DEFAULT_DAYS: 12,

  // Row identifiers for subtotal/total rows to SKIP (matched against column B)
  SKIP_LABELS: [
    'Gusto Capital LLC Total',
    'Zenpayroll Inc. Total',
    'Zenpayroll Inc.',
    'SVB Collateral Total',
    'Total'
  ]
};

// ============================================================
// Web App entry point
// ============================================================

function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var type = (params.type || 'all').toLowerCase();
    var days = parseInt(params.days, 10) || CONFIG.DEFAULT_DAYS;

    var result = {};

    if (type === 'all' || type === 'corporate') {
      result.corporate = readMatrixTab_(CONFIG.CORPORATE_TAB, days);
    }
    if (type === 'all' || type === 'gustomer') {
      result.gustomer = readMatrixTab_(CONFIG.GUSTOMER_TAB, days);
    }

    // Include metadata for debugging
    result.generated_at = new Date().toISOString();
    result.days_requested = days;

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: err.message,
        stack: err.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// Core: Read a matrix-format tab and return flat JSON array
// ============================================================

/**
 * Reads data from a matrix-format tab (accounts in rows, dates in columns).
 *
 * Layout expected:
 *   Row 1:    [ignored] [ignored/"Account description"] [date_header_1] [date_header_2] ...
 *   Row 2+:   [id_col]  [account_description]           [value]         [value]         ...
 *
 * Date headers are like "Wed 4/8/2026", "Thu 4/9/2026", etc.
 * Values are currency strings like "1,234.56" or numbers.
 *
 * @param {string} tabName - Name of the sheet tab
 * @param {number} numDays - Number of most-recent business days to include
 * @returns {Array<Object>} - Array of {account_description, reporting_date, value}
 */
function readMatrixTab_(tabName, numDays) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    throw new Error('Sheet tab not found: ' + tabName);
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 3) {
    return [];
  }

  // --- Step 1: Read header row (row 1) to find date columns ---
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  var headerValues = headerRange.getValues()[0];

  // Parse date headers starting from column C (index 2)
  var dateColumns = []; // {colIndex, dateStr (YYYY-MM-DD), rawHeader}
  for (var c = 2; c < headerValues.length; c++) {
    var raw = String(headerValues[c]).trim();
    if (!raw) continue;
    var parsed = parseDateHeader_(raw);
    if (parsed) {
      dateColumns.push({
        colIndex: c,
        dateStr: parsed,
        rawHeader: raw
      });
    }
  }

  if (dateColumns.length === 0) {
    return [];
  }

  // --- Step 2: Take only the last N date columns ---
  // dateColumns are already in left-to-right order (chronological)
  var recentCols = dateColumns.slice(-numDays);

  // --- Step 3: Read account descriptions from column B ---
  var descRange = sheet.getRange(2, 2, lastRow - 1, 1);
  var descValues = descRange.getValues(); // [[desc], [desc], ...]

  // --- Step 4: Read data for the selected columns ---
  // Build column indices we need (0-based in the sheet range)
  var colIndices = recentCols.map(function(dc) { return dc.colIndex; });

  // Read all data rows at once for efficiency
  var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var allData = dataRange.getValues();

  // --- Step 5: Build the flat JSON array ---
  var results = [];

  for (var r = 0; r < allData.length; r++) {
    var desc = String(allData[r][1]).trim(); // column B (index 1)

    // Skip empty descriptions
    if (!desc) continue;

    // Skip subtotal/total rows
    if (isSkipRow_(desc)) continue;

    // For each recent date column, emit a record
    for (var d = 0; d < recentCols.length; d++) {
      var ci = recentCols[d].colIndex;
      var rawVal = allData[r][ci];
      var numVal = parseNumericValue_(rawVal);

      // Only include rows that have actual data (skip if NaN or null)
      if (numVal === null) continue;

      results.push({
        account_description: desc,
        reporting_date: recentCols[d].dateStr,
        value: numVal
      });
    }
  }

  return results;
}

// ============================================================
// Helper: Parse date header like "Wed 4/8/2026" -> "2026-04-08"
// ============================================================

function parseDateHeader_(header) {
  // Expected formats:
  //   "Wed 4/8/2026"
  //   "Thu 12/31/2025"
  //   Could also be a plain date like "4/8/2026" or a Date object

  if (!header) return null;

  // If it's already a Date object (Sheets sometimes returns Date objects)
  if (header instanceof Date && !isNaN(header.getTime())) {
    return formatDateISO_(header);
  }

  var str = String(header).trim();

  // Try to match "DayOfWeek M/D/YYYY"
  var match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    var month = parseInt(match[1], 10);
    var day = parseInt(match[2], 10);
    var year = parseInt(match[3], 10);
    return year + '-' + padZero_(month) + '-' + padZero_(day);
  }

  // Try parsing as a generic date string
  var d = new Date(str);
  if (!isNaN(d.getTime())) {
    return formatDateISO_(d);
  }

  return null;
}

// ============================================================
// Helper: Parse a cell value to a number
// ============================================================

function parseNumericValue_(val) {
  if (val === null || val === undefined || val === '') return null;

  // If already a number
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }

  // String: remove currency symbols, commas, whitespace
  var str = String(val).trim();
  if (!str || str === '-' || str === '#REF!' || str === '#N/A' || str === '#VALUE!') return null;

  // Handle parentheses for negatives: (1,234.56) -> -1234.56
  var negative = false;
  if (str.charAt(0) === '(' && str.charAt(str.length - 1) === ')') {
    negative = true;
    str = str.substring(1, str.length - 1);
  }

  str = str.replace(/[$,\s]/g, '');
  var num = parseFloat(str);
  if (isNaN(num)) return null;

  return negative ? -num : num;
}

// ============================================================
// Helper: Check if a row description is a subtotal/total to skip
// ============================================================

function isSkipRow_(desc) {
  for (var i = 0; i < CONFIG.SKIP_LABELS.length; i++) {
    if (desc === CONFIG.SKIP_LABELS[i]) return true;
  }
  return false;
}

// ============================================================
// Helper: Format Date as ISO date string (YYYY-MM-DD)
// ============================================================

function formatDateISO_(d) {
  return d.getFullYear() + '-' + padZero_(d.getMonth() + 1) + '-' + padZero_(d.getDate());
}

function padZero_(n) {
  return n < 10 ? '0' + n : String(n);
}

// ============================================================
// Testing: Run this function manually to verify output
// ============================================================

function testDoGet() {
  var mockEvent = {
    parameter: { days: '8' }
  };
  var output = doGet(mockEvent);
  var json = JSON.parse(output.getContent());
  Logger.log('Corporate records: ' + (json.corporate ? json.corporate.length : 'N/A'));
  Logger.log('Gustomer records: ' + (json.gustomer ? json.gustomer.length : 'N/A'));
  Logger.log('Generated at: ' + json.generated_at);

  // Log first 5 corporate records as sample
  if (json.corporate && json.corporate.length > 0) {
    Logger.log('Sample corporate records:');
    for (var i = 0; i < Math.min(5, json.corporate.length); i++) {
      Logger.log(JSON.stringify(json.corporate[i]));
    }
  }

  // Log first 5 gustomer records as sample
  if (json.gustomer && json.gustomer.length > 0) {
    Logger.log('Sample gustomer records:');
    for (var i = 0; i < Math.min(5, json.gustomer.length); i++) {
      Logger.log(JSON.stringify(json.gustomer[i]));
    }
  }
}
