/**
 * JPM Flash Data Auto-Update for Treasury Flash Dashboard
 *
 * This script:
 *   1. Searches Gmail for today's JPM Access Scheduled Report emails
 *   2. Gets the XLS attachment (binary BIFF format)
 *   3. Converts it to a temporary Google Sheet via Drive API
 *   4. Reads the data from the converted sheet
 *   5. Writes parsed data to the appropriate "JPM Export" tab in Treasury Flash
 *   6. Cleans up the temporary converted file
 *
 * Two JPM reports arrive daily:
 *   ~10:02 AM ET: Main Gusto report  (~120KB XLS, ~42 accounts)
 *   ~2:23 PM ET:  Guideline report   (~47KB XLS, ~6 Guideline accounts + all others)
 *
 * Reports are distinguished by file size:
 *   >= 80KB  => Gusto report    => writes to "JPM Export (Gusto)"
 *   <  80KB  => Guideline report => writes to "JPM Export (Guideline)"
 *
 * Treasury Flash Sheet ID: 1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE
 * Sender: jpmorganaccessalerts@jpmorgan.com
 * Subject: "Your J.P. Morgan Access Scheduled Report is Complete"
 *
 * PREREQUISITES:
 *   - Enable the Drive API advanced service in the Apps Script editor:
 *     Resources > Advanced Google Services > Drive API > ON
 *   - The script's project timezone should be set to America/New_York
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var JPM_CONFIG = {
  SPREADSHEET_ID: '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE',

  // Target sheet tab names
  GUSTO_SHEET_NAME: 'JPM Export (Gusto)',
  GUIDELINE_SHEET_NAME: 'JPM Export (Guideline)',

  // Gmail search parameters
  GMAIL_QUERY: 'from:jpmorganaccessalerts@jpmorgan.com subject:"Your J.P. Morgan Access Scheduled Report is Complete"',
  ATTACHMENT_PATTERN: /\.xls$/i,

  // File size threshold to distinguish reports (bytes)
  // Gusto report is ~119-128KB; Guideline report is ~46-49KB
  GUSTO_SIZE_THRESHOLD: 80000,

  // Temporary file settings
  TEMP_FOLDER_NAME: '_JPM_TEMP_CONVERSIONS',

  // Notification settings
  NOTIFICATION_EMAIL: 'ming.huey@gusto.com',

  // Data layout: row 1 is header, data starts at row 2
  DATA_START_ROW: 2,

  // Number of columns to write (A through P = 16 columns)
  // A: Account Name, B: Account Number, C: CCY, D: Bank ID, E: Suffix,
  // F: Current Available, G: Opening Balance, H: Current Balance,
  // I: 1 Day, J: 2+ Days, K: Credits, L: Credit Items,
  // M: Debits, N: Debit Items, O: Reported Date, P: Last Updated Date
  NUM_COLUMNS: 16
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Main entry point: processes today's JPM Gusto report.
 * Intended to run at ~10:30 AM ET via time trigger.
 */
function updateJPMGustoData() {
  processJPMReport_('gusto');
}

/**
 * Main entry point: processes today's JPM Guideline report.
 * Intended to run at ~3:00 PM ET via time trigger.
 */
function updateJPMGuidelineData() {
  processJPMReport_('guideline');
}

/**
 * Processes both JPM reports. Useful for manual catch-up runs.
 */
function updateAllJPMData() {
  processJPMReport_('all');
}

/**
 * Core processing function. Finds JPM emails from today, extracts XLS
 * attachments, converts to Google Sheets, reads data, and writes to the
 * appropriate Treasury Flash export tab.
 *
 * @param {string} reportType  'gusto', 'guideline', or 'all'
 */
function processJPMReport_(reportType) {
  try {
    Logger.log('Starting JPM Flash Data update (type: ' + reportType + ')...');

    // Step 1: Find today's JPM emails and extract XLS attachments
    var attachments = getJPMAttachments_();
    if (!attachments || attachments.length === 0) {
      Logger.log('No JPM XLS attachments found for today. Exiting.');
      return;
    }
    Logger.log('Found ' + attachments.length + ' JPM XLS attachment(s).');

    // Step 2: Process each attachment based on report type
    var processed = 0;
    for (var i = 0; i < attachments.length; i++) {
      var att = attachments[i];
      var isGustoReport = att.size >= JPM_CONFIG.GUSTO_SIZE_THRESHOLD;
      var targetType = isGustoReport ? 'gusto' : 'guideline';
      var targetSheet = isGustoReport
        ? JPM_CONFIG.GUSTO_SHEET_NAME
        : JPM_CONFIG.GUIDELINE_SHEET_NAME;

      Logger.log('Attachment: ' + att.name + ' (' + att.size + ' bytes) => ' + targetType);

      // Skip if not the requested report type
      if (reportType !== 'all' && reportType !== targetType) {
        Logger.log('Skipping (not requested type).');
        continue;
      }

      // Step 3: Convert XLS to temporary Google Sheet
      var tempSheetId = convertXlsToGoogleSheet_(att.blob, att.name);
      if (!tempSheetId) {
        throw new Error('Failed to convert XLS attachment: ' + att.name);
      }
      Logger.log('Converted to temporary Google Sheet: ' + tempSheetId);

      try {
        // Step 4: Read data from the converted sheet
        var data = readConvertedSheet_(tempSheetId);
        if (!data || data.length === 0) {
          throw new Error('No data found in converted sheet for: ' + att.name);
        }
        Logger.log('Read ' + data.length + ' data rows from converted sheet.');

        // Step 5: Write data to the target JPM Export tab
        writeToJPMExportTab_(data, targetSheet);
        processed++;

        Logger.log('Successfully updated "' + targetSheet + '" with ' + data.length + ' rows.');
      } finally {
        // Step 6: Clean up temporary file (always, even on error)
        deleteTempFile_(tempSheetId);
      }
    }

    if (processed === 0 && reportType !== 'all') {
      Logger.log('WARNING: No ' + reportType + ' report found among today\'s attachments.');
    }

    Logger.log('JPM Flash Data update completed. Processed ' + processed + ' report(s).');

  } catch (err) {
    Logger.log('ERROR: ' + err.message);
    sendJPMErrorNotification_(err, reportType);
  }
}

// ============================================================================
// GMAIL / ATTACHMENT FUNCTIONS
// ============================================================================

/**
 * Searches Gmail for today's JPM report emails and extracts XLS attachments.
 * Returns an array of attachment objects with name, size, and blob.
 *
 * @return {Object[]|null} Array of {name, size, blob}, or null if none found.
 */
function getJPMAttachments_() {
  // Scope query to today's date in ET
  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'America/New_York', 'yyyy/MM/dd');
  var query = JPM_CONFIG.GMAIL_QUERY + ' after:' + todayStr;

  Logger.log('Gmail search query: ' + query);

  var threads = GmailApp.search(query, 0, 10);
  if (threads.length === 0) {
    Logger.log('No Gmail threads matched the query for today.');
    return null;
  }

  var results = [];
  var seenFiles = {}; // Deduplicate by filename

  // Iterate threads (most recent first)
  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = messages.length - 1; m >= 0; m--) {
      var attachments = messages[m].getAttachments();
      for (var a = 0; a < attachments.length; a++) {
        var fileName = attachments[a].getName();
        if (JPM_CONFIG.ATTACHMENT_PATTERN.test(fileName) && !seenFiles[fileName]) {
          seenFiles[fileName] = true;
          var blob = attachments[a].copyBlob();
          results.push({
            name: fileName,
            size: blob.getBytes().length,
            blob: blob
          });
          Logger.log('Collected attachment: ' + fileName + ' (' + blob.getBytes().length + ' bytes)');
        }
      }
    }
  }

  return results.length > 0 ? results : null;
}

// ============================================================================
// XLS CONVERSION
// ============================================================================

/**
 * Converts an XLS blob to a Google Sheets file using the Drive API.
 * The Advanced Drive Service must be enabled in the Apps Script project.
 *
 * @param  {Blob}   xlsBlob   The XLS file blob
 * @param  {string} fileName  Original file name (for labeling the temp file)
 * @return {string|null}      The Google Sheets file ID, or null on failure
 */
function convertXlsToGoogleSheet_(xlsBlob, fileName) {
  try {
    // Create a new Google Sheets file by uploading the XLS blob with conversion
    var resource = {
      title: '_TEMP_JPM_' + fileName,
      mimeType: 'application/vnd.google-apps.spreadsheet'
    };

    // Use Drive API advanced service to insert with conversion
    var file = Drive.Files.insert(resource, xlsBlob, {
      convert: true,
      ocr: false
    });

    return file.id;

  } catch (err) {
    Logger.log('Error converting XLS to Google Sheet: ' + err.message);
    return null;
  }
}

// ============================================================================
// READING CONVERTED SHEET
// ============================================================================

/**
 * Reads data from the converted Google Sheet. The JPM XLS files have a
 * specific structure with header rows followed by account data rows.
 *
 * Expected XLS structure (based on JPM Access export format):
 *   - Header/metadata rows at the top (variable)
 *   - Column headers row containing: Account Name, Account Number, CCY, etc.
 *   - Account data rows below the header
 *
 * This function auto-detects the header row by scanning for a row containing
 * "Account Name" and "Account Number", then reads all data below it.
 *
 * @param  {string}   sheetId  Google Sheets file ID of the converted XLS
 * @return {Array[]}  2D array of row data (each row is an array of cell values)
 */
function readConvertedSheet_(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets()[0]; // XLS files typically have one sheet

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 5) {
    Logger.log('Converted sheet has too few rows/columns: ' + lastRow + ' x ' + lastCol);
    return [];
  }

  // Read all data from the sheet
  var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // Find the header row by looking for "Account Name" in any cell
  var headerRowIndex = -1;
  var colMapping = null;

  for (var r = 0; r < allData.length; r++) {
    var mapping = detectColumnMapping_(allData[r]);
    if (mapping) {
      headerRowIndex = r;
      colMapping = mapping;
      Logger.log('Found header row at index ' + r + ': ' + JSON.stringify(mapping));
      break;
    }
  }

  if (headerRowIndex === -1) {
    Logger.log('Could not find header row in converted sheet. Dumping first 5 rows:');
    for (var d = 0; d < Math.min(5, allData.length); d++) {
      Logger.log('Row ' + d + ': ' + JSON.stringify(allData[d]));
    }
    throw new Error('Header row with "Account Name" not found in JPM XLS data.');
  }

  // Extract data rows (everything after the header)
  var dataRows = [];
  for (var i = headerRowIndex + 1; i < allData.length; i++) {
    var row = allData[i];

    // Skip empty rows (check if Account Name is empty)
    var accountName = getCellValue_(row, colMapping.accountName);
    if (!accountName || String(accountName).trim() === '') continue;

    // Skip footer/summary rows (JPM sometimes adds totals at the bottom)
    var accountNameStr = String(accountName).trim();
    if (/^(total|grand total|report|generated|page)/i.test(accountNameStr)) continue;

    // Build the output row matching the Treasury Flash export tab format:
    // A: Account Name, B: Account Number, C: CCY, D: Bank ID, E: Suffix,
    // F: Current Available, G: Opening Balance, H: Current Balance,
    // I: 1 Day, J: 2+ Days, K: Credits, L: Credit Items,
    // M: Debits, N: Debit Items, O: Reported Date, P: Last Updated Date

    var accountNumber = String(getCellValue_(row, colMapping.accountNumber) || '');
    var suffix = accountNumber.length >= 4 ? accountNumber.slice(-4) : accountNumber;

    var reportedDate = formatJPMDate_(getCellValue_(row, colMapping.reportedDate));
    var lastUpdatedDate = formatJPMDate_(getCellValue_(row, colMapping.lastUpdatedDate));

    dataRows.push([
      accountNameStr,
      accountNumber,
      getCellValue_(row, colMapping.ccy) || '',
      getCellValue_(row, colMapping.bankId) || '',
      suffix,
      parseJPMNumeric_(getCellValue_(row, colMapping.currentAvailable)),
      parseJPMNumeric_(getCellValue_(row, colMapping.openingBalance)),
      parseJPMNumeric_(getCellValue_(row, colMapping.currentBalance)),
      parseJPMNumeric_(getCellValue_(row, colMapping.oneDay)),
      parseJPMNumeric_(getCellValue_(row, colMapping.twoPlusDays)),
      parseJPMNumeric_(getCellValue_(row, colMapping.credits)),
      parseJPMNumeric_(getCellValue_(row, colMapping.creditItems)),
      parseJPMNumeric_(getCellValue_(row, colMapping.debits)),
      parseJPMNumeric_(getCellValue_(row, colMapping.debitItems)),
      reportedDate,
      lastUpdatedDate
    ]);
  }

  return dataRows;
}

/**
 * Scans a row of header values to detect column indices for each field.
 * Returns a mapping object if the row looks like a valid header, or null otherwise.
 *
 * @param  {Array}  headerRow  Array of cell values from a potential header row
 * @return {Object|null}       Column index mapping, or null if not a header row
 */
function detectColumnMapping_(headerRow) {
  var mapping = {};
  var foundAccountName = false;
  var foundAccountNumber = false;

  for (var c = 0; c < headerRow.length; c++) {
    var val = String(headerRow[c]).trim().toLowerCase();

    if (val === 'account name' || val === 'account description') {
      mapping.accountName = c;
      foundAccountName = true;
    } else if (val === 'account number' || val === 'account no' || val === 'account no.') {
      mapping.accountNumber = c;
      foundAccountNumber = true;
    } else if (val === 'ccy' || val === 'currency' || val === 'curr' || val === 'cur') {
      mapping.ccy = c;
    } else if (val === 'bank id' || val === 'bank code' || val === 'bankid') {
      mapping.bankId = c;
    } else if (val === 'current available' || val === 'available balance' || val === 'curr available' || val === 'avail bal') {
      mapping.currentAvailable = c;
    } else if (val === 'opening balance' || val === 'open balance' || val === 'opening bal' || val === 'open bal') {
      mapping.openingBalance = c;
    } else if (val === 'current balance' || val === 'current ledger' || val === 'curr balance' || val === 'closing balance') {
      mapping.currentBalance = c;
    } else if (val === '1 day' || val === '1 day float' || val === 'one day float' || val === '1day') {
      mapping.oneDay = c;
    } else if (val === '2+ days' || val === '2+ day float' || val === '2+days' || val === '2 day float' || val === '2+ day') {
      mapping.twoPlusDays = c;
    } else if (val === 'credits' || val === 'total credits') {
      mapping.credits = c;
    } else if (val === 'credit items' || val === '# credits' || val === 'no of credits' || val === 'no. of credits') {
      mapping.creditItems = c;
    } else if (val === 'debits' || val === 'total debits') {
      mapping.debits = c;
    } else if (val === 'debit items' || val === '# debits' || val === 'no of debits' || val === 'no. of debits') {
      mapping.debitItems = c;
    } else if (val === 'reported date' || val === 'report date' || val === 'value date' || val === 'as of date') {
      mapping.reportedDate = c;
    } else if (val === 'last updated date' || val === 'last update date' || val === 'updated date' || val === 'last updated') {
      mapping.lastUpdatedDate = c;
    }
  }

  // Must have at least Account Name and Account Number to be a valid header
  if (!foundAccountName || !foundAccountNumber) {
    return null;
  }

  return mapping;
}

/**
 * Safely retrieves a cell value from a row by column index.
 * Returns empty string if the column index is undefined or out of range.
 *
 * @param  {Array}  row       Array of cell values
 * @param  {number} colIndex  Column index
 * @return {*}                Cell value or empty string
 */
function getCellValue_(row, colIndex) {
  if (colIndex === undefined || colIndex === null || colIndex >= row.length) {
    return '';
  }
  return row[colIndex];
}

/**
 * Parses a numeric value from a JPM XLS cell. Handles numbers, strings
 * with commas/currency symbols, and empty values.
 *
 * @param  {*} val  Raw cell value
 * @return {number|string}  Parsed number, or empty string if not numeric
 */
function parseJPMNumeric_(val) {
  if (val === undefined || val === null || val === '') return '';

  // If already a number, return it directly
  if (typeof val === 'number') {
    return isNaN(val) ? '' : val;
  }

  // Convert to string and clean
  var str = String(val).trim();
  if (!str || str === '-' || str === 'N/A') return '';

  // Handle parentheses for negatives: (1,234.56) -> -1234.56
  var negative = false;
  if (str.charAt(0) === '(' && str.charAt(str.length - 1) === ')') {
    negative = true;
    str = str.substring(1, str.length - 1);
  }

  // Remove currency symbols, commas, spaces
  str = str.replace(/[$,\s]/g, '');
  var num = parseFloat(str);
  if (isNaN(num)) return '';

  return negative ? -num : num;
}

/**
 * Formats a date value from JPM XLS into MM/DD/YYYY string format.
 * Handles Date objects, serial date numbers, and string dates.
 *
 * @param  {*} val  Raw date value
 * @return {string}  Formatted date string or empty string
 */
function formatJPMDate_(val) {
  if (!val && val !== 0) return '';

  // If it's already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, 'America/New_York', 'MM/dd/yyyy');
  }

  // If it's a number (Excel serial date)
  if (typeof val === 'number' && val > 1000) {
    // Convert Excel serial date to JS Date
    // Excel serial date epoch is January 1, 1900 (with the Lotus 1-2-3 bug)
    var excelEpoch = new Date(1899, 11, 30);
    var jsDate = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(jsDate.getTime())) {
      return Utilities.formatDate(jsDate, 'America/New_York', 'MM/dd/yyyy');
    }
  }

  // If it's a string, try to parse it
  var str = String(val).trim();
  if (!str) return '';

  // Try direct parse
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, 'America/New_York', 'MM/dd/yyyy');
  }

  // Return as-is if we can't parse it
  return str;
}

// ============================================================================
// SHEET WRITING
// ============================================================================

/**
 * Writes parsed account data to the specified JPM Export tab, overwriting
 * all existing data rows (row 2 onward). Row 1 (header) is left untouched.
 *
 * @param {Array[]}  dataRows    2D array of row data (each row = 16 columns)
 * @param {string}   sheetName   Target sheet tab name
 */
function writeToJPMExportTab_(dataRows, sheetName) {
  var ss = SpreadsheetApp.openById(JPM_CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" not found in spreadsheet.');
  }

  // Clear existing data rows (everything below the header)
  var lastRow = sheet.getLastRow();
  if (lastRow >= JPM_CONFIG.DATA_START_ROW) {
    var lastCol = sheet.getLastColumn();
    // Use max of existing columns and our expected columns
    var clearCols = Math.max(lastCol, JPM_CONFIG.NUM_COLUMNS);
    sheet.getRange(
      JPM_CONFIG.DATA_START_ROW, 1,
      lastRow - JPM_CONFIG.DATA_START_ROW + 1, clearCols
    ).clearContent();
  }

  // Write the new data
  if (dataRows.length > 0) {
    // Ensure each row has exactly NUM_COLUMNS entries
    var normalizedRows = [];
    for (var i = 0; i < dataRows.length; i++) {
      var row = dataRows[i].slice(); // copy
      while (row.length < JPM_CONFIG.NUM_COLUMNS) {
        row.push('');
      }
      // Truncate if somehow longer
      normalizedRows.push(row.slice(0, JPM_CONFIG.NUM_COLUMNS));
    }

    var range = sheet.getRange(
      JPM_CONFIG.DATA_START_ROW, 1,
      normalizedRows.length, JPM_CONFIG.NUM_COLUMNS
    );
    range.setValues(normalizedRows);

    Logger.log('Wrote ' + normalizedRows.length + ' rows to "' + sheetName +
               '" (rows ' + JPM_CONFIG.DATA_START_ROW + '-' +
               (JPM_CONFIG.DATA_START_ROW + normalizedRows.length - 1) + ').');
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Deletes a temporary converted Google Sheet file.
 *
 * @param {string} fileId  Google Drive file ID to delete
 */
function deleteTempFile_(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    Logger.log('Trashed temporary file: ' + fileId);
  } catch (err) {
    Logger.log('WARNING: Failed to trash temporary file ' + fileId + ': ' + err.message);
    // Non-fatal: continue execution
  }
}

// ============================================================================
// ERROR NOTIFICATION
// ============================================================================

/**
 * Sends an email notification when the script encounters an error.
 *
 * @param {Error}  err         The caught error object
 * @param {string} reportType  Which report was being processed
 */
function sendJPMErrorNotification_(err, reportType) {
  var subject = 'JPM Flash Auto-Update Failed (' + reportType + ') - ' +
                Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
  var body = 'The JPM Flash Data auto-update script encountered an error.\n\n' +
             'Report type: ' + reportType + '\n' +
             'Error: ' + err.message + '\n\n' +
             'Stack trace:\n' + (err.stack || 'N/A') + '\n\n' +
             'Time: ' + Utilities.formatDate(new Date(), 'America/New_York',
                                              'yyyy-MM-dd HH:mm:ss z') + '\n\n' +
             'Please check the Apps Script execution log for more details:\n' +
             'https://script.google.com/home/executions';

  try {
    MailApp.sendEmail(JPM_CONFIG.NOTIFICATION_EMAIL, subject, body);
    Logger.log('Error notification email sent to ' + JPM_CONFIG.NOTIFICATION_EMAIL);
  } catch (mailErr) {
    Logger.log('Failed to send error notification email: ' + mailErr.message);
  }
}

// ============================================================================
// TRIGGER SETUP
// ============================================================================

/**
 * Creates (or recreates) daily time-driven triggers for both JPM reports.
 *
 * Run this function ONCE manually from the Apps Script editor to install
 * the triggers. Existing JPM triggers will be deleted first to avoid duplicates.
 *
 * Trigger schedule:
 *   - updateJPMGustoData:     ~10:30 AM ET (after ~10:02 AM email arrival)
 *   - updateJPMGuidelineData: ~3:00 PM ET  (after ~2:23 PM email arrival)
 */
function setupJPMDailyTriggers() {
  // Remove any existing JPM triggers to avoid duplicates
  removeJPMTriggers();

  // Trigger 1: Gusto report at ~10:30 AM ET
  ScriptApp.newTrigger('updateJPMGustoData')
    .timeBased()
    .everyDays(1)
    .atHour(10)
    .nearMinute(30)
    .inTimezone('America/New_York')
    .create();
  Logger.log('Created daily trigger: updateJPMGustoData at ~10:30 AM ET.');

  // Trigger 2: Guideline report at ~3:00 PM ET
  ScriptApp.newTrigger('updateJPMGuidelineData')
    .timeBased()
    .everyDays(1)
    .atHour(15)
    .nearMinute(0)
    .inTimezone('America/New_York')
    .create();
  Logger.log('Created daily trigger: updateJPMGuidelineData at ~3:00 PM ET.');
}

/**
 * Removes all triggers for JPM update functions. Useful for cleanup.
 */
function removeJPMTriggers() {
  var jpmFunctions = ['updateJPMGustoData', 'updateJPMGuidelineData', 'updateAllJPMData'];
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;

  for (var i = 0; i < triggers.length; i++) {
    var handlerName = triggers[i].getHandlerFunction();
    if (jpmFunctions.indexOf(handlerName) !== -1) {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }

  Logger.log('Removed ' + removed + ' JPM trigger(s).');
}

// ============================================================================
// MANUAL TEST / DEBUG HELPERS
// ============================================================================

/**
 * Test function: runs the full Gusto report update and logs results.
 * Useful for verifying the script works before enabling triggers.
 */
function testUpdateJPMGustoData() {
  Logger.log('=== MANUAL TEST: JPM Gusto Report ===');
  Logger.log('Current time (ET): ' +
             Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss'));
  updateJPMGustoData();
  Logger.log('=== TEST COMPLETE ===');
}

/**
 * Test function: runs the full Guideline report update.
 */
function testUpdateJPMGuidelineData() {
  Logger.log('=== MANUAL TEST: JPM Guideline Report ===');
  Logger.log('Current time (ET): ' +
             Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss'));
  updateJPMGuidelineData();
  Logger.log('=== TEST COMPLETE ===');
}

/**
 * Test function: processes all JPM reports found for today.
 */
function testUpdateAllJPMData() {
  Logger.log('=== MANUAL TEST: All JPM Reports ===');
  Logger.log('Current time (ET): ' +
             Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss'));
  updateAllJPMData();
  Logger.log('=== TEST COMPLETE ===');
}

/**
 * Debug function: lists today's JPM attachments without processing them.
 * Useful for troubleshooting email/attachment discovery.
 */
function debugListJPMAttachments() {
  Logger.log('=== DEBUG: Listing JPM Attachments ===');

  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'America/New_York', 'yyyy/MM/dd');
  var query = JPM_CONFIG.GMAIL_QUERY + ' after:' + todayStr;
  Logger.log('Query: ' + query);

  var threads = GmailApp.search(query, 0, 10);
  Logger.log('Found ' + threads.length + ' thread(s).');

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    Logger.log('Thread ' + t + ': ' + messages.length + ' message(s)');
    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      var date = Utilities.formatDate(msg.getDate(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss');
      Logger.log('  Message ' + m + ': date=' + date + ', subject=' + msg.getSubject());
      var attachments = msg.getAttachments();
      for (var a = 0; a < attachments.length; a++) {
        var att = attachments[a];
        Logger.log('    Attachment: ' + att.getName() +
                   ' (' + att.getSize() + ' bytes, type=' + att.getContentType() + ')');
      }
    }
  }

  Logger.log('=== DEBUG COMPLETE ===');
}

/**
 * Debug function: tests the XLS-to-Sheets conversion on the first attachment
 * found today, reads 5 rows, then cleans up. Useful for verifying column
 * mapping logic.
 */
function debugConvertAndReadXLS() {
  Logger.log('=== DEBUG: XLS Conversion Test ===');

  var attachments = getJPMAttachments_();
  if (!attachments || attachments.length === 0) {
    Logger.log('No attachments found.');
    return;
  }

  var att = attachments[0];
  Logger.log('Testing with: ' + att.name + ' (' + att.size + ' bytes)');

  var tempId = convertXlsToGoogleSheet_(att.blob, att.name);
  if (!tempId) {
    Logger.log('Conversion failed.');
    return;
  }

  try {
    var ss = SpreadsheetApp.openById(tempId);
    var sheet = ss.getSheets()[0];
    var lastRow = Math.min(sheet.getLastRow(), 10);
    var lastCol = sheet.getLastColumn();

    Logger.log('Converted sheet: ' + lastRow + ' rows x ' + lastCol + ' cols');

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    for (var r = 0; r < data.length; r++) {
      Logger.log('Row ' + r + ': ' + JSON.stringify(data[r]));
    }
  } finally {
    deleteTempFile_(tempId);
  }

  Logger.log('=== DEBUG COMPLETE ===');
}
