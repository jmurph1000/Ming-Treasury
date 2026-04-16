# Gmail Attachment Downloader

Automatically downloads email attachments from Gmail and saves them to a Google Drive folder called "Gmail Attachments". Designed to work with Claude Code so that Claude can read email attachments directly.

## How it works

1. A time-driven trigger runs the script every 10 minutes
2. The script searches Gmail for emails with attachments
3. Real document attachments (PDFs, CSVs, Excel, etc.) are saved to a "Gmail Attachments" folder in Google Drive
4. Junk attachments (calendar invites, inline images, HTML parts) are filtered out
5. Claude searches Gmail to identify an email, then reads the attachment from the Drive folder

## Setup

### 1. Create the Apps Script project
- Go to [script.google.com](https://script.google.com)
- Click **New project**
- Rename it to "Gmail Attachments"
- Replace the placeholder code with the contents of `Code.gs`
- Save (Ctrl+S)

### 2. Authorize permissions
- Select `saveAttachments` from the function dropdown
- Click **Run**
- Follow the authorization prompts (click "Advanced" > "Go to Gmail Attachments" if you see a warning)

### 3. Set up automatic trigger
- Click the **clock icon** (Triggers) in the left sidebar
- Click **+ Add Trigger**
- Configure:
  - Function: `saveAttachments`
  - Event source: **Time-driven**
  - Type: **Minutes timer**
  - Interval: **Every 10 minutes**
- Click **Save**

### 4. Deploy as web app (optional)
- Click **Deploy** > **New deployment**
- Select **Web app**
- Set "Execute as" to **Me**
- Set "Who has access" to **Anyone at [org]**
- Click **Deploy** and copy the URL

## Configuration

Edit these variables at the top of `Code.gs`:

| Variable | Default | Description |
|---|---|---|
| `DEFAULT_QUERY` | `has:attachment after:2026/03/01` | Gmail search query for the timer trigger |
| `FOLDER_NAME` | `Gmail Attachments` | Google Drive folder name |
| `MAX_RESULTS` | `50` | Max email threads to process per run |

## Web app usage

```
GET <web-app-url>?query=<gmail search>&max=<number>
```

Examples:
- `?query=from:sender@bank.com filename:pdf`
- `?query=subject:"funding request" has:attachment&max=5`

## Claude integration

With this running, ask Claude things like:
- "Look at the attachment from the email about Turkey funding"
- "Read the CSV from PNC's latest flash report"
- "What's in the PDF that Carter sent yesterday?"

Claude will search Gmail to find the email, then read the attachment from the Drive folder.
