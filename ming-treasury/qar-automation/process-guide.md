# QAR Slack-Based Response Gathering — Process Guide

## Step 1: Extract PE and User Data from the Spreadsheet

Claude Code reads each bank portal sheet in the QAR spreadsheet using the Google Sheets MCP.

### How it works:
1. Use `get_metadata` to list all sheets in the QAR spreadsheet
2. For each sheet, fetch column B (`PE`) using the `fetch` tool with range `SheetName!B2:B200`
3. Deduplicate all PE names across sheets (case-insensitive) to build the master PE list
4. Note the total count of unique PEs

### Important considerations:
- Some PE names may have minor variations across sheets (e.g., different capitalization). Treat these as the same person.
- Entries like "N/A" or "#N/A" in the PE column should be excluded.

## Step 2: Identify PE Slack Accounts

For each unique PE, search for their Slack account.

### How it works:
1. Use the Slack MCP's `search_users` tool with each PE's full name
2. Track which PEs are found and which are not
3. PEs without Slack accounts should be flagged — they need to be contacted via email or another channel

## Step 3: Send Personalized QAR Review DMs

For each PE with a Slack account, aggregate all their users and entitlements across all bank portals into a single message.

### How it works:
1. For each PE, go back through the sheet data and collect all users + entitlements grouped by user
2. Format the message using the template in `message-templates.md`
3. Send via the Slack MCP's `send_message` tool to the PE's DM channel
4. Record the message timestamp (`message_ts`) and DM channel ID for each sent message — you'll need these later to check for emoji reactions

### Important considerations:
- Consolidate users who appear with slightly different name formats across portals into a single entry
- Messages are sent from the process owner's Slack account (not a bot), which increases response rates
- Send during business hours when possible for better response rates

## Step 4: Monitor Responses

Responses come in three forms that must ALL be checked:

### a) Text replies
PEs type "approved", "Approved", etc. as a new message in the DM.

**How to detect:** Use `read_channel` with the DM channel ID and a time window starting from when the QAR message was sent.

### b) Emoji reactions
PEs react to the original message with a thumbs-up or other approval emoji.

**How to detect:** Use `read_channel` with `response_format: "detailed"` and a narrow timestamp window around the original message. Reactions appear as a `Reactions:` line in the detailed output. Common approval reactions include:
- `+1` (thumbs-up)
- `+1::skin-tone-X` (thumbs-up with skin tone)
- `_approved` (custom emoji)
- `white_check_mark`
- `heavy_check_mark`

**CRITICAL:** The `concise` response format does NOT show reactions. You MUST use `detailed` format. A significant portion of PEs (potentially ~30%) will approve exclusively via emoji reaction with no text reply.

### c) Detailed replies
PEs provide specific change requests — additions, removals, modifications, or flag errors.

**How to detect:** Same as text replies. Read the full DM conversation for context.

## Step 5: Send Follow-Up Reminders

After approximately 2 weeks, identify non-responders and send follow-ups.

### How it works:
1. For each PE, check if they responded via text OR emoji reaction (Step 4)
2. For PEs with no response of either type, send a follow-up DM using the reminder template in `message-templates.md`
3. Wait another 1-2 weeks and check again

## Step 6: Compile Response Summary

Read all DM conversations one final time and compile into a structured summary.

### Categories:
- **Approved — No Changes**: Text reply or emoji reaction confirming approval, with no change requests
- **Approved with Changes**: Approval plus specific modification requests (add users, remove users, change entitlements)
- **Escalations/Questions**: Wrong PE assignment, questions about why users have access, or complex change requests requiring follow-up
- **No Response**: No text or emoji after initial message and follow-up reminder

### Action item types to extract:
- **Removals**: Users who left the company or no longer need access
- **Additions**: Team members missing from the list who should be granted access
- **Modifications**: Changes in entitlement level for existing users
- **Corrections**: Errors in the data (wrong PE assignment, duplicate entries, etc.)

### Output:
Create a Google Doc using the Google Drive MCP's `create_doc_from_markdown` tool containing:
- Full list of every PE and their response (organized by category)
- All action items (removals, additions, modifications, corrections)
- Any additional context from DM conversations
- Response rate statistics
