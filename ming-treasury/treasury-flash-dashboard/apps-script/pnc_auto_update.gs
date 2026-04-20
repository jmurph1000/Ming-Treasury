/**
 * PNC Flash Data Auto-Update for Treasury Flash Dashboard
 *
 * This script:
 *   1. Searches Gmail for the latest "PNC Event: PNC Flash Data" email
 *   2. Finds the *_Balance.csv attachment
 *   3. Parses the CSV and extracts account balance data
 *   4. Writes the parsed data to the "PNC Export" tab in the Treasury Flash sheet
 *   5. Runs daily at ~9:30 AM ET via a time-driven trigger
 *
 * Treasury Flash Sheet ID: 1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE
 * Sender: PINACLE@pnc.com
 * Subject: "PNC Event: PNC Flash Data"
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var CONFIG = {
  SPREADSHEET_ID: '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE',
  SHEET_NAME: 'PNC Export',
  GMAIL_QUERY: 'from:PINACLE@pnc.com subject:"PNC Event: PNC Flash Data"',
  BALANCE_FILE_PATTERN: /_Balance\.csv$/i,
  NOTIFICATION_EMAIL: 'ming.huey@gusto.com',
  // Row 1 is the header; row 2 is a summary row; account data starts at row 3
  DATA_START_ROW: 3,
  // Number of account rows to write (7 PNC accounts)
  NUM_ACCOUNT_ROWS: 7
};

// Column mapping from the CSV to the sheet (0-indexed CSV columns)
// CSV columns: As of Date(0), BankID(1), Account Number(2), Account Name(3),
//              Currency(4), Current Ledger(5), Current Available(6),
//              Opening Ledger(7), Total Credits(8), Total Debits(9),
//              Zero This Day(10), One Day Float(11), 2+ Day Float(12)

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Main entry point. Finds the latest PNC Balance CSV from today's email,
 * parses it, and writes the data to the PNC Export tab.
 */
function updatePNCFlashData() {
  try {
    Logger.log('Starting PNC Flash Data update...');

    // Step 1: Find today's PNC email and get the Balance CSV attachment
    var csvContent = getLatestBalanceCsv_();
    if (!csvContent) {
      Logger.log('No PNC Balance CSV found for today. Exiting.');
      return;
    }

    // Step 2: Parse the CSV into structured account data
    var accountData = parsePncBalanceCsv_(csvContent);
    if (!accountData || accountData.length === 0) {
      throw new Error('Parsed CSV returned no account data.');
    }
    Logger.log('Parsed ' + accountData.length + ' account rows from CSV.');

    // Step 3: Write parsed data to the PNC Export tab
    writeToPncExportTab_(accountData);

    Logger.log('PNC Flash Data update completed successfully.');

  } catch (err) {
    Logger.log('ERROR: ' + err.message);
    sendErrorNotification_(err);
  }
}

// ============================================================================
// GMAIL / ATTACHMENT FUNCTIONS
// ============================================================================

/**
 * Searches Gmail for today's PNC Flash Data email and extracts the
 * *_Balance.csv attachment content as a string.
 *
 * @return {string|null} CSV content, or null if not found.
 */
function getLatestBalanceCsv_() {
  // Build a query scoped to today's date to find only the most recent email.
  // Gmail "after:" uses epoch seconds; we compute midnight ET today.
  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'America/New_York', 'yyyy/MM/dd');
  var query = CONFIG.GMAIL_QUERY + ' after:' + todayStr;

  Logger.log('Gmail search query: ' + query);

  var threads = GmailApp.search(query, 0, 5);
  if (threads.length === 0) {
    Logger.log('No Gmail threads matched the query for today.');
    return null;
  }

  // Iterate through threads (most recent first) looking for the Balance CSV
  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    // Check messages in reverse order (newest first)
    for (var m = messages.length - 1; m >= 0; m--) {
      var attachments = messages[m].getAttachments();
      for (var a = 0; a < attachments.length; a++) {
        var fileName = attachments[a].getName();
        Logger.log('Found attachment: ' + fileName);
        if (CONFIG.BALANCE_FILE_PATTERN.test(fileName)) {
          Logger.log('Matched Balance CSV: ' + fileName);
          return attachments[a].getDataAsString();
        }
      }
    }
  }

  Logger.log('No *_Balance.csv attachment found in today\'s PNC emails.');
  return null;
}

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parses the PNC Balance CSV content into an array of account objects.
 *
 * The CSV has this structure:
 *   As of Date, BankID, Account Number, Account Name, Currency,
 *   Current Ledger, Current Available, Opening Ledger, Total Credits,
 *   Total Debits, Zero This Day, One Day Float, 2+ Day Float
 *
 * @param  {string} csvContent  Raw CSV text
 * @return {Object[]}  Array of account data objects
 */
function parsePncBalanceCsv_(csvContent) {
  var lines = csvContent.split(/\r?\n/);
  var accounts = [];

  // Skip the header row (line 0); process data rows
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var fields = parseCsvLine_(line);
    if (fields.length < 11) continue; // skip malformed rows

    var asOfDate       = fields[0];
    var bankId         = fields[1];
    var accountNumber  = fields[2];
    var accountName    = fields[3].replace(/\t/g, '').trim(); // PNC sometimes includes tabs
    var currency       = fields[4];
    var currentLedger  = fields[5];
    var currentAvail   = fields[6];
    // fields[7] = Opening Ledger (not written to sheet)
    var totalCredits   = fields[8];
    var totalDebits    = fields[9];
    var zeroThisDay    = fields[10];
    var oneDayFloat    = fields.length > 11 ? fields[11] : '';
    // fields[12] = 2+ Day Float (not written to sheet)

    accounts.push({
      asOfDate:         asOfDate,
      bankId:           bankId,
      accountNumber:    accountNumber,
      suffix:           accountNumber.slice(-4),
      accountName:      accountName,
      currency:         currency,
      currentLedger:    parseNumeric_(currentLedger),
      currentAvailable: parseNumeric_(currentAvail),
      zeroThisDay:      parseNumeric_(zeroThisDay),
      oneDayFloat:      parseNumeric_(oneDayFloat),
      totalCredits:     parseNumeric_(totalCredits),
      totalDebits:      parseNumeric_(totalDebits)
    });
  }

  return accounts;
}

/**
 * Parses a single CSV line, respecting quoted fields that may contain commas
 * or tabs. Returns an array of field values.
 *
 * @param  {string} line  A single CSV row
 * @return {string[]}     Array of field values
 */
function parseCsvLine_(line) {
  var fields = [];
  var current = '';
  var inQuotes = false;

  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current); // push last field
  return fields;
}

/**
 * Converts a string that may be empty or contain a numeric value into a number.
 * Returns 0 for empty strings, otherwise the parsed float.
 *
 * @param  {string} val  Raw string value
 * @return {number}      Numeric value
 */
function parseNumeric_(val) {
  if (val === undefined || val === null || val === '') return '';
  var num = parseFloat(val.replace(/,/g, ''));
  return isNaN(num) ? '' : num;
}

// ============================================================================
// SHEET WRITING
// ============================================================================

/**
 * Writes parsed account data to the "PNC Export" tab, overwriting existing
 * account rows (rows 3 onward). Row 1 (header) and row 2 (summary) are
 * left untouched -- the summary row uses sheet formulas.
 *
 * Sheet column layout (A-L):
 *   A: AsOfDate      B: BankId          C: AccountNumber   D: Suffix (last 4)
 *   E: AccountName   F: Currency        G: CurrentLedger   H: CurrentAvailable
 *   I: ZeroThisDay   J: OneDayFloat     K: TotalCredits    L: TotalDebits
 *
 * @param {Object[]} accountData  Array of parsed account objects
 */
function writeToPncExportTab_(accountData) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" not found in spreadsheet.');
  }

  // Define the canonical account order so rows are always written consistently.
  // This matches the current ordering in the PNC Export tab.
  var accountOrder = [
    '1077770446', // Gusto Corporate Cash
    '1077770454', // Customer 3rd Party Debits
    '1077770462', // Customer Drawdowns
    '1077770489', // Customer Wire Ins
    '1077770497', // Customer ACH/OB Wires
    '1086336975', // GUSTO INC (Customer)
    '1087146428'  // GUSTO INC (Corporate)
  ];

  // Build a lookup by account number for quick access
  var accountMap = {};
  for (var i = 0; i < accountData.length; i++) {
    accountMap[accountData[i].accountNumber] = accountData[i];
  }

  // Build the 2D array for the sheet, one row per account in canonical order
  var rows = [];
  for (var j = 0; j < accountOrder.length; j++) {
    var acctNum = accountOrder[j];
    var acct = accountMap[acctNum];
    if (!acct) {
      Logger.log('WARNING: Account ' + acctNum + ' not found in CSV. Writing empty row.');
      rows.push([
        '', '', acctNum, acctNum.slice(-4), '', 'USD',
        '', '', '', '', '', ''
      ]);
      continue;
    }

    // Format the date as M/D/YYYY to match existing sheet format
    var dateParts = acct.asOfDate.split('/');
    var formattedDate = parseInt(dateParts[0], 10) + '/' +
                        parseInt(dateParts[1], 10) + '/' +
                        dateParts[2];

    rows.push([
      formattedDate,
      acct.bankId,
      acct.accountNumber,
      acct.suffix,
      acct.accountName,
      acct.currency,
      acct.currentLedger,
      acct.currentAvailable,
      acct.zeroThisDay,
      acct.oneDayFloat,
      acct.totalCredits,
      acct.totalDebits
    ]);
  }

  // Write account data starting at row 3 (DATA_START_ROW), columns A-L
  var numRows = rows.length;
  var numCols = 12; // A through L
  var range = sheet.getRange(CONFIG.DATA_START_ROW, 1, numRows, numCols);
  range.setValues(rows);

  Logger.log('Wrote ' + numRows + ' account rows to ' + CONFIG.SHEET_NAME +
             ' (rows ' + CONFIG.DATA_START_ROW + '-' +
             (CONFIG.DATA_START_ROW + numRows - 1) + ').');
}

// ============================================================================
// ERROR NOTIFICATION
// ============================================================================

/**
 * Sends an email notification when the script encounters an error.
 *
 * @param {Error} err  The caught error object
 */
function sendErrorNotification_(err) {
  var subject = 'PNC Flash Auto-Update Failed - ' +
                Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
  var body = 'The PNC Flash Data auto-update script encountered an error.\n\n' +
             'Error: ' + err.message + '\n\n' +
             'Stack trace:\n' + (err.stack || 'N/A') + '\n\n' +
             'Time: ' + Utilities.formatDate(new Date(), 'America/New_York',
                                              'yyyy-MM-dd HH:mm:ss z') + '\n\n' +
             'Please check the Apps Script execution log for more details:\n' +
             'https://script.google.com/home/executions';

  try {
    MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
    Logger.log('Error notification email sent to ' + CONFIG.NOTIFICATION_EMAIL);
  } catch (mailErr) {
    Logger.log('Failed to send error notification email: ' + mailErr.message);
  }
}

// ============================================================================
// TRIGGER SETUP
// ============================================================================

/**
 * Creates (or recreates) the daily time-driven trigger to run at ~9:30 AM ET.
 *
 * Run this function ONCE manually from the Apps Script editor to install the
 * trigger. If the trigger already exists, it will be deleted and recreated to
 * avoid duplicates.
 */
function setupDailyTrigger() {
  // Remove any existing triggers for updatePNCFlashData to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'updatePNCFlashData') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('Deleted existing trigger for updatePNCFlashData.');
    }
  }

  // Create a new daily trigger at 9-10 AM ET (Apps Script uses the script's
  // timezone; set the project timezone to America/New_York in appsscript.json).
  // The "atHour(9)" with "nearMinute(30)" targets ~9:30 AM.
  ScriptApp.newTrigger('updatePNCFlashData')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(30)
    .inTimezone('America/New_York')
    .create();

  Logger.log('Daily trigger created: updatePNCFlashData at ~9:30 AM ET.');
}

/**
 * Removes all triggers for updatePNCFlashData. Useful for cleanup.
 */
function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'updatePNCFlashData') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  Logger.log('Removed ' + removed + ' trigger(s) for updatePNCFlashData.');
}

// ============================================================================
// MANUAL TEST HELPER
// ============================================================================

/**
 * Test function to run the update manually and log results.
 * Useful for verifying the script works before enabling the trigger.
 */
function testUpdatePNCFlashData() {
  Logger.log('=== MANUAL TEST RUN ===');
  Logger.log('Current time (ET): ' +
             Utilities.formatDate(new Date(), 'America/New_York',
                                  'yyyy-MM-dd HH:mm:ss'));
  updatePNCFlashData();
  Logger.log('=== TEST COMPLETE ===');
}
