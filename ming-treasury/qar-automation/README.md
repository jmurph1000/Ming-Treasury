# QAR Automation — Slack-Based Response Gathering

Quarterly Bank User Access Review (QAR) automation using Claude Code with Slack and Google Sheets MCPs.

## Overview

This process automates the end-to-end QAR cycle:
1. Extract PE and user entitlement data from the QAR spreadsheet
2. Send personalized review DMs to each PE via Slack
3. Monitor responses (text replies and emoji reactions)
4. Send follow-up reminders to non-responders
5. Compile a complete response summary with action items

## Files

- `process-guide.md` — Full step-by-step process documentation
- `message-templates.md` — Slack DM templates for initial send and follow-ups
- `response-gathering-guide.md` — How to gather and categorize all PE responses

## Prerequisites

- Claude Code with the following MCPs enabled:
  - **Slack MCP** (for sending/reading DMs, searching users)
  - **Google Sheets MCP** (for reading the QAR spreadsheet)
  - **Google Drive MCP** (for creating summary docs)
- Process owner's Slack account (messages are sent as the logged-in user, not a bot)
- QAR spreadsheet with one sheet per bank portal, column B = PE name
