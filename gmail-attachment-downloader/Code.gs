/**
 * Gmail Attachment Downloader
 *
 * Automatically downloads email attachments from Gmail and saves them
 * to a Google Drive folder. Can be triggered manually, on a timer,
 * or via web app URL (for Claude integration).
 *
 * Setup:
 *   1. Paste this code into a new Google Apps Script project at script.google.com
 *   2. Run saveAttachments() once to authorize permissions
 *   3. Deploy as web app (Deploy > New deployment > Web app)
 *   4. Add a time-driven trigger (every 10 minutes) for saveAttachments()
 *
 * Usage:
 *   - Timer trigger runs automatically every 10 minutes
 *   - Web app: GET /exec?query=<gmail search>&max=<number>
 *   - Manual: Run saveAttachments() from the script editor
 */

// === CONFIGURATION ===
var DEFAULT_QUERY = 'has:attachment after:2026/03/01';
var FOLDER_NAME = 'Gmail Attachments';
var MAX_RESULTS = 50;

/**
 * Main entry point - runs the download with the default query.
 * This is the function to attach to a time-driven trigger.
 */
function saveAttachments() {
  _processAttachments(DEFAULT_QUERY, MAX_RESULTS);
}

/**
 * Web app endpoint so Claude (or a browser) can trigger downloads remotely.
 * Accepts query params:
 *   ?query=<gmail search query>  (default: DEFAULT_QUERY)
 *   ?max=<max results>           (default: MAX_RESULTS)
 */
function doGet(e) {
  var query = (e && e.parameter && e.parameter.query) ? e.parameter.query : DEFAULT_QUERY;
  var max = (e && e.parameter && e.parameter.max) ? parseInt(e.parameter.max, 10) : MAX_RESULTS;

  var result = _processAttachments(query, max);

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Core logic: searches Gmail, downloads attachments to Drive, writes a manifest.
 *
 * File naming: YYYYMMDD_HHMMSS_<index>_<original filename>
 */
function _processAttachments(query, maxResults) {
  var folder = _getOrCreateFolder();
  var threads = GmailApp.search(query, 0, maxResults);
  var downloaded = [];
  var skipped = [];
  var errors = [];

  // Build set of existing filenames to avoid duplicates
  var existingFiles = {};
  var existingIter = folder.getFiles();
  while (existingIter.hasNext()) {
    var ef = existingIter.next();
    existingFiles[ef.getName()] = true;
  }

  var now = new Date();
  var datePrefix = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var index = 0;

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      var attachments = msg.getAttachments();

      for (var k = 0; k < attachments.length; k++) {
        var att = attachments[k];
        var filename = att.getName();
        var contentType = att.getContentType();

        if (_isJunkAttachment(filename, contentType)) {
          skipped.push(filename);
          continue;
        }

        var paddedIndex = ('0000' + index).slice(-4);
        var savedName = datePrefix + '_' + paddedIndex + '_' + filename;

        // Skip if original filename already exists in folder
        var alreadyExists = false;
        for (var key in existingFiles) {
          if (key.indexOf(filename) !== -1) {
            alreadyExists = true;
            break;
          }
        }
        if (alreadyExists) {
          skipped.push(filename + ' (already exists)');
          continue;
        }

        try {
          folder.createFile(att.copyBlob().setName(savedName));
          downloaded.push({
            name: savedName,
            originalName: filename,
            contentType: contentType,
            size: att.getSize(),
            from: msg.getFrom(),
            subject: msg.getSubject(),
            date: msg.getDate().toISOString()
          });
          existingFiles[savedName] = true;
          index++;
        } catch (err) {
          errors.push({ filename: filename, error: err.toString() });
        }
      }
    }
  }

  // Write manifest
  var manifest = {
    timestamp: now.toISOString(),
    query: query,
    threadsProcessed: threads.length,
    filesDownloaded: downloaded.length,
    filesSkipped: skipped.length,
    errors: errors.length,
    files: downloaded
  };

  var manifestName = 'manifest_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss') + '.json';
  folder.createFile(manifestName, JSON.stringify(manifest, null, 2), 'text/plain');

  Logger.log('Processed ' + threads.length + ' threads, downloaded ' + downloaded.length + ' files, skipped ' + skipped.length);

  return manifest;
}

/**
 * Filters out non-document attachments (calendar invites, inline images, HTML parts).
 */
function _isJunkAttachment(filename, contentType) {
  if (!filename) return true;

  var lowerName = filename.toLowerCase();
  var lowerType = (contentType || '').toLowerCase();

  if (lowerName.endsWith('.ics') || lowerType === 'text/calendar') return true;
  if (lowerName.endsWith('.html') || lowerName.endsWith('.htm') || lowerType === 'text/html') return true;

  if (lowerType.indexOf('image/') === 0) {
    var inlinePatterns = ['image0', 'logo', 'signature', 'banner', 'icon', 'pixel', 'spacer', 'tracking'];
    for (var p = 0; p < inlinePatterns.length; p++) {
      if (lowerName.indexOf(inlinePatterns[p]) !== -1) return true;
    }
  }

  return false;
}

/**
 * Gets or creates the target Google Drive folder.
 */
function _getOrCreateFolder() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(FOLDER_NAME);
}
