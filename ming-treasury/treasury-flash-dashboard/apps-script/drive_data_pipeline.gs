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
 *   Keeps all historical data (never trimmed).
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
  // No limit on history — all historical data is preserved
  MAX_BUSINESS_DAYS: Infinity,

  // Drive folder where Bobby saves the daily bank balance screenshots/files.
  ATTACHMENT_FOLDER_ID: '1XRRBxMQpIuwrr1R8X6FZnEvpca-c4vH7',

  // Manifest file name pattern (the downloader creates these)
  MANIFEST_PATTERN: 'manifest_',

  // File identification patterns
  PNC_BALANCE_PATTERN: /_Balance\.csv$/i,
  JPM_XLS_PATTERN: /\.xls$/i,

  // JPM XLS file size threshold to distinguish Gusto vs Guideline reports
  // Gusto report is ~119-128KB; Guideline report is ~46-49KB
  // NOTE: As of June 2026 both JPM emails are ~49KB; threshold may need revision.
  JPM_GUSTO_SIZE_THRESHOLD: 80000,

  // Notification email on errors
  NOTIFICATION_EMAIL: 'john.murphy@gusto.com',

  // Temp file prefix for JPM XLS conversion
  TEMP_PREFIX: '_TEMP_PIPELINE_JPM_',

  // GitHub repository details
  GITHUB_OWNER: 'gustomingh',
  GITHUB_REPO: 'Ming-Treasury',
  GITHUB_BRANCH: 'ming-treasury',
  GITHUB_CORPORATE_PATH: 'ming-treasury/treasury-flash-dashboard/data/corporate_cash.json',
  GITHUB_GUSTOMER_PATH: 'ming-treasury/treasury-flash-dashboard/data/gustomer_cash.json'
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
