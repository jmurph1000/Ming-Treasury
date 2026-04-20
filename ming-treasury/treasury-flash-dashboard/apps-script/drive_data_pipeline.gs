/**
 * Treasury Flash Dashboard - Drive Data Pipeline
 *
 * Reads JPM and PNC bank files that were saved to Google Drive by the Gmail
 * Attachment Downloader, parses balances, and stores daily snapshots in a
 * dedicated "Treasury Dashboard Data" Google Sheet. Serves the accumulated
 * data as JSON via a doGet() web app endpoint.
 *
 * DATA FLOW:
 *   Gmail Attachment Downloader -> Google Drive (PNC CSVs, JPM XLS files, manifest JSONs)
 *     -> This script reads from Drive, parses, stores in Dashboard Data sheet
 *       -> doGet() serves JSON to the dashboard front-end
 *
 * FILE NAMING CONVENTIONS (saved by the attachment downloader):
 *   PNC Balance CSV:  20260420_150218_1101_20260420_0859AM_Balance.csv
 *   JPM XLS:          20260420_150212_1000_20260420140200876_2557977138.xls
 *   Manifest JSON:    manifest_20260420_150218.json
 *
 * MANIFEST JSON STRUCTURE:
 *   { files: [ { originalName, driveFileId, mimeType, ... }, ... ] }
 *
 * STORAGE:
 *   A dedicated Google Sheet ("Treasury Dashboard Data") with two tabs:
 *     - "corporate_daily": date | account_name | value
 *     - "gustomer_daily":  date | account_name | value
 *   Keeps 252 business days of history (approx 1 year of trading days).
 *
 * DEPLOYMENT:
 *   1. Create a new standalone Apps Script project (or attach to any Sheet)
 *   2. Paste this entire file as Code.gs (or add as a .gs file)
 *   3. Enable the Drive API advanced service:
 *      Resources > Advanced Google Services > Drive API > ON
 *   4. Run setupPipelineTrigger() once to install the daily trigger
 *   5. Deploy as web app:
 *      Deploy > New deployment > Web app
 *      Execute as: Me | Who has access: Anyone (or within Gusto)
 *   6. Copy the web app URL into the dashboard's APPS_SCRIPT_URL config
 *
 * PREREQUISITES:
 *   - Drive API advanced service enabled
 *   - Gmail Attachment Downloader has already saved files to Drive
 *   - Script timezone set to America/New_York
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var PIPELINE_CONFIG = {
  // The dedicated sheet for storing dashboard time-series data.
  // Created automatically on first run if it does not exist.
  DATA_SHEET_NAME: 'Treasury Dashboard Data',
  DATA_SHEET_ID: null, // populated at runtime by getOrCreateDataSheet_()

  // Tab names within the data sheet
  CORPORATE_TAB: 'corporate_daily',
  GUSTOMER_TAB: 'gustomer_daily',

  // Maximum business days of history to retain
  MAX_BUSINESS_DAYS: 252,

  // Drive folder where the attachment downloader saves files.
  // Set to null to search the entire Drive (slower but works without config).
  // If you know the folder ID, set it here for faster lookups.
  ATTACHMENT_FOLDER_ID: null,

  // Manifest file name pattern (the downloader creates these)
  MANIFEST_PATTERN: 'manifest_',

  // File identification patterns
  PNC_BALANCE_PATTERN: /_Balance\.csv$/i,
  JPM_XLS_PATTERN: /\.xls$/i,

  // JPM XLS file size threshold to distinguish Gusto vs Guideline reports
  // Gusto report is ~119-128KB; Guideline report is ~46-49KB
  JPM_GUSTO_SIZE_THRESHOLD: 80000,

  // Notification email on errors
  NOTIFICATION_EMAIL: 'ming.huey@gusto.com',

  // Number of days to serve by default via doGet()
  DEFAULT_SERVE_DAYS: 12,

  // Temp file prefix for JPM XLS conversion
  TEMP_PREFIX: '_TEMP_PIPELINE_JPM_'
};

// ============================================================================
// ACCOUNT MAPPING TABLES
// ============================================================================

/**
 * PNC account number -> { dashboardName, category }
 * category: 'corporate' or 'gustomer'
 */
var PNC_ACCOUNT_MAP = {
  '1077770446': { dashboardName: 'PNC Corporate (Gusto) -0446',            category: 'corporate' },
  '1087146428': { dashboardName: 'PNC Corporate (Gusto) - 6428',           category: 'corporate' },
  '1077770497': { dashboardName: 'PNC Customer ACH/OB Wires (Gusto) -0497', category: 'gustomer' },
  '1077770489': { dashboardName: 'PNC Customer Wire Ins (Gusto) -0489',    category: 'gustomer' },
  '1077770462': { dashboardName: 'PNC Customer Drawdowns -0462',           category: 'gustomer' },
  '1077770454': { dashboardName: 'PNC Customer 3rd Party Debits -0454',    category: 'gustomer' },
  '1086336975': { dashboardName: 'PNC Customer (Gusto) - 6975',            category: 'gustomer' }
};

/**
 * JPM account number -> { dashboardName, category }
 * category: 'corporate' or 'gustomer'
 *
 * The suffix (last 4 digits) is embedded in the dashboard name for reference,
 * but matching is done on the full account number.
 */
var JPM_ACCOUNT_MAP = {
  '503610195':  { dashboardName: 'Chase DDA 0195',                                   category: 'corporate' },
  '503610393':  { dashboardName: 'Chase Flex Pay Revenue Gusto Capital LLC 0393',     category: 'corporate' },
  '677761820':  { dashboardName: 'Chase Guideline Investments, LLC 1820',             category: 'corporate' },
  '677761861':  { dashboardName: 'Chase Guideline NBT LLC 1861',                      category: 'corporate' },
  '677761937':  { dashboardName: 'Chase Guideline RK, LLC 1937',                      category: 'corporate' },
  '677762018':  { dashboardName: 'Chase Guideline Securities LLC 2018',               category: 'corporate' },
  '939839176':  { dashboardName: 'Chase Guideline, Inc. 9176',                        category: 'corporate' },
  '807737908':  { dashboardName: 'Chase Customer Deposits (Gusto) -7908',             category: 'gustomer' },
  '813369795':  { dashboardName: 'Chase Reverse Wire Payrolls (Gusto) -9795',         category: 'gustomer' },
  '813369803':  { dashboardName: 'Chase Recovery Ops (Gusto)-9803',                   category: 'gustomer' },
  '813369811':  { dashboardName: 'Chase Master Gusto 9811',                           category: 'corporate' },
  '813369829':  { dashboardName: 'Chase Wire In (Gusto) -9829',                       category: 'gustomer' },
  '813369837':  { dashboardName: 'Chase Billings Gusto 9837',                         category: 'corporate' },
  '933209329':  { dashboardName: 'Chase Accounts Payable 9329',                       category: 'corporate' },
  '933209378':  { dashboardName: 'Chase Billing/Collection 9378',                     category: 'corporate' },
  '933310226':  { dashboardName: 'Chase Deposit 0226',                                category: 'corporate' },
  '933823962':  { dashboardName: 'Chase Gusto Capital, LLC 3962',                     category: 'corporate' },
  '935238151':  { dashboardName: 'Chase Remote 8151',                                 category: 'corporate' },
  '935238961':  { dashboardName: 'Chase ZP Insurance 8961',                           category: 'corporate' },
  '935250727':  { dashboardName: 'Chase Ardius 0727',                                 category: 'corporate' },
  '957159012':  { dashboardName: 'Chase Ardius 9012',                                 category: 'corporate' },
  '957159178':  { dashboardName: 'Chase Ardius 9178',                                 category: 'corporate' },
  '957159392':  { dashboardName: 'Chase Ardius 9392',                                 category: 'corporate' },
  '957159657':  { dashboardName: 'Chase ZP Insurance 9657',                           category: 'corporate' },
  '957159962':  { dashboardName: 'Chase ZP Insurance 9962',                           category: 'corporate' },
  '957160101':  { dashboardName: 'Chase ZP Insurance 0101',                           category: 'corporate' },
  '957710269':  { dashboardName: 'Chase Tax 0269',                                    category: 'corporate' },
  '957710566':  { dashboardName: 'Chase Internal Payroll 0566',                       category: 'corporate' },
  '957885202':  { dashboardName: 'Chase ZP Insurance 5202',                           category: 'corporate' },
  '685702378':  { dashboardName: 'Chase Test Account 2378',                           category: 'corporate' },
  '593329025':  { dashboardName: 'Chase GEP Partnership 9025',                        category: 'gustomer' },
  '771015119':  { dashboardName: 'Chase 3rd Party Processors - 5119',                 category: 'gustomer' },
  '2907927838': { dashboardName: 'GustoHR, Inc. 7838',                                category: 'corporate' },
  '2907927853': { dashboardName: 'Gusto PEO I, LLC 7853',                             category: 'corporate' },
  '2907927872': { dashboardName: 'Gusto PEO II, LLC 7872',                            category: 'corporate' },
  '2907996375': { dashboardName: 'GustoHR, Inc. 6375',                                category: 'corporate' },
  '2907996385': { dashboardName: 'Gusto PEO I, LLC 6385',                             category: 'corporate' },
  '2907996502': { dashboardName: 'Gusto PEO II, LLC 6502',                            category: 'corporate' },
  '3982958192': { dashboardName: 'JPM Collateral **8192',                              category: 'corporate' },
  '4011741602': { dashboardName: 'Chase Gusto Canada ULC -(CAD) 1602',                category: 'corporate' },
  '4011815665': { dashboardName: 'Gusto Holding Company Inc. (JPM) (CAD) 5665',       category: 'corporate' },
  '77646837':   { dashboardName: 'Chase Mexico (MXN) 6837',                           category: 'corporate' }
};

// ============================================================================
// MAIN PROCESSING FUNCTION (triggered daily)
// ============================================================================

/**
 * Main daily processing function. Finds today's manifest from Drive,
 * reads PNC and JPM files, parses balances, and appends to the data sheet.
 *
 * Intended to run daily at ~11:00 AM ET via time-driven trigger, after
 * the attachment downloader has saved the files.
 */
function processDailyData() {
  try {
    Logger.log('=== processDailyData: Starting ===');
    var startTime = new Date();
    Logger.log('Current time (ET): ' +
               Utilities.formatDate(startTime, 'America/New_York', 'yyyy-MM-dd HH:mm:ss'));

    // Step 1: Find today's manifest file
    var manifest = findTodaysManifest_();
    if (!manifest) {
      Logger.log('No manifest file found for today. Exiting.');
      return;
    }
    Logger.log('Found manifest with ' + manifest.files.length + ' file(s).');

    // Step 2: Identify PNC and JPM files from the manifest
    var pncFileIds = [];
    var jpmFileIds = [];

    for (var i = 0; i < manifest.files.length; i++) {
      var entry = manifest.files[i];
      var name = entry.originalName || entry.fileName || '';
      if (PIPELINE_CONFIG.PNC_BALANCE_PATTERN.test(name)) {
        pncFileIds.push({ id: entry.driveFileId, name: name });
        Logger.log('PNC Balance CSV found: ' + name + ' (ID: ' + entry.driveFileId + ')');
      } else if (PIPELINE_CONFIG.JPM_XLS_PATTERN.test(name)) {
        jpmFileIds.push({ id: entry.driveFileId, name: name });
        Logger.log('JPM XLS found: ' + name + ' (ID: ' + entry.driveFileId + ')');
      }
    }

    if (pncFileIds.length === 0 && jpmFileIds.length === 0) {
      Logger.log('No PNC or JPM files found in manifest. Exiting.');
      return;
    }

    // Step 3: Parse all files and collect records
    var corporateRecords = [];
    var gustomerRecords = [];

    // Process PNC files
    for (var p = 0; p < pncFileIds.length; p++) {
      var pncResult = processPncFile_(pncFileIds[p].id, pncFileIds[p].name);
      corporateRecords = corporateRecords.concat(pncResult.corporate);
      gustomerRecords = gustomerRecords.concat(pncResult.gustomer);
    }

    // Process JPM files
    for (var j = 0; j < jpmFileIds.length; j++) {
      var jpmResult = processJpmFile_(jpmFileIds[j].id, jpmFileIds[j].name);
      corporateRecords = corporateRecords.concat(jpmResult.corporate);
      gustomerRecords = gustomerRecords.concat(jpmResult.gustomer);
    }

    Logger.log('Parsed totals - Corporate: ' + corporateRecords.length +
               ' records, Gustomer: ' + gustomerRecords.length + ' records.');

    // Step 4: Write to the data sheet
    if (corporateRecords.length > 0 || gustomerRecords.length > 0) {
      var dataSheet = getOrCreateDataSheet_();
      if (corporateRecords.length > 0) {
        appendRecordsToTab_(dataSheet, PIPELINE_CONFIG.CORPORATE_TAB, corporateRecords);
      }
      if (gustomerRecords.length > 0) {
        appendRecordsToTab_(dataSheet, PIPELINE_CONFIG.GUSTOMER_TAB, gustomerRecords);
      }
    }

    var elapsed = ((new Date().getTime()) - startTime.getTime()) / 1000;
    Logger.log('=== processDailyData: Complete (' + elapsed.toFixed(1) + 's) ===');

  } catch (err) {
    Logger.log('ERROR in processDailyData: ' + err.message);
    Logger.log('Stack: ' + (err.stack || 'N/A'));
    sendPipelineErrorNotification_(err, 'processDailyData');
  }
}

// ============================================================================
// MANIFEST DISCOVERY
// ============================================================================

/**
 * Searches Google Drive for the most recent manifest JSON file from today.
 * The attachment downloader creates files named "manifest_YYYYMMDD_HHMMSS.json".
 *
 * @return {Object|null} Parsed manifest object, or null if not found.
 */
function findTodaysManifest_() {
  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'America/New_York', 'yyyyMMdd');
  var searchName = PIPELINE_CONFIG.MANIFEST_PATTERN + todayStr;

  Logger.log('Searching Drive for manifest files matching: ' + searchName);

  // Search Drive for files whose name starts with the pattern
  var query = 'title contains "' + searchName + '" and mimeType = "application/json" and trashed = false';

  // If a specific folder is configured, scope the search
  if (PIPELINE_CONFIG.ATTACHMENT_FOLDER_ID) {
    query += ' and "' + PIPELINE_CONFIG.ATTACHMENT_FOLDER_ID + '" in parents';
  }

  var files = DriveApp.searchFiles(query);
  var latestFile = null;
  var latestDate = null;

  while (files.hasNext()) {
    var file = files.next();
    var modified = file.getLastUpdated();
    if (!latestDate || modified > latestDate) {
      latestDate = modified;
      latestFile = file;
    }
  }

  if (!latestFile) {
    // Fallback: search for any manifest modified today
    Logger.log('No exact match. Trying broader search for manifests modified today...');
    var todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    var broadQuery = 'title contains "manifest_" and mimeType = "application/json"' +
                     ' and modifiedDate >= "' + todayStart.toISOString() + '"' +
                     ' and trashed = false';
    var broadFiles = DriveApp.searchFiles(broadQuery);
    while (broadFiles.hasNext()) {
      var bf = broadFiles.next();
      var bfDate = bf.getLastUpdated();
      if (!latestDate || bfDate > latestDate) {
        latestDate = bfDate;
        latestFile = bf;
      }
    }
  }

  if (!latestFile) {
    Logger.log('No manifest file found for today.');
    return null;
  }

  Logger.log('Found manifest: ' + latestFile.getName() + ' (ID: ' + latestFile.getId() + ')');

  // Read and parse the manifest JSON
  var content = latestFile.getBlob().getDataAsString();
  var manifest = JSON.parse(content);

  // Normalize: the manifest might have files at the top level or nested
  if (!manifest.files && Array.isArray(manifest)) {
    manifest = { files: manifest };
  }

  return manifest;
}

// ============================================================================
// PNC FILE PROCESSING
// ============================================================================

/**
 * Reads and parses a PNC Balance CSV from Google Drive.
 *
 * @param  {string} fileId    Google Drive file ID
 * @param  {string} fileName  Original file name (for logging)
 * @return {Object}           { corporate: [...], gustomer: [...] }
 *                            Each entry: { date, account_name, value }
 */
function processPncFile_(fileId, fileName) {
  Logger.log('Processing PNC file: ' + fileName + ' (ID: ' + fileId + ')');

  var file = DriveApp.getFileById(fileId);
  var csvContent = file.getBlob().getDataAsString();

  var lines = csvContent.split(/\r?\n/);
  var corporate = [];
  var gustomer = [];

  // Skip header row (line 0)
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var fields = parseCsvLine_(line);
    if (fields.length < 7) continue; // need at least through Current Available

    var asOfDate      = fields[0].trim();  // "04/20/2026"
    var accountNumber = fields[2].trim();
    var currentLedger = fields[5].trim();

    // Clean account name (PNC sometimes includes tabs)
    var accountName = fields[3].replace(/\t/g, '').replace(/"/g, '').trim();

    // Convert date from MM/DD/YYYY to YYYY-MM-DD for consistency
    var isoDate = convertMMDDYYYYtoISO_(asOfDate);
    if (!isoDate) {
      Logger.log('WARNING: Could not parse date "' + asOfDate + '" on line ' + i);
      continue;
    }

    // Look up the account in our mapping
    var mapping = PNC_ACCOUNT_MAP[accountNumber];
    if (!mapping) {
      Logger.log('WARNING: Unmapped PNC account number: ' + accountNumber +
                 ' (' + accountName + '). Skipping.');
      continue;
    }

    // Parse the balance value (using Current Ledger as the primary balance)
    var value = parseNumericValue_(currentLedger);
    if (value === null) value = 0;

    var record = {
      date: isoDate,
      account_name: mapping.dashboardName,
      value: value
    };

    if (mapping.category === 'corporate') {
      corporate.push(record);
    } else {
      gustomer.push(record);
    }
  }

  Logger.log('PNC parse complete: ' + corporate.length + ' corporate, ' +
             gustomer.length + ' gustomer records.');
  return { corporate: corporate, gustomer: gustomer };
}

// ============================================================================
// JPM FILE PROCESSING
// ============================================================================

/**
 * Reads and parses a JPM XLS file from Google Drive by converting it to a
 * temporary Google Sheet, reading the data, then cleaning up.
 *
 * @param  {string} fileId    Google Drive file ID
 * @param  {string} fileName  Original file name (for logging)
 * @return {Object}           { corporate: [...], gustomer: [...] }
 *                            Each entry: { date, account_name, value }
 */
function processJpmFile_(fileId, fileName) {
  Logger.log('Processing JPM file: ' + fileName + ' (ID: ' + fileId + ')');

  var corporate = [];
  var gustomer = [];

  // Step 1: Get the file blob from Drive
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var fileSize = blob.getBytes().length;
  Logger.log('JPM file size: ' + fileSize + ' bytes');

  // Step 2: Convert XLS to a temporary Google Sheet using Drive API
  var tempSheetId = convertXlsToDriveSheet_(blob, fileName);
  if (!tempSheetId) {
    throw new Error('Failed to convert JPM XLS: ' + fileName);
  }

  try {
    // Step 3: Read the converted sheet
    var ss = SpreadsheetApp.openById(tempSheetId);
    var sheet = ss.getSheets()[0];

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 5) {
      Logger.log('JPM converted sheet too small: ' + lastRow + ' x ' + lastCol);
      return { corporate: [], gustomer: [] };
    }

    var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    // Step 4: Find the header row
    var headerRowIndex = -1;
    var colMapping = null;

    for (var r = 0; r < allData.length; r++) {
      colMapping = detectJpmColumnMapping_(allData[r]);
      if (colMapping) {
        headerRowIndex = r;
        Logger.log('JPM header row found at index ' + r);
        break;
      }
    }

    if (headerRowIndex === -1) {
      Logger.log('ERROR: Could not find header row in JPM XLS. First 5 rows:');
      for (var d = 0; d < Math.min(5, allData.length); d++) {
        Logger.log('Row ' + d + ': ' + JSON.stringify(allData[d]));
      }
      throw new Error('Header row with "Account Name" not found in JPM XLS: ' + fileName);
    }

    // Step 5: Extract data rows and map to dashboard accounts
    for (var i = headerRowIndex + 1; i < allData.length; i++) {
      var row = allData[i];

      var accountName = getJpmCellValue_(row, colMapping.accountName);
      if (!accountName || String(accountName).trim() === '') continue;

      var accountNameStr = String(accountName).trim();
      // Skip footer/summary rows
      if (/^(total|grand total|report|generated|page)/i.test(accountNameStr)) continue;

      var accountNumber = String(getJpmCellValue_(row, colMapping.accountNumber) || '').trim();

      // Get the balance (use Current Balance / Current Ledger as primary)
      var balanceValue = null;
      if (colMapping.currentBalance !== undefined) {
        balanceValue = parseJpmNumeric_(getJpmCellValue_(row, colMapping.currentBalance));
      }
      // Fallback to Current Available if no Current Balance
      if (balanceValue === null && colMapping.currentAvailable !== undefined) {
        balanceValue = parseJpmNumeric_(getJpmCellValue_(row, colMapping.currentAvailable));
      }
      if (balanceValue === null) balanceValue = 0;

      // Get the reported date
      var reportedDateRaw = getJpmCellValue_(row, colMapping.reportedDate);
      var reportedDate = parseJpmDateToISO_(reportedDateRaw);

      // If no reported date found in the data, use today's date
      if (!reportedDate) {
        reportedDate = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
      }

      // Look up the account mapping
      var mapping = JPM_ACCOUNT_MAP[accountNumber];
      if (!mapping) {
        // Try matching by suffix (last 4 digits) as a fallback
        mapping = findJpmMappingBySuffix_(accountNumber);
        if (!mapping) {
          Logger.log('WARNING: Unmapped JPM account: ' + accountNumber +
                     ' (' + accountNameStr + '). Skipping.');
          continue;
        }
      }

      var record = {
        date: reportedDate,
        account_name: mapping.dashboardName,
        value: balanceValue
      };

      if (mapping.category === 'corporate') {
        corporate.push(record);
      } else {
        gustomer.push(record);
      }
    }

  } finally {
    // Step 6: Clean up the temporary converted file
    deleteTempFile_(tempSheetId);
  }

  Logger.log('JPM parse complete: ' + corporate.length + ' corporate, ' +
             gustomer.length + ' gustomer records.');
  return { corporate: corporate, gustomer: gustomer };
}

/**
 * Fallback: try to find a JPM account mapping by suffix (last 4 digits).
 *
 * @param  {string} accountNumber  Full account number string
 * @return {Object|null}           { dashboardName, category } or null
 */
function findJpmMappingBySuffix_(accountNumber) {
  if (!accountNumber || accountNumber.length < 4) return null;
  var suffix = accountNumber.slice(-4);

  var keys = Object.keys(JPM_ACCOUNT_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].slice(-4) === suffix) {
      return JPM_ACCOUNT_MAP[keys[i]];
    }
  }
  return null;
}

// ============================================================================
// JPM XLS CONVERSION (via Drive API)
// ============================================================================

/**
 * Converts a binary XLS blob to a Google Sheets file using the Drive API
 * advanced service. Returns the new file's ID.
 *
 * @param  {Blob}   xlsBlob   Binary XLS blob
 * @param  {string} fileName  Original file name (for temp file labeling)
 * @return {string|null}      Google Sheets file ID, or null on failure
 */
function convertXlsToDriveSheet_(xlsBlob, fileName) {
  try {
    var resource = {
      title: PIPELINE_CONFIG.TEMP_PREFIX + fileName,
      mimeType: 'application/vnd.google-apps.spreadsheet'
    };

    var file = Drive.Files.insert(resource, xlsBlob, {
      convert: true,
      ocr: false
    });

    Logger.log('Converted XLS to Google Sheet: ' + file.id);
    return file.id;

  } catch (err) {
    Logger.log('ERROR converting XLS to Google Sheet: ' + err.message);
    return null;
  }
}

/**
 * Trashes a temporary Google Drive file.
 *
 * @param {string} fileId  Google Drive file ID to trash
 */
function deleteTempFile_(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    Logger.log('Trashed temporary file: ' + fileId);
  } catch (err) {
    Logger.log('WARNING: Failed to trash temp file ' + fileId + ': ' + err.message);
  }
}

// ============================================================================
// JPM COLUMN DETECTION
// ============================================================================

/**
 * Scans a row of header values to detect column indices for JPM XLS fields.
 * Must find at least "Account Name" and "Account Number" to be valid.
 *
 * @param  {Array}  headerRow  Array of cell values from a potential header row
 * @return {Object|null}       Column index mapping, or null if not a header row
 */
function detectJpmColumnMapping_(headerRow) {
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
    } else if (val === 'current available' || val === 'available balance' ||
               val === 'curr available' || val === 'avail bal') {
      mapping.currentAvailable = c;
    } else if (val === 'opening balance' || val === 'open balance' ||
               val === 'opening bal' || val === 'open bal') {
      mapping.openingBalance = c;
    } else if (val === 'current balance' || val === 'current ledger' ||
               val === 'curr balance' || val === 'closing balance') {
      mapping.currentBalance = c;
    } else if (val === '1 day' || val === '1 day float' ||
               val === 'one day float' || val === '1day') {
      mapping.oneDay = c;
    } else if (val === '2+ days' || val === '2+ day float' ||
               val === '2+days' || val === '2 day float' || val === '2+ day') {
      mapping.twoPlusDays = c;
    } else if (val === 'reported date' || val === 'report date' ||
               val === 'value date' || val === 'as of date') {
      mapping.reportedDate = c;
    } else if (val === 'last updated date' || val === 'last update date' ||
               val === 'updated date' || val === 'last updated') {
      mapping.lastUpdatedDate = c;
    }
  }

  if (!foundAccountName || !foundAccountNumber) return null;
  return mapping;
}

/**
 * Safely retrieves a cell value by column index.
 *
 * @param  {Array}  row       Array of cell values
 * @param  {number} colIndex  Column index (may be undefined)
 * @return {*}                Cell value or empty string
 */
function getJpmCellValue_(row, colIndex) {
  if (colIndex === undefined || colIndex === null || colIndex >= row.length) return '';
  return row[colIndex];
}

/**
 * Parses a numeric value from a JPM XLS cell.
 *
 * @param  {*} val  Raw cell value
 * @return {number|null}  Parsed number, or null if not numeric
 */
function parseJpmNumeric_(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  var str = String(val).trim();
  if (!str || str === '-' || str === 'N/A') return null;

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

/**
 * Parses a date value from a JPM XLS cell into ISO format (YYYY-MM-DD).
 * Handles Date objects, Excel serial dates, and various string formats.
 *
 * @param  {*} val  Raw date value
 * @return {string|null}  ISO date string, or null if unparseable
 */
function parseJpmDateToISO_(val) {
  if (!val && val !== 0) return null;

  // Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, 'America/New_York', 'yyyy-MM-dd');
  }

  // Excel serial date number
  if (typeof val === 'number' && val > 1000) {
    var excelEpoch = new Date(1899, 11, 30);
    var jsDate = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(jsDate.getTime())) {
      return Utilities.formatDate(jsDate, 'America/New_York', 'yyyy-MM-dd');
    }
  }

  // String date
  var str = String(val).trim();
  if (!str) return null;

  // Try MM/DD/YYYY
  var match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return match[3] + '-' + padZero_(parseInt(match[1], 10)) +
           '-' + padZero_(parseInt(match[2], 10));
  }

  // Try generic Date parse
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, 'America/New_York', 'yyyy-MM-dd');
  }

  return null;
}

// ============================================================================
// DATA SHEET MANAGEMENT
// ============================================================================

/**
 * Gets or creates the "Treasury Dashboard Data" Google Sheet.
 * Creates two tabs: "corporate_daily" and "gustomer_daily", each with
 * columns: date | account_name | value
 *
 * @return {Spreadsheet} Google Spreadsheet object
 */
function getOrCreateDataSheet_() {
  // If we already have the ID cached from a previous call this run, use it
  if (PIPELINE_CONFIG.DATA_SHEET_ID) {
    try {
      return SpreadsheetApp.openById(PIPELINE_CONFIG.DATA_SHEET_ID);
    } catch (e) {
      Logger.log('Cached DATA_SHEET_ID invalid, searching Drive...');
      PIPELINE_CONFIG.DATA_SHEET_ID = null;
    }
  }

  // Search Drive for existing sheet by name
  var files = DriveApp.searchFiles(
    'title = "' + PIPELINE_CONFIG.DATA_SHEET_NAME + '"' +
    ' and mimeType = "application/vnd.google-apps.spreadsheet"' +
    ' and trashed = false'
  );

  if (files.hasNext()) {
    var existing = files.next();
    PIPELINE_CONFIG.DATA_SHEET_ID = existing.getId();
    Logger.log('Found existing data sheet: ' + PIPELINE_CONFIG.DATA_SHEET_ID);
    var ss = SpreadsheetApp.openById(PIPELINE_CONFIG.DATA_SHEET_ID);

    // Ensure both tabs exist
    ensureTab_(ss, PIPELINE_CONFIG.CORPORATE_TAB);
    ensureTab_(ss, PIPELINE_CONFIG.GUSTOMER_TAB);

    return ss;
  }

  // Create new sheet
  Logger.log('Creating new data sheet: ' + PIPELINE_CONFIG.DATA_SHEET_NAME);
  var ss = SpreadsheetApp.create(PIPELINE_CONFIG.DATA_SHEET_NAME);
  PIPELINE_CONFIG.DATA_SHEET_ID = ss.getId();

  // Rename the default "Sheet1" to the corporate tab
  var defaultSheet = ss.getSheets()[0];
  defaultSheet.setName(PIPELINE_CONFIG.CORPORATE_TAB);
  defaultSheet.getRange(1, 1, 1, 3).setValues([['date', 'account_name', 'value']]);
  defaultSheet.getRange(1, 1, 1, 3).setFontWeight('bold');

  // Create the gustomer tab
  var gustomerSheet = ss.insertSheet(PIPELINE_CONFIG.GUSTOMER_TAB);
  gustomerSheet.getRange(1, 1, 1, 3).setValues([['date', 'account_name', 'value']]);
  gustomerSheet.getRange(1, 1, 1, 3).setFontWeight('bold');

  Logger.log('Created data sheet with ID: ' + PIPELINE_CONFIG.DATA_SHEET_ID);
  return ss;
}

/**
 * Ensures a tab exists in the spreadsheet. If missing, creates it with headers.
 *
 * @param {Spreadsheet} ss       Spreadsheet object
 * @param {string}      tabName  Tab name to ensure
 */
function ensureTab_(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    Logger.log('Creating missing tab: ' + tabName);
    sheet = ss.insertSheet(tabName);
    sheet.getRange(1, 1, 1, 3).setValues([['date', 'account_name', 'value']]);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }
}

/**
 * Appends new records to a tab in the data sheet. If records for today's date
 * already exist, they are replaced (to support re-runs). Then trims to keep
 * only the last MAX_BUSINESS_DAYS worth of unique dates.
 *
 * @param {Spreadsheet} ss       Data spreadsheet
 * @param {string}      tabName  Tab name ("corporate_daily" or "gustomer_daily")
 * @param {Object[]}    records  Array of { date, account_name, value }
 */
function appendRecordsToTab_(ss, tabName, records) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    throw new Error('Tab "' + tabName + '" not found in data sheet.');
  }

  Logger.log('Appending ' + records.length + ' records to "' + tabName + '"...');

  // Read existing data (skip header in row 1)
  var lastRow = sheet.getLastRow();
  var existingData = [];
  if (lastRow >= 2) {
    existingData = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  }

  // Determine which dates are being updated
  var newDates = {};
  for (var i = 0; i < records.length; i++) {
    newDates[records[i].date] = true;
  }

  // Filter out existing rows for dates being replaced
  var keptRows = [];
  for (var j = 0; j < existingData.length; j++) {
    var existingDate = String(existingData[j][0]).trim();
    // Handle Date objects from Sheets
    if (existingData[j][0] instanceof Date) {
      existingDate = Utilities.formatDate(existingData[j][0], 'America/New_York', 'yyyy-MM-dd');
    }
    if (!newDates[existingDate]) {
      keptRows.push(existingData[j]);
    }
  }

  // Append new records
  for (var k = 0; k < records.length; k++) {
    keptRows.push([
      records[k].date,
      records[k].account_name,
      records[k].value
    ]);
  }

  // Sort by date ascending, then by account_name
  keptRows.sort(function(a, b) {
    var dateA = String(a[0]);
    var dateB = String(b[0]);
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    var nameA = String(a[1]);
    var nameB = String(b[1]);
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  // Trim to MAX_BUSINESS_DAYS unique dates (keep most recent)
  keptRows = trimToMaxBusinessDays_(keptRows);

  // Clear existing data and write everything back
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  }

  if (keptRows.length > 0) {
    sheet.getRange(2, 1, keptRows.length, 3).setValues(keptRows);
  }

  Logger.log('Wrote ' + keptRows.length + ' total rows to "' + tabName + '".');
}

/**
 * Trims a sorted array of [date, account_name, value] rows to keep only
 * the last MAX_BUSINESS_DAYS unique dates.
 *
 * @param  {Array[]} rows  Sorted 2D array
 * @return {Array[]}       Trimmed 2D array
 */
function trimToMaxBusinessDays_(rows) {
  if (rows.length === 0) return rows;

  // Collect unique dates
  var uniqueDates = [];
  var seenDates = {};
  for (var i = 0; i < rows.length; i++) {
    var d = String(rows[i][0]);
    if (!seenDates[d]) {
      seenDates[d] = true;
      uniqueDates.push(d);
    }
  }

  // If within limits, return as-is
  if (uniqueDates.length <= PIPELINE_CONFIG.MAX_BUSINESS_DAYS) {
    return rows;
  }

  // Keep only the most recent MAX_BUSINESS_DAYS dates
  uniqueDates.sort();
  var cutoffIndex = uniqueDates.length - PIPELINE_CONFIG.MAX_BUSINESS_DAYS;
  var cutoffDate = uniqueDates[cutoffIndex];

  Logger.log('Trimming data: keeping dates from ' + cutoffDate + ' onward (' +
             PIPELINE_CONFIG.MAX_BUSINESS_DAYS + ' unique dates).');

  var trimmed = [];
  for (var j = 0; j < rows.length; j++) {
    if (String(rows[j][0]) >= cutoffDate) {
      trimmed.push(rows[j]);
    }
  }

  return trimmed;
}

// ============================================================================
// WEB APP: doGet() - Serve data as JSON
// ============================================================================

/**
 * Web app entry point. Reads from the "Treasury Dashboard Data" sheet
 * and serves JSON in the format expected by the dashboard:
 *   {
 *     corporate: [ { account_description, reporting_date, value }, ... ],
 *     gustomer:  [ { account_description, reporting_date, value }, ... ],
 *     generated_at: "...",
 *     days_requested: N
 *   }
 *
 * Query parameters:
 *   ?type=corporate|gustomer|all  (default: all)
 *   ?days=N                       (default: 12)
 *
 * @param  {Object} e  Event object with URL parameters
 * @return {TextOutput} JSON response
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var type = (params.type || 'all').toLowerCase();
    var days = parseInt(params.days, 10) || PIPELINE_CONFIG.DEFAULT_SERVE_DAYS;

    var result = {};

    var dataSheet = getOrCreateDataSheet_();

    if (type === 'all' || type === 'corporate') {
      result.corporate = readTabAsJson_(dataSheet, PIPELINE_CONFIG.CORPORATE_TAB, days);
    }

    if (type === 'all' || type === 'gustomer') {
      result.gustomer = readTabAsJson_(dataSheet, PIPELINE_CONFIG.GUSTOMER_TAB, days);
    }

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

/**
 * Reads a tab from the data sheet and returns records for the last N
 * unique dates, formatted for the dashboard.
 *
 * @param  {Spreadsheet} ss       Data spreadsheet
 * @param  {string}      tabName  Tab name
 * @param  {number}      numDays  Number of most-recent unique dates to include
 * @return {Object[]}    Array of { account_description, reporting_date, value }
 */
function readTabAsJson_(ss, tabName, numDays) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

  // Collect all unique dates
  var uniqueDates = [];
  var seenDates = {};
  for (var i = 0; i < data.length; i++) {
    var dateVal = data[i][0];
    var dateStr;
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, 'America/New_York', 'yyyy-MM-dd');
    } else {
      dateStr = String(dateVal).trim();
    }
    data[i][0] = dateStr; // normalize in-place
    if (!seenDates[dateStr]) {
      seenDates[dateStr] = true;
      uniqueDates.push(dateStr);
    }
  }

  // Sort dates and take the last N
  uniqueDates.sort();
  var recentDates = {};
  var startIdx = Math.max(0, uniqueDates.length - numDays);
  for (var d = startIdx; d < uniqueDates.length; d++) {
    recentDates[uniqueDates[d]] = true;
  }

  // Build the result array
  var results = [];
  for (var j = 0; j < data.length; j++) {
    var rowDate = data[j][0];
    if (!recentDates[rowDate]) continue;

    var val = data[j][2];
    if (typeof val === 'string') {
      val = parseFloat(val.replace(/,/g, ''));
    }
    if (val === null || val === undefined || isNaN(val)) continue;

    results.push({
      account_description: String(data[j][1]).trim(),
      reporting_date: rowDate,
      value: val
    });
  }

  return results;
}

// ============================================================================
// SHARED PARSING UTILITIES
// ============================================================================

/**
 * Parses a single CSV line respecting quoted fields (commas within quotes).
 *
 * @param  {string}   line  A single CSV row
 * @return {string[]}       Array of field values
 */
function parseCsvLine_(line) {
  var fields = [];
  var current = '';
  var inQuotes = false;

  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
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
  fields.push(current);
  return fields;
}

/**
 * Converts MM/DD/YYYY date string to YYYY-MM-DD ISO format.
 *
 * @param  {string} dateStr  Date in MM/DD/YYYY format
 * @return {string|null}     Date in YYYY-MM-DD format, or null if invalid
 */
function convertMMDDYYYYtoISO_(dateStr) {
  if (!dateStr) return null;
  var match = String(dateStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  var month = parseInt(match[1], 10);
  var day = parseInt(match[2], 10);
  var year = parseInt(match[3], 10);
  return year + '-' + padZero_(month) + '-' + padZero_(day);
}

/**
 * Parses a cell value to a number, returning null for non-numeric values.
 *
 * @param  {*} val  Raw cell value
 * @return {number|null}
 */
function parseNumericValue_(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  var str = String(val).trim();
  if (!str || str === '-') return null;

  // Handle parenthesized negatives
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

/**
 * Zero-pads a number to 2 digits.
 *
 * @param  {number} n
 * @return {string}
 */
function padZero_(n) {
  return n < 10 ? '0' + n : String(n);
}

// ============================================================================
// ERROR NOTIFICATION
// ============================================================================

/**
 * Sends an error notification email when the pipeline encounters a failure.
 *
 * @param {Error}  err           The caught error object
 * @param {string} functionName  Name of the function that failed
 */
function sendPipelineErrorNotification_(err, functionName) {
  var subject = 'Treasury Dashboard Pipeline Failed (' + functionName + ') - ' +
                Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');

  var body = 'The Treasury Dashboard Drive Data Pipeline encountered an error.\n\n' +
             'Function: ' + functionName + '\n' +
             'Error: ' + err.message + '\n\n' +
             'Stack trace:\n' + (err.stack || 'N/A') + '\n\n' +
             'Time: ' + Utilities.formatDate(new Date(), 'America/New_York',
                                              'yyyy-MM-dd HH:mm:ss z') + '\n\n' +
             'Please check the Apps Script execution log for details:\n' +
             'https://script.google.com/home/executions';

  try {
    MailApp.sendEmail(PIPELINE_CONFIG.NOTIFICATION_EMAIL, subject, body);
    Logger.log('Error notification sent to ' + PIPELINE_CONFIG.NOTIFICATION_EMAIL);
  } catch (mailErr) {
    Logger.log('Failed to send error notification: ' + mailErr.message);
  }
}

// ============================================================================
// TRIGGER SETUP
// ============================================================================

/**
 * Creates (or recreates) the daily time-driven trigger for processDailyData().
 * Runs at ~11:00 AM ET, after the attachment downloader has saved files.
 *
 * Run this function ONCE manually from the Apps Script editor to install
 * the trigger. Existing pipeline triggers are removed first.
 */
function setupPipelineTrigger() {
  removePipelineTriggers();

  ScriptApp.newTrigger('processDailyData')
    .timeBased()
    .everyDays(1)
    .atHour(11)
    .nearMinute(0)
    .inTimezone('America/New_York')
    .create();

  Logger.log('Created daily trigger: processDailyData at ~11:00 AM ET.');
}

/**
 * Removes all triggers for pipeline functions to avoid duplicates.
 */
function removePipelineTriggers() {
  var pipelineFunctions = ['processDailyData'];
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;

  for (var i = 0; i < triggers.length; i++) {
    if (pipelineFunctions.indexOf(triggers[i].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }

  Logger.log('Removed ' + removed + ' pipeline trigger(s).');
}

// ============================================================================
// TESTING / DEBUGGING
// ============================================================================

/**
 * Test function: runs the full daily processing pipeline manually.
 * Useful for verifying the script works before enabling the trigger.
 */
function testProcessDailyData() {
  Logger.log('========================================');
  Logger.log('=== MANUAL TEST: processDailyData ===');
  Logger.log('========================================');
  Logger.log('Current time (ET): ' +
             Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss'));
  Logger.log('');

  processDailyData();

  Logger.log('');
  Logger.log('========================================');
  Logger.log('=== TEST COMPLETE ===');
  Logger.log('========================================');
}

/**
 * Test function: tests the doGet() web app endpoint locally.
 * Logs sample output for both corporate and gustomer data.
 */
function testDoGet() {
  Logger.log('=== MANUAL TEST: doGet ===');

  var mockEvent = {
    parameter: { days: '5' }
  };

  var output = doGet(mockEvent);
  var json = JSON.parse(output.getContent());

  Logger.log('Generated at: ' + json.generated_at);
  Logger.log('Days requested: ' + json.days_requested);
  Logger.log('Corporate records: ' + (json.corporate ? json.corporate.length : 'N/A'));
  Logger.log('Gustomer records: ' + (json.gustomer ? json.gustomer.length : 'N/A'));

  if (json.corporate && json.corporate.length > 0) {
    Logger.log('Sample corporate records (first 5):');
    for (var i = 0; i < Math.min(5, json.corporate.length); i++) {
      Logger.log('  ' + JSON.stringify(json.corporate[i]));
    }
  }

  if (json.gustomer && json.gustomer.length > 0) {
    Logger.log('Sample gustomer records (first 5):');
    for (var i = 0; i < Math.min(5, json.gustomer.length); i++) {
      Logger.log('  ' + JSON.stringify(json.gustomer[i]));
    }
  }

  Logger.log('=== TEST COMPLETE ===');
}

/**
 * Debug function: searches for today's manifest and logs its contents
 * without processing any files. Useful for troubleshooting file discovery.
 */
function debugFindManifest() {
  Logger.log('=== DEBUG: Find Today\'s Manifest ===');

  var manifest = findTodaysManifest_();
  if (!manifest) {
    Logger.log('No manifest found for today.');
    return;
  }

  Logger.log('Manifest has ' + manifest.files.length + ' file entries:');
  for (var i = 0; i < manifest.files.length; i++) {
    var entry = manifest.files[i];
    Logger.log('  [' + i + '] ' + (entry.originalName || entry.fileName) +
               ' -> driveFileId: ' + entry.driveFileId +
               ' (mime: ' + (entry.mimeType || 'unknown') + ')');
  }

  // Identify PNC and JPM files
  var pncCount = 0;
  var jpmCount = 0;
  for (var j = 0; j < manifest.files.length; j++) {
    var name = manifest.files[j].originalName || manifest.files[j].fileName || '';
    if (PIPELINE_CONFIG.PNC_BALANCE_PATTERN.test(name)) pncCount++;
    if (PIPELINE_CONFIG.JPM_XLS_PATTERN.test(name)) jpmCount++;
  }

  Logger.log('Summary: ' + pncCount + ' PNC Balance CSV(s), ' + jpmCount + ' JPM XLS file(s).');
  Logger.log('=== DEBUG COMPLETE ===');
}

/**
 * Debug function: reads the data sheet and reports statistics.
 */
function debugDataSheetStats() {
  Logger.log('=== DEBUG: Data Sheet Statistics ===');

  var ss = getOrCreateDataSheet_();
  Logger.log('Data sheet ID: ' + ss.getId());
  Logger.log('Data sheet URL: ' + ss.getUrl());

  var tabs = [PIPELINE_CONFIG.CORPORATE_TAB, PIPELINE_CONFIG.GUSTOMER_TAB];
  for (var t = 0; t < tabs.length; t++) {
    var sheet = ss.getSheetByName(tabs[t]);
    if (!sheet) {
      Logger.log(tabs[t] + ': TAB NOT FOUND');
      continue;
    }

    var lastRow = sheet.getLastRow();
    var dataRows = Math.max(0, lastRow - 1); // exclude header

    if (dataRows > 0) {
      var data = sheet.getRange(2, 1, dataRows, 3).getValues();

      // Count unique dates and accounts
      var dates = {};
      var accounts = {};
      for (var i = 0; i < data.length; i++) {
        var d = String(data[i][0]);
        if (data[i][0] instanceof Date) {
          d = Utilities.formatDate(data[i][0], 'America/New_York', 'yyyy-MM-dd');
        }
        dates[d] = true;
        accounts[String(data[i][1])] = true;
      }

      var uniqueDates = Object.keys(dates).sort();
      var uniqueAccounts = Object.keys(accounts).sort();

      Logger.log(tabs[t] + ':');
      Logger.log('  Total rows: ' + dataRows);
      Logger.log('  Unique dates: ' + uniqueDates.length +
                 ' (earliest: ' + uniqueDates[0] +
                 ', latest: ' + uniqueDates[uniqueDates.length - 1] + ')');
      Logger.log('  Unique accounts: ' + uniqueAccounts.length);
      for (var a = 0; a < uniqueAccounts.length; a++) {
        Logger.log('    - ' + uniqueAccounts[a]);
      }
    } else {
      Logger.log(tabs[t] + ': EMPTY (no data rows)');
    }
  }

  Logger.log('=== DEBUG COMPLETE ===');
}

/**
 * Utility function: manually backfill data from a specific manifest.
 * Pass the manifest file ID to process files from a previous day.
 *
 * @param {string} manifestFileId  Google Drive ID of the manifest JSON file
 */
function backfillFromManifest(manifestFileId) {
  try {
    Logger.log('=== Backfill from manifest: ' + manifestFileId + ' ===');

    var file = DriveApp.getFileById(manifestFileId);
    var content = file.getBlob().getDataAsString();
    var manifest = JSON.parse(content);

    if (!manifest.files && Array.isArray(manifest)) {
      manifest = { files: manifest };
    }

    Logger.log('Manifest has ' + manifest.files.length + ' file(s).');

    // Process PNC files
    var corporateRecords = [];
    var gustomerRecords = [];

    for (var i = 0; i < manifest.files.length; i++) {
      var entry = manifest.files[i];
      var name = entry.originalName || entry.fileName || '';

      if (PIPELINE_CONFIG.PNC_BALANCE_PATTERN.test(name)) {
        var pncResult = processPncFile_(entry.driveFileId, name);
        corporateRecords = corporateRecords.concat(pncResult.corporate);
        gustomerRecords = gustomerRecords.concat(pncResult.gustomer);
      } else if (PIPELINE_CONFIG.JPM_XLS_PATTERN.test(name)) {
        var jpmResult = processJpmFile_(entry.driveFileId, name);
        corporateRecords = corporateRecords.concat(jpmResult.corporate);
        gustomerRecords = gustomerRecords.concat(jpmResult.gustomer);
      }
    }

    Logger.log('Backfill totals - Corporate: ' + corporateRecords.length +
               ', Gustomer: ' + gustomerRecords.length);

    if (corporateRecords.length > 0 || gustomerRecords.length > 0) {
      var dataSheet = getOrCreateDataSheet_();
      if (corporateRecords.length > 0) {
        appendRecordsToTab_(dataSheet, PIPELINE_CONFIG.CORPORATE_TAB, corporateRecords);
      }
      if (gustomerRecords.length > 0) {
        appendRecordsToTab_(dataSheet, PIPELINE_CONFIG.GUSTOMER_TAB, gustomerRecords);
      }
    }

    Logger.log('=== Backfill complete ===');

  } catch (err) {
    Logger.log('ERROR in backfill: ' + err.message);
    Logger.log('Stack: ' + (err.stack || 'N/A'));
  }
}
