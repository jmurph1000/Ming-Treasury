---
name: email-sweep
description: Triage inbox — categorize unread emails by priority, create to-dos, and optionally draft replies
---

# Email Sweep — Inbox Triage

Scan recent unread emails, categorize them by priority and action needed, add actionable items as to-dos in Mission Control, and offer to draft replies.

## Process

### Step 1: Fetch unread emails

Use the Gmail MCP tools to search for unread emails from the last 3 days:
- Query: `is:unread in:inbox newer_than:3d`
- Fetch up to 20 results

For each email returned, fetch its full content so you can read the body.

### Step 2: Categorize

Assign each email to exactly one category:

| Priority | Category | Criteria |
|----------|----------|----------|
| **HIGH** | Action Required | Requests with deadlines, approvals needed, escalations, direct asks from leadership |
| **HIGH** | Urgent FYI | Time-sensitive information (outages, policy changes, compliance) |
| **MEDIUM** | Respond | Questions directed at you, meeting follow-ups, requests without hard deadlines |
| **MEDIUM** | Review | Documents, reports, or PRs shared for your input |
| **LOW** | FYI | Newsletters, announcements, CC'd threads, automated notifications |
| **LOW** | Skip | Marketing, spam-like, or irrelevant |

### Step 3: Present the triage summary

Display a table to the user:

```
## Inbox Triage — [count] unread emails

### Action Required (HIGH)
1. [Sender] — [Subject] — [one-line summary of what's needed]
2. ...

### Respond (MEDIUM)
1. ...

### Review (MEDIUM)
1. ...

### FYI (LOW)
1. ...

### Skipped
- [count] emails skipped (newsletters, notifications, etc.)
```

### Step 4: Create to-dos

For every HIGH and MEDIUM email, append a to-do to the Mission Control todo file at `~/.memory/mission-control/todos.md`.

**Read the existing file first**, then append new entries. Do NOT overwrite existing to-dos.

Use this exact markdown format for each new to-do:
- HIGH priority: `- [ ] **!!** [action summary] [due: YYYY-MM-DD] [from: sender name]`
- MEDIUM priority: `- [ ] **!** [action summary] [due: YYYY-MM-DD] [from: sender name]`

For the due date:
- If the email mentions a deadline, use that date
- If no deadline: HIGH = tomorrow, MEDIUM = 3 days from today

For the description, write a short actionable summary (e.g., "Reply to Diana re: Q2 forecast review" not "Email from Diana about Q2 forecast").

After adding to-dos, tell the user how many were created.

### Step 5: Offer to draft replies

After presenting the triage, ask:

> Would you like me to draft replies to any of these? List the numbers (e.g., "1, 3, 5") or say "all high" / "all medium" / "none".

For each email the user selects:
1. Draft a concise, professional reply in a direct and collaborative tone
2. Show the draft to the user for review
3. After user approval, use the Gmail reply_to_message tool to send the reply, OR use create_draft to save it as a Gmail draft if the user prefers not to send immediately

Always confirm before sending. Default to saving as draft unless the user says to send.

## Guidelines

- Be concise in summaries — one line per email max
- Don't fetch or display full email bodies in the triage table — just summarize
- If an email thread has multiple messages, summarize the latest state
- Mark emails as read after triaging only if the user asks
- If there are no unread emails, say so and exit early
- Respect the user's time — move quickly through low-priority items
