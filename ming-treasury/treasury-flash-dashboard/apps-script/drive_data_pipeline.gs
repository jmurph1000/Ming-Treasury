/**
 * Treasury Flash Dashboard - Drive Data Pipeline (GitHub-backed)
 *
 * Reads JPM and PNC bank files that were saved to Google Drive by the Gmail
 * Attachment Downloader, parses balances, and pushes daily snapshots as JSON
 * files directly to a GitHub repository.
 *
 * DATA FLOW:
 *   Gmail Attachment Downloader -> Google Drive (PNC CSVs, JPM XLS files, manifest JSONs)
 *     -> This script reads from Drive, parses, pushes JSON to GitHub
 *       -> GitHub Pages / raw files serve JSON to the dashboard front-end
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
 *   Two JSON files committed to GitHub:
 *     - ming-treasury/treasury-flash-dashboard/data/corporate_cash.json
 *     - ming-treasury/treasury-flash-dashboard/data/gustomer_cash.json
 *   Each file is an array of:
 *     [{ account_description: "...", reporting_date: "YYYY-MM-DD", value: 123.45 }, ...]
 *   Keeps 252 business days of history (approx 1 year of trading days).
 *
 * DEPLOYMENT:
 *   1. Create a new standalone Apps Script project (or attach to any Sheet)
 *   2. Paste this entire file as Code.gs (or add as a .gs file)
 *   3. Enable the Drive API advanced service:
 *      Resources > Advanced Google Services > Drive API > ON
 *   4. Store your GitHub personal access token in Script Properties:
 *      Project Settings > Script Properties > Add:
 *        Property: GITHUB_TOKEN
 *        Value:    ghp_... (your token with repo scope)
 *   5. Run setupPipelineTrigger() once to install the daily trigger
 *
 * PREREQUISITES:
 *   - Drive API advanced service enabled
 *   - Gmail Attachment Downloader has already saved files to Drive
 *   - Script timezone set to America/New_York
 *   - GITHUB_TOKEN set in Script Properties (needs repo scope)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var PIPELINE_CONFIG = {
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

  // Temp file prefix for JPM XLS conversion
  TEMP_PREFIX: '_TEMP_PIPELINE_JPM_',

  // GitHub repository details
  GITHUB_OWNER: 'gustomingh',
  GITHUB_REPO: 'Ming-Treasury',
  GITHUB_BRANCH: 'ming-treasury',
  GITHUB_CORPORATE_PATH: 'ming-treasury/treasury-flash-dashboard/data/corporate_cash.json',
  GITHUB_GUSTOMER_PATH: 'ming-treasury/treasury-flash-dashboard/data/gustomer_cash.json',

  // Balance history CSV path in GitHub
  GITHUB_BALANCE_HISTORY_PATH: 'ming-treasury/treasury-flash-dashboard/data/balance_history.csv',

  // Number of business days to look back for gaps when backfilling
  BACKFILL_LOOKBACK_DAYS: 5,

  // Gmail search queries (used by Gmail fallback when no manifest exists)
  JPM_GMAIL_QUERY: 'from:jpmorganaccessalerts@jpmorgan.com subject:"Your J.P. Morgan Access Scheduled Report is Complete"',
  PNC_GMAIL_QUERY: 'from:PINACLE@pnc.com subject:"PNC Event: PNC Flash Data"'
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
  '77646837':   { dashboardName: 'Chase Mexico (MXN) 6837',                           category: 'corporate' },
  '2907105725': { dashboardName: 'Chase Guideline Holdings, LLC 5725',               category: 'corporate' },
  '2908798278': { dashboardName: 'Gusto PEO I Benefits 8278',                        category: 'corporate' },
  '2908798291': { dashboardName: 'Gusto PEO I Workers Comp 8291',                    category: 'corporate' },
  '2908798299': { dashboardName: 'Gusto PEO II Benefits 8299',                       category: 'corporate' },
  '2908798306': { dashboardName: 'Gusto PEO II Workers Comp 8306',                   category: 'corporate' }
};

// ============================================================================
// GITHUB API FUNCTIONS
// ============================================================================

/**
 * Retrieves the GitHub personal access token from Script Properties.
 *
 * SETUP: Project Settings > Script Properties > Add:
 *   Property: GITHUB_TOKEN
 *   Value:    ghp_... (your token with "repo" scope)
 *
 * @return {string} The GitHub token
 * @throws {Error}  If the token is not configured
 */
function getGitHubToken_() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN not found in Script Properties. ' +
      'Go to Project Settings > Script Properties and add: ' +
      'GITHUB_TOKEN = ghp_...'
    );
  }
  return token;
}

/**
 * Reads a file from a GitHub repository. Uses the Contents API for small files
 * and the Git Blobs API for large files (>1MB).
 *
 * @param  {string} filePath  Path within the repo (e.g. "data/corporate_cash.json")
 * @return {Object}           { content: <parsed JSON>, sha: <string> }
 *                            Returns { content: [], sha: null } if the file does not exist.
 */
function readFileFromGitHub_(filePath) {
  var token = getGitHubToken_();
  var baseUrl = 'https://api.github.com/repos/' +
                PIPELINE_CONFIG.GITHUB_OWNER + '/' +
                PIPELINE_CONFIG.GITHUB_REPO;
  var headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'TreasuryDashboard-AppsScript'
  };

  // First get the file metadata (sha and size) via Contents API
  var metaUrl = baseUrl + '/contents/' + filePath + '?ref=' + PIPELINE_CONFIG.GITHUB_BRANCH;
  var metaResp = UrlFetchApp.fetch(metaUrl, { method: 'get', headers: headers, muteHttpExceptions: true });
  var metaCode = metaResp.getResponseCode();

  if (metaCode === 404) {
    Logger.log('GitHub file not found (will be created): ' + filePath);
    return { content: [], sha: null };
  }

  if (metaCode !== 200) {
    throw new Error('GitHub API GET metadata failed (' + metaCode + '): ' + metaResp.getContentText());
  }

  var meta = JSON.parse(metaResp.getContentText());
  var fileSha = meta.sha;
  var fileSize = meta.size || 0;

  // For files <= 1MB, content is inline (base64)
  if (meta.content && meta.content.length > 0) {
    var decoded = Utilities.newBlob(
      Utilities.base64Decode(meta.content.replace(/\n/g, ''))
    ).getDataAsString();
    return { content: JSON.parse(decoded), sha: fileSha };
  }

  // For large files, fetch via Git Blobs API
  Logger.log('File too large for Contents API (' + fileSize + ' bytes), using Blobs API...');
  var blobUrl = baseUrl + '/git/blobs/' + fileSha;
  var blobResp = UrlFetchApp.fetch(blobUrl, { method: 'get', headers: headers, muteHttpExceptions: true });
  var blobCode = blobResp.getResponseCode();

  if (blobCode !== 200) {
    throw new Error('GitHub Blobs API failed (' + blobCode + '): ' + blobResp.getContentText());
  }

  var blobJson = JSON.parse(blobResp.getContentText());
  var blobDecoded = Utilities.newBlob(
    Utilities.base64Decode(blobJson.content.replace(/\n/g, ''))
  ).getDataAsString();

  return { content: JSON.parse(blobDecoded), sha: fileSha };
}

/**
 * Updates (or creates) a file in a GitHub repository.
 * Uses the Git Data API (blobs/trees/commits) to handle files of any size.
 *
 * @param {string} filePath    Path within the repo
 * @param {Array}  jsonContent The data to write (will be JSON-stringified)
 * @param {string|null} sha    Unused (kept for API compat) - tree approach doesn't need it
 * @param {string} commitMsg   Commit message
 */
function writeFileToGitHub_(filePath, jsonContent, sha, commitMsg) {
  var token = getGitHubToken_();
  var baseUrl = 'https://api.github.com/repos/' +
                PIPELINE_CONFIG.GITHUB_OWNER + '/' +
                PIPELINE_CONFIG.GITHUB_REPO;
  var headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'TreasuryDashboard-AppsScript'
  };

  var contentStr = JSON.stringify(jsonContent, null, 2);

  // Step 1: Create a blob with the file content
  var blobResp = UrlFetchApp.fetch(baseUrl + '/git/blobs', {
    method: 'post',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify({ content: contentStr, encoding: 'utf-8' }),
    muteHttpExceptions: true
  });
  if (blobResp.getResponseCode() !== 201) {
    throw new Error('GitHub create blob failed: ' + blobResp.getContentText());
  }
  var blobSha = JSON.parse(blobResp.getContentText()).sha;

  // Step 2: Get the current commit SHA for the branch
  var refResp = UrlFetchApp.fetch(baseUrl + '/git/ref/heads/' + PIPELINE_CONFIG.GITHUB_BRANCH, {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (refResp.getResponseCode() !== 200) {
    throw new Error('GitHub get ref failed: ' + refResp.getContentText());
  }
  var currentCommitSha = JSON.parse(refResp.getContentText()).object.sha;

  // Step 3: Get the tree SHA of the current commit
  var commitResp = UrlFetchApp.fetch(baseUrl + '/git/commits/' + currentCommitSha, {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (commitResp.getResponseCode() !== 200) {
    throw new Error('GitHub get commit failed: ' + commitResp.getContentText());
  }
  var baseTreeSha = JSON.parse(commitResp.getContentText()).tree.sha;

  // Step 4: Create a new tree with the updated file
  var treeResp = UrlFetchApp.fetch(baseUrl + '/git/trees', {
    method: 'post',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blobSha }]
    }),
    muteHttpExceptions: true
  });
  if (treeResp.getResponseCode() !== 201) {
    throw new Error('GitHub create tree failed: ' + treeResp.getContentText());
  }
  var newTreeSha = JSON.parse(treeResp.getContentText()).sha;

  // Step 5: Create a new commit
  var newCommitResp = UrlFetchApp.fetch(baseUrl + '/git/commits', {
    method: 'post',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify({
      message: commitMsg,
      tree: newTreeSha,
      parents: [currentCommitSha]
    }),
    muteHttpExceptions: true
  });
  if (newCommitResp.getResponseCode() !== 201) {
    throw new Error('GitHub create commit failed: ' + newCommitResp.getContentText());
  }
  var newCommitSha = JSON.parse(newCommitResp.getContentText()).sha;

  // Step 6: Update the branch ref to point to the new commit
  var updateRefResp = UrlFetchApp.fetch(baseUrl + '/git/refs/heads/' + PIPELINE_CONFIG.GITHUB_BRANCH, {
    method: 'patch',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify({ sha: newCommitSha }),
    muteHttpExceptions: true
  });
  if (updateRefResp.getResponseCode() !== 200) {
    throw new Error('GitHub update ref failed: ' + updateRefResp.getContentText());
  }

  Logger.log('Successfully committed ' + filePath + ' to GitHub (commit: ' + newCommitSha.substring(0, 7) + ').');
}

// ============================================================================
// MAIN PROCESSING FUNCTION (triggered daily)
// ============================================================================

/**
 * Main daily processing function. Finds today's manifest from Drive,
 * reads PNC and JPM files, parses balances, merges with existing GitHub
 * JSON data, and pushes the updated files back to GitHub.
 *
 * If no manifest is found, falls back to reading attachments directly
 * from Gmail. Also checks for missing previous business days and
 * backfills them automatically.
 *
 * After updating JSON, also appends new rows to balance_history.csv
 * in GitHub so both data stores stay in sync.
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

    var todayStr = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');

    // Step 1: Backfill any missing previous business days first
    backfillMissingBusinessDays_();

    // Step 2: Process today's data — try manifest first, fall back to Gmail
    var result = processDateFromManifestOrGmail_(todayStr);

    if (result.corporate.length === 0 && result.gustomer.length === 0) {
      // No data found from either source on a business day — alert
      if (isBusinessDay_(new Date())) {
        sendPipelineErrorNotification_(
          new Error('No JPM or PNC data found for ' + todayStr +
                    ' from either Drive manifest or Gmail fallback. ' +
                    'Check that bank emails arrived and the attachment downloader is running.'),
          'processDailyData'
        );
      }
      Logger.log('No data found for today. Exiting.');
    }

    var elapsed = ((new Date().getTime()) - startTime.getTime()) / 1000;
    Logger.log('=== processDailyData: Complete (' + elapsed.toFixed(1) + 's) ===');

  } catch (err) {
    Logger.log('ERROR in processDailyData: ' + err.message);
    Logger.log('Stack: ' + (err.stack || 'N/A'));
    sendPipelineErrorNotification_(err, 'processDailyData');
  }
}

/**
 * Processes data for a single date. Tries manifest first, then Gmail fallback.
 * Merges into JSON and appends to CSV on GitHub.
 *
 * @param  {string} dateStr  ISO date string (YYYY-MM-DD)
 * @return {Object}          { corporate: [...], gustomer: [...] }
 */
function processDateFromManifestOrGmail_(dateStr) {
  var corporateRecords = [];
  var gustomerRecords = [];

  // Try 1: Find a manifest file for this date
  var manifest = findManifestForDate_(dateStr);
  if (manifest) {
    Logger.log('Found manifest for ' + dateStr + ' with ' + manifest.files.length + ' file(s).');
    var manifestResult = processManifestFiles_(manifest);
    corporateRecords = manifestResult.corporate;
    gustomerRecords = manifestResult.gustomer;
  }

  // Try 2: If no manifest or no data from manifest, fall back to Gmail
  if (corporateRecords.length === 0 && gustomerRecords.length === 0) {
    Logger.log('No manifest data for ' + dateStr + '. Falling back to Gmail...');
    var gmailResult = processDateFromGmail_(dateStr);
    corporateRecords = gmailResult.corporate;
    gustomerRecords = gmailResult.gustomer;
  }

  Logger.log('Total for ' + dateStr + ' - Corporate: ' + corporateRecords.length +
             ' records, Gustomer: ' + gustomerRecords.length + ' records.');

  // Merge into GitHub JSON and update CSV
  if (corporateRecords.length > 0 || gustomerRecords.length > 0) {
    if (corporateRecords.length > 0) {
      mergeAndPushToGitHub_(
        PIPELINE_CONFIG.GITHUB_CORPORATE_PATH,
        corporateRecords,
        'Update corporate_cash.json for ' + dateStr
      );
    }
    if (gustomerRecords.length > 0) {
      mergeAndPushToGitHub_(
        PIPELINE_CONFIG.GITHUB_GUSTOMER_PATH,
        gustomerRecords,
        'Update gustomer_cash.json for ' + dateStr
      );
    }

    // Append to balance_history.csv
    appendToBalanceHistoryCsv_(corporateRecords, gustomerRecords, dateStr);
  }

  return { corporate: corporateRecords, gustomer: gustomerRecords };
}

/**
 * Extracts PNC and JPM records from a manifest's files.
 *
 * @param  {Object} manifest  Parsed manifest object with .files array
 * @return {Object}           { corporate: [...], gustomer: [...] }
 */
function processManifestFiles_(manifest) {
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

  // Sort so later reports win in deduplication
  jpmFileIds.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  pncFileIds.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });

  var corporateRecords = [];
  var gustomerRecords = [];

  for (var p = 0; p < pncFileIds.length; p++) {
    var pncResult = processPncFile_(pncFileIds[p].id, pncFileIds[p].name);
    corporateRecords = corporateRecords.concat(pncResult.corporate);
    gustomerRecords = gustomerRecords.concat(pncResult.gustomer);
  }

  for (var j = 0; j < jpmFileIds.length; j++) {
    var jpmResult = processJpmFile_(jpmFileIds[j].id, jpmFileIds[j].name);
    corporateRecords = corporateRecords.concat(jpmResult.corporate);
    gustomerRecords = gustomerRecords.concat(jpmResult.gustomer);
  }

  return { corporate: corporateRecords, gustomer: gustomerRecords };
}

// ============================================================================
// GMAIL FALLBACK
// ============================================================================

/**
 * Reads JPM and PNC attachments directly from Gmail for a specific date,
 * converts them to Drive files temporarily, parses, and cleans up.
 *
 * This is the fallback path when the attachment downloader didn't run
 * and no manifest exists.
 *
 * @param  {string} dateStr  ISO date string (YYYY-MM-DD) to search for
 * @return {Object}          { corporate: [...], gustomer: [...] }
 */
function processDateFromGmail_(dateStr) {
  var corporateRecords = [];
  var gustomerRecords = [];

  // Convert YYYY-MM-DD to YYYY/MM/DD for Gmail query
  var gmailDate = dateStr.replace(/-/g, '/');
  // Gmail "after:" is inclusive of that date, "before:" is exclusive
  var parts = dateStr.split('-');
  var nextDay = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  nextDay.setDate(nextDay.getDate() + 1);
  var nextDayStr = Utilities.formatDate(nextDay, 'America/New_York', 'yyyy/MM/dd');

  // --- PNC ---
  var pncQuery = PIPELINE_CONFIG.PNC_GMAIL_QUERY +
                 ' after:' + gmailDate + ' before:' + nextDayStr;
  Logger.log('Gmail PNC query: ' + pncQuery);

  var pncThreads = GmailApp.search(pncQuery, 0, 10);
  Logger.log('PNC Gmail threads found: ' + pncThreads.length);

  for (var t = 0; t < pncThreads.length; t++) {
    var messages = pncThreads[t].getMessages();
    for (var m = messages.length - 1; m >= 0; m--) {
      var attachments = messages[m].getAttachments();
      for (var a = 0; a < attachments.length; a++) {
        var fileName = attachments[a].getName();
        if (PIPELINE_CONFIG.PNC_BALANCE_PATTERN.test(fileName)) {
          Logger.log('Gmail PNC attachment: ' + fileName);
          var csvContent = attachments[a].getDataAsString();
          var pncResult = parsePncCsvContent_(csvContent, fileName);
          corporateRecords = corporateRecords.concat(pncResult.corporate);
          gustomerRecords = gustomerRecords.concat(pncResult.gustomer);
        }
      }
    }
  }

  // --- JPM ---
  var jpmQuery = PIPELINE_CONFIG.JPM_GMAIL_QUERY +
                 ' after:' + gmailDate + ' before:' + nextDayStr;
  Logger.log('Gmail JPM query: ' + jpmQuery);

  var jpmThreads = GmailApp.search(jpmQuery, 0, 10);
  Logger.log('JPM Gmail threads found: ' + jpmThreads.length);

  for (var t2 = 0; t2 < jpmThreads.length; t2++) {
    var jpmMessages = jpmThreads[t2].getMessages();
    for (var m2 = jpmMessages.length - 1; m2 >= 0; m2--) {
      var jpmAttachments = jpmMessages[m2].getAttachments();
      for (var a2 = 0; a2 < jpmAttachments.length; a2++) {
        var jpmFileName = jpmAttachments[a2].getName();
        if (PIPELINE_CONFIG.JPM_XLS_PATTERN.test(jpmFileName)) {
          Logger.log('Gmail JPM attachment: ' + jpmFileName + ' (' + jpmAttachments[a2].getSize() + ' bytes)');
          var blob = jpmAttachments[a2].copyBlob();
          var tempSheetId = convertXlsToDriveSheet_(blob, jpmFileName);
          if (tempSheetId) {
            try {
              var jpmResult = processJpmFile_(tempSheetId, jpmFileName);
              corporateRecords = corporateRecords.concat(jpmResult.corporate);
              gustomerRecords = gustomerRecords.concat(jpmResult.gustomer);
            } finally {
              deleteTempFile_(tempSheetId);
            }
          }
        }
      }
    }
  }

  Logger.log('Gmail fallback for ' + dateStr + ': Corporate=' + corporateRecords.length +
             ', Gustomer=' + gustomerRecords.length);
  return { corporate: corporateRecords, gustomer: gustomerRecords };
}

/**
 * Parses PNC Balance CSV content directly (without needing a Drive file).
 * Used by the Gmail fallback path.
 *
 * @param  {string} csvContent  Raw CSV text
 * @param  {string} fileName    File name (for logging)
 * @return {Object}             { corporate: [...], gustomer: [...] }
 */
function parsePncCsvContent_(csvContent, fileName) {
  Logger.log('Parsing PNC CSV content from: ' + fileName);

  var lines = csvContent.split(/\r?\n/);
  var corporate = [];
  var gustomer = [];

  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var fields = parseCsvLine_(line);
    if (fields.length < 7) continue;

    var asOfDate      = fields[0].trim();
    var accountNumber = fields[2].trim();
    var currentLedger = fields[5].trim();
    var accountName   = fields[3].replace(/\t/g, '').replace(/"/g, '').trim();

    var isoDate = convertMMDDYYYYtoISO_(asOfDate);
    if (!isoDate) continue;

    var mapping = PNC_ACCOUNT_MAP[accountNumber];
    if (!mapping) {
      Logger.log('WARNING: Unmapped PNC account: ' + accountNumber + ' (' + accountName + '). Skipping.');
      continue;
    }

    var value = parseNumericValue_(currentLedger);
    if (value === null) value = 0;

    var record = { date: isoDate, account_name: mapping.dashboardName, value: value };

    if (mapping.category === 'corporate') {
      corporate.push(record);
    } else {
      gustomer.push(record);
    }
  }

  Logger.log('PNC CSV parsed: ' + corporate.length + ' corporate, ' + gustomer.length + ' gustomer.');
  return { corporate: corporate, gustomer: gustomer };
}

// ============================================================================
// BACKFILL MISSING BUSINESS DAYS
// ============================================================================

/**
 * Checks the existing GitHub JSON for gaps in the last N business days.
 * For each missing business day, attempts to retrieve data from Gmail
 * and backfill.
 */
function backfillMissingBusinessDays_() {
  Logger.log('Checking for missing business days to backfill...');

  // Read existing data to find which dates are present
  var corpFile = readFileFromGitHub_(PIPELINE_CONFIG.GITHUB_CORPORATE_PATH);
  var existingDates = {};
  for (var i = 0; i < corpFile.content.length; i++) {
    existingDates[corpFile.content[i].reporting_date] = true;
  }

  // Build list of recent business days to check
  var today = new Date();
  var missingDates = [];
  var daysChecked = 0;
  var d = new Date(today);
  d.setDate(d.getDate() - 1); // start from yesterday

  while (daysChecked < PIPELINE_CONFIG.BACKFILL_LOOKBACK_DAYS) {
    if (isBusinessDay_(d)) {
      var ds = Utilities.formatDate(d, 'America/New_York', 'yyyy-MM-dd');
      if (!existingDates[ds]) {
        missingDates.push(ds);
      }
      daysChecked++;
    }
    d.setDate(d.getDate() - 1);
  }

  if (missingDates.length === 0) {
    Logger.log('No missing business days found in the last ' +
               PIPELINE_CONFIG.BACKFILL_LOOKBACK_DAYS + ' days.');
    return;
  }

  Logger.log('Missing business days: ' + missingDates.join(', '));

  // Backfill each missing date (oldest first)
  missingDates.sort();
  for (var m = 0; m < missingDates.length; m++) {
    Logger.log('Backfilling: ' + missingDates[m]);
    processDateFromManifestOrGmail_(missingDates[m]);
  }
}

/**
 * Returns true if the given date is a weekday (Mon-Fri) and not a
 * major US bank holiday.
 *
 * @param  {Date} d
 * @return {boolean}
 */
function isBusinessDay_(d) {
  var day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  // Check major US bank holidays (fixed dates in ET)
  var dateStr = Utilities.formatDate(d, 'America/New_York', 'MM-dd');
  var year = parseInt(Utilities.formatDate(d, 'America/New_York', 'yyyy'), 10);

  // Fixed holidays
  var fixedHolidays = [
    '01-01', // New Year's Day
    '06-19', // Juneteenth
    '07-04', // Independence Day
    '11-11', // Veterans Day
    '12-25'  // Christmas Day
  ];

  if (fixedHolidays.indexOf(dateStr) !== -1) return false;

  // Floating holidays (approximate — MLK, Presidents, Memorial, Labor,
  // Columbus, Thanksgiving). This is a simplified check.
  var month = d.getMonth(); // 0-indexed
  var date = d.getDate();

  // MLK Day: 3rd Monday in January
  if (month === 0 && day === 1 && date >= 15 && date <= 21) return false;
  // Presidents Day: 3rd Monday in February
  if (month === 1 && day === 1 && date >= 15 && date <= 21) return false;
  // Memorial Day: last Monday in May
  if (month === 4 && day === 1 && date >= 25 && date <= 31) return false;
  // Labor Day: 1st Monday in September
  if (month === 8 && day === 1 && date >= 1 && date <= 7) return false;
  // Columbus Day: 2nd Monday in October
  if (month === 9 && day === 1 && date >= 8 && date <= 14) return false;
  // Thanksgiving: 4th Thursday in November
  if (month === 10 && day === 4 && date >= 22 && date <= 28) return false;

  return true;
}

// ============================================================================
// MANIFEST DISCOVERY (date-specific)
// ============================================================================

/**
 * Searches Google Drive for a manifest JSON file for a specific date.
 *
 * @param  {string} dateStr  ISO date string (YYYY-MM-DD)
 * @return {Object|null}     Parsed manifest object, or null if not found.
 */
function findManifestForDate_(dateStr) {
  var searchName = PIPELINE_CONFIG.MANIFEST_PATTERN + dateStr;
  Logger.log('Searching Drive for manifest: ' + searchName);

  var query = 'title contains "' + searchName + '" and trashed = false';
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
    Logger.log('No manifest found for ' + dateStr);
    return null;
  }

  Logger.log('Found manifest: ' + latestFile.getName());
  var content = latestFile.getBlob().getDataAsString();
  var manifest = JSON.parse(content);
  if (!manifest.files && Array.isArray(manifest)) {
    manifest = { files: manifest };
  }
  return manifest;
}

// ============================================================================
// BALANCE HISTORY CSV UPDATE
// ============================================================================

/**
 * Appends new records to balance_history.csv in GitHub. Reads the current
 * CSV, checks which (date, account) pairs are already present, appends
 * only new rows, and commits back.
 *
 * CSV format: Date,Type,Account,Balance
 *
 * @param {Object[]} corporateRecords  Array of { date, account_name, value }
 * @param {Object[]} gustomerRecords   Array of { date, account_name, value }
 * @param {string}   dateStr           ISO date for the commit message
 */
function appendToBalanceHistoryCsv_(corporateRecords, gustomerRecords, dateStr) {
  Logger.log('Updating balance_history.csv for ' + dateStr + '...');

  var csvFile = readCsvFromGitHub_(PIPELINE_CONFIG.GITHUB_BALANCE_HISTORY_PATH);
  var existingCsv = csvFile.content; // raw string
  var sha = csvFile.sha;

  // Build a set of existing (date, account) keys to avoid duplicates
  var existingKeys = {};
  var lines = existingCsv.split('\n');
  for (var i = 1; i < lines.length; i++) { // skip header
    var line = lines[i].trim();
    if (!line) continue;
    // CSV: Date,Type,Account,Balance
    var commaIdx1 = line.indexOf(',');
    var commaIdx2 = line.indexOf(',', commaIdx1 + 1);
    var commaIdx3 = line.indexOf(',', commaIdx2 + 1);
    if (commaIdx3 > 0) {
      var csvDate = line.substring(0, commaIdx1);
      var csvAccount = line.substring(commaIdx2 + 1, commaIdx3);
      existingKeys[csvDate + '|' + csvAccount] = true;
    }
  }

  // Build new rows
  var newRows = [];

  for (var c = 0; c < corporateRecords.length; c++) {
    var cr = corporateRecords[c];
    var key = cr.date + '|' + cr.account_name;
    if (!existingKeys[key]) {
      newRows.push(cr.date + ',Corporate,' + cr.account_name + ',' + cr.value);
      existingKeys[key] = true;
    }
  }

  for (var g = 0; g < gustomerRecords.length; g++) {
    var gr = gustomerRecords[g];
    var key2 = gr.date + '|' + gr.account_name;
    if (!existingKeys[key2]) {
      newRows.push(gr.date + ',Customer,' + gr.account_name + ',' + gr.value);
      existingKeys[key2] = true;
    }
  }

  if (newRows.length === 0) {
    Logger.log('No new CSV rows to append for ' + dateStr);
    return;
  }

  // Append new rows and commit
  var updatedCsv = existingCsv;
  if (!updatedCsv.endsWith('\n')) {
    updatedCsv += '\n';
  }
  updatedCsv += newRows.join('\n') + '\n';

  writeCsvToGitHub_(
    PIPELINE_CONFIG.GITHUB_BALANCE_HISTORY_PATH,
    updatedCsv,
    'Append balance_history.csv for ' + dateStr + ' (' + newRows.length + ' rows)'
  );

  Logger.log('Appended ' + newRows.length + ' rows to balance_history.csv.');
}

/**
 * Reads a raw text file from GitHub (not JSON-parsed).
 *
 * @param  {string} filePath  Path within the repo
 * @return {Object}           { content: <string>, sha: <string|null> }
 */
function readCsvFromGitHub_(filePath) {
  var token = getGitHubToken_();
  var baseUrl = 'https://api.github.com/repos/' +
                PIPELINE_CONFIG.GITHUB_OWNER + '/' +
                PIPELINE_CONFIG.GITHUB_REPO;
  var headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'TreasuryDashboard-AppsScript'
  };

  var metaUrl = baseUrl + '/contents/' + filePath + '?ref=' + PIPELINE_CONFIG.GITHUB_BRANCH;
  var metaResp = UrlFetchApp.fetch(metaUrl, { method: 'get', headers: headers, muteHttpExceptions: true });

  if (metaResp.getResponseCode() === 404) {
    Logger.log('CSV file not found on GitHub (will be created): ' + filePath);
    return { content: 'Date,Type,Account,Balance\n', sha: null };
  }

  if (metaResp.getResponseCode() !== 200) {
    throw new Error('GitHub GET failed for CSV (' + metaResp.getResponseCode() + '): ' + metaResp.getContentText());
  }

  var meta = JSON.parse(metaResp.getContentText());

  // Inline content (< 1MB)
  if (meta.content && meta.content.length > 0) {
    var decoded = Utilities.newBlob(
      Utilities.base64Decode(meta.content.replace(/\n/g, ''))
    ).getDataAsString();
    return { content: decoded, sha: meta.sha };
  }

  // Large file via Blobs API
  var blobUrl = baseUrl + '/git/blobs/' + meta.sha;
  var blobResp = UrlFetchApp.fetch(blobUrl, { method: 'get', headers: headers, muteHttpExceptions: true });
  if (blobResp.getResponseCode() !== 200) {
    throw new Error('GitHub Blobs API failed for CSV: ' + blobResp.getContentText());
  }
  var blobJson = JSON.parse(blobResp.getContentText());
  var blobDecoded = Utilities.newBlob(
    Utilities.base64Decode(blobJson.content.replace(/\n/g, ''))
  ).getDataAsString();
  return { content: blobDecoded, sha: meta.sha };
}

/**
 * Writes raw text content to a file in GitHub (used for CSV).
 * Uses the Git Data API (blobs/trees/commits) for any file size.
 *
 * @param {string} filePath    Path within the repo
 * @param {string} content     Raw text content
 * @param {string} commitMsg   Commit message
 */
function writeCsvToGitHub_(filePath, content, commitMsg) {
  var token = getGitHubToken_();
  var baseUrl = 'https://api.github.com/repos/' +
                PIPELINE_CONFIG.GITHUB_OWNER + '/' +
                PIPELINE_CONFIG.GITHUB_REPO;
  var headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'TreasuryDashboard-AppsScript'
  };

  // Create blob
  var blobResp = UrlFetchApp.fetch(baseUrl + '/git/blobs', {
    method: 'post', headers: headers, contentType: 'application/json',
    payload: JSON.stringify({ content: content, encoding: 'utf-8' }),
    muteHttpExceptions: true
  });
  if (blobResp.getResponseCode() !== 201) {
    throw new Error('GitHub create blob failed (CSV): ' + blobResp.getContentText());
  }
  var blobSha = JSON.parse(blobResp.getContentText()).sha;

  // Get current commit
  var refResp = UrlFetchApp.fetch(baseUrl + '/git/ref/heads/' + PIPELINE_CONFIG.GITHUB_BRANCH, {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (refResp.getResponseCode() !== 200) {
    throw new Error('GitHub get ref failed (CSV): ' + refResp.getContentText());
  }
  var currentCommitSha = JSON.parse(refResp.getContentText()).object.sha;

  // Get base tree
  var commitResp = UrlFetchApp.fetch(baseUrl + '/git/commits/' + currentCommitSha, {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (commitResp.getResponseCode() !== 200) {
    throw new Error('GitHub get commit failed (CSV): ' + commitResp.getContentText());
  }
  var baseTreeSha = JSON.parse(commitResp.getContentText()).tree.sha;

  // Create tree
  var treeResp = UrlFetchApp.fetch(baseUrl + '/git/trees', {
    method: 'post', headers: headers, contentType: 'application/json',
    payload: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blobSha }]
    }),
    muteHttpExceptions: true
  });
  if (treeResp.getResponseCode() !== 201) {
    throw new Error('GitHub create tree failed (CSV): ' + treeResp.getContentText());
  }
  var newTreeSha = JSON.parse(treeResp.getContentText()).sha;

  // Create commit
  var newCommitResp = UrlFetchApp.fetch(baseUrl + '/git/commits', {
    method: 'post', headers: headers, contentType: 'application/json',
    payload: JSON.stringify({ message: commitMsg, tree: newTreeSha, parents: [currentCommitSha] }),
    muteHttpExceptions: true
  });
  if (newCommitResp.getResponseCode() !== 201) {
    throw new Error('GitHub create commit failed (CSV): ' + newCommitResp.getContentText());
  }
  var newCommitSha = JSON.parse(newCommitResp.getContentText()).sha;

  // Update ref
  var updateRefResp = UrlFetchApp.fetch(baseUrl + '/git/refs/heads/' + PIPELINE_CONFIG.GITHUB_BRANCH, {
    method: 'patch', headers: headers, contentType: 'application/json',
    payload: JSON.stringify({ sha: newCommitSha }),
    muteHttpExceptions: true
  });
  if (updateRefResp.getResponseCode() !== 200) {
    throw new Error('GitHub update ref failed (CSV): ' + updateRefResp.getContentText());
  }

  Logger.log('Committed CSV update to GitHub (commit: ' + newCommitSha.substring(0, 7) + ').');
}

// ============================================================================
// GITHUB MERGE & PUSH LOGIC
// ============================================================================

/**
 * Reads the current JSON from GitHub, appends new records (replacing any
 * records that share the same date), trims to MAX_BUSINESS_DAYS unique
 * dates, and commits the result back to GitHub.
 *
 * @param {string}   filePath    GitHub repo path to the JSON file
 * @param {Object[]} newRecords  Array of { date, account_name, value }
 * @param {string}   commitMsg   Commit message
 */
function mergeAndPushToGitHub_(filePath, newRecords, commitMsg) {
  Logger.log('Merging data into GitHub: ' + filePath);

  // Step 1: Read the current JSON from GitHub
  var ghFile = readFileFromGitHub_(filePath);
  var existingData = ghFile.content; // Array of { account_description, reporting_date, value }
  var sha = ghFile.sha;

  Logger.log('Existing records from GitHub: ' + existingData.length);

  // Step 2: Determine which dates are being updated
  var newDates = {};
  for (var i = 0; i < newRecords.length; i++) {
    newDates[newRecords[i].date] = true;
  }

  // Step 3: Filter out existing records for dates being replaced
  var keptRecords = [];
  for (var j = 0; j < existingData.length; j++) {
    var existingDate = existingData[j].reporting_date;
    if (!newDates[existingDate]) {
      keptRecords.push(existingData[j]);
    }
  }

  // Step 4: Convert new records to the JSON format and append
  for (var k = 0; k < newRecords.length; k++) {
    keptRecords.push({
      account_description: newRecords[k].account_name,
      reporting_date: newRecords[k].date,
      value: newRecords[k].value
    });
  }

  // Step 5: Deduplicate — keep only one record per (account_description, reporting_date)
  // If multiple reports contain the same account on the same date, keep the last value
  var deduped = {};
  for (var d = 0; d < keptRecords.length; d++) {
    var key = keptRecords[d].reporting_date + '|' + keptRecords[d].account_description;
    deduped[key] = keptRecords[d];
  }
  keptRecords = [];
  var keys = Object.keys(deduped);
  for (var dk = 0; dk < keys.length; dk++) {
    keptRecords.push(deduped[keys[dk]]);
  }

  // Step 6: Sort by date ascending, then by account_description
  keptRecords.sort(function(a, b) {
    if (a.reporting_date < b.reporting_date) return -1;
    if (a.reporting_date > b.reporting_date) return 1;
    if (a.account_description < b.account_description) return -1;
    if (a.account_description > b.account_description) return 1;
    return 0;
  });

  // Step 7: No trimming — all historical data is preserved permanently.

  Logger.log('Total records after merge: ' + keptRecords.length);

  // Step 8: Push the updated JSON back to GitHub
  writeFileToGitHub_(filePath, keptRecords, sha, commitMsg);
}

/**
 * Trims a sorted array of JSON records to keep only the last
 * MAX_BUSINESS_DAYS unique reporting_date values.
 *
 * @param  {Object[]} records  Sorted array of { account_description, reporting_date, value }
 * @return {Object[]}          Trimmed array
 */
function trimToMaxBusinessDaysJson_(records) {
  if (records.length === 0) return records;

  // Never trim if MAX_BUSINESS_DAYS is not a finite positive number
  var maxDays = PIPELINE_CONFIG.MAX_BUSINESS_DAYS;
  if (!maxDays || !isFinite(maxDays) || maxDays <= 0) {
    Logger.log('MAX_BUSINESS_DAYS is ' + maxDays + ' — skipping trim (all data preserved).');
    return records;
  }

  // Collect unique dates
  var uniqueDates = [];
  var seenDates = {};
  for (var i = 0; i < records.length; i++) {
    var d = records[i].reporting_date;
    if (!seenDates[d]) {
      seenDates[d] = true;
      uniqueDates.push(d);
    }
  }

  // If within limits, return as-is
  if (uniqueDates.length <= maxDays) {
    return records;
  }

  // Keep only the most recent maxDays dates
  uniqueDates.sort();
  var cutoffIndex = uniqueDates.length - maxDays;
  var cutoffDate = uniqueDates[cutoffIndex];

  Logger.log('Trimming data: keeping dates from ' + cutoffDate + ' onward (' +
             maxDays + ' unique dates).');

  var trimmed = [];
  for (var j = 0; j < records.length; j++) {
    if (records[j].reporting_date >= cutoffDate) {
      trimmed.push(records[j]);
    }
  }

  return trimmed;
}

// ============================================================================
// MANIFEST DISCOVERY
// ============================================================================

/**
 * Searches Google Drive for the most recent manifest JSON file from today.
 * Delegates to findManifestForDate_ with today's date.
 *
 * @return {Object|null} Parsed manifest object, or null if not found.
 */
function findTodaysManifest_() {
  var todayStr = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
  return findManifestForDate_(todayStr);
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

  // Step 1: Get the file from Drive
  var file = DriveApp.getFileById(fileId);
  var fileSize = file.getSize();
  Logger.log('JPM file size: ' + fileSize + ' bytes');

  // Step 2: Open the XLS file as a spreadsheet
  // Drive already treats uploaded XLS files as openable spreadsheets.
  // Try opening directly first; if that fails, convert via Drive API.
  var ss = null;
  var tempSheetId = null;

  try {
    ss = SpreadsheetApp.openById(fileId);
    Logger.log('Opened XLS directly as spreadsheet (ID: ' + fileId + ')');
  } catch (directErr) {
    Logger.log('Direct open failed, converting via Drive API: ' + directErr.message);
    var blob = file.getBlob();
    tempSheetId = convertXlsToDriveSheet_(blob, fileName);
    if (!tempSheetId) {
      throw new Error('Failed to convert JPM XLS: ' + fileName);
    }
    ss = SpreadsheetApp.openById(tempSheetId);
  }

  try {
    // Step 3: Read the "Summary" sheet (contains account balances)
    // The XLS workbook has: "Filters" (small), "Summary" (balances), "Other Balances" (transactions)
    var sheets = ss.getSheets();
    var sheet = null;
    var lastRow = 0;
    var lastCol = 0;

    // Prefer a sheet named "Summary"
    for (var s = 0; s < sheets.length; s++) {
      var lr = sheets[s].getLastRow();
      var lc = sheets[s].getLastColumn();
      var sheetName = sheets[s].getName();
      Logger.log('Sheet "' + sheetName + '": ' + lr + ' rows x ' + lc + ' cols');
      if (sheetName.toLowerCase() === 'summary') {
        sheet = sheets[s];
        lastRow = lr;
        lastCol = lc;
        Logger.log('Using "Summary" sheet.');
        break;
      }
    }

    // Fallback: use the sheet with the most columns (Summary has 33 cols, Others has 8)
    if (!sheet) {
      for (var s2 = 0; s2 < sheets.length; s2++) {
        var lc2 = sheets[s2].getLastColumn();
        if (lc2 > lastCol) {
          lastCol = lc2;
          lastRow = sheets[s2].getLastRow();
          sheet = sheets[s2];
        }
      }
    }

    if (!sheet) {
      sheet = sheets[0];
      lastRow = sheet.getLastRow();
      lastCol = sheet.getLastColumn();
    }

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
        Logger.log('Column mapping: ' + JSON.stringify(colMapping));
        Logger.log('Header row values: ' + JSON.stringify(allData[r]));
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

      // Get the balance (use Current Available as primary — matches JPM Export tab)
      var balanceValue = null;
      if (colMapping.currentAvailable !== undefined) {
        balanceValue = parseJpmNumeric_(getJpmCellValue_(row, colMapping.currentAvailable));
      }
      // Fallback to Current Balance if no Current Available
      if (balanceValue === null && colMapping.currentBalance !== undefined) {
        balanceValue = parseJpmNumeric_(getJpmCellValue_(row, colMapping.currentBalance));
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
    // Step 6: Clean up the temporary converted file (only if we created one)
    if (tempSheetId) {
      deleteTempFile_(tempSheetId);
    }
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
               val === 'curr available' || val === 'avail bal' ||
               val === 'closing balance same day' || val === 'current balance same day') {
      mapping.currentAvailable = c;
    } else if (val === 'opening balance' || val === 'open balance' ||
               val === 'opening bal' || val === 'open bal' || val === 'opening ledger') {
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
 * Test function: verifies GitHub API connectivity by reading both JSON files.
 * Logs record counts and date ranges. Does NOT modify any data.
 */
function testGitHubRead() {
  Logger.log('=== MANUAL TEST: GitHub Read ===');

  var paths = [
    PIPELINE_CONFIG.GITHUB_CORPORATE_PATH,
    PIPELINE_CONFIG.GITHUB_GUSTOMER_PATH
  ];

  for (var i = 0; i < paths.length; i++) {
    Logger.log('Reading: ' + paths[i]);
    var result = readFileFromGitHub_(paths[i]);
    Logger.log('  Records: ' + result.content.length);
    Logger.log('  SHA: ' + (result.sha || 'null (file does not exist)'));

    if (result.content.length > 0) {
      var dates = {};
      for (var j = 0; j < result.content.length; j++) {
        dates[result.content[j].reporting_date] = true;
      }
      var sortedDates = Object.keys(dates).sort();
      Logger.log('  Date range: ' + sortedDates[0] + ' to ' + sortedDates[sortedDates.length - 1]);
      Logger.log('  Unique dates: ' + sortedDates.length);
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
      var todayStr = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');

      if (corporateRecords.length > 0) {
        mergeAndPushToGitHub_(
          PIPELINE_CONFIG.GITHUB_CORPORATE_PATH,
          corporateRecords,
          'Backfill corporate_cash.json (' + todayStr + ')'
        );
      }
      if (gustomerRecords.length > 0) {
        mergeAndPushToGitHub_(
          PIPELINE_CONFIG.GITHUB_GUSTOMER_PATH,
          gustomerRecords,
          'Backfill gustomer_cash.json (' + todayStr + ')'
        );
      }
    }

    Logger.log('=== Backfill complete ===');

  } catch (err) {
    Logger.log('ERROR in backfill: ' + err.message);
    Logger.log('Stack: ' + (err.stack || 'N/A'));
  }
}

function testOneJPM() {
  var fileId = "1Q0oQJLu4NVSG3m14GxYGBkgXrGE1q6-_";
  var result = processJpmFile_(fileId, "test.xls");
  Logger.log("Corporate records: " + result.corporate.length);
  if (result.corporate.length > 0) {
    Logger.log("Sample: " + JSON.stringify(result.corporate[0]));
  }
}
