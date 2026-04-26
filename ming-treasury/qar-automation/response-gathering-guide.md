# QAR Response Gathering Guide

This guide covers how to systematically gather and verify all PE responses after QAR messages have been sent.

## Overview

Every PE DM must be checked for:
1. Text replies (messages in the DM conversation)
2. Emoji reactions on the original QAR message
3. Emoji reactions on the follow-up reminder (if one was sent)
4. Thread replies (some PEs reply in a thread instead of the main DM)

## Detecting Text Replies

Use the Slack MCP `read_channel` tool:

```
read_channel(
  channel_id: "[DM channel ID]",
  oldest: "[QAR message timestamp]",
  latest: "[current time or end of review window]",
  response_format: "concise",
  limit: 20
)
```

Look for messages from the PE (not from yourself) that indicate approval or contain change requests.

## Detecting Emoji Reactions

This is the most commonly missed response type. Use the Slack MCP `read_channel` tool with **detailed** format and a narrow timestamp window around the original message:

```
read_channel(
  channel_id: "[DM channel ID]",
  oldest: "[QAR message timestamp - 2 seconds]",
  latest: "[QAR message timestamp + 2 seconds]",
  response_format: "detailed",
  limit: 1
)
```

In the detailed output, look for a `Reactions:` line at the end of the message. Examples:
- `Reactions: +1 (1)` — one thumbs-up reaction
- `Reactions: +1::skin-tone-2 (1)` — thumbs-up with skin tone
- `Reactions: _approved (1), +1 (1)` — custom approved emoji and thumbs-up
- `Reactions: wave (1)` — wave emoji (may or may not indicate approval)

If there is no `Reactions:` line, the message has no reactions.

## Detecting Thread Replies

Some PEs reply in a thread on the original message rather than in the main DM conversation. Use the `read_thread` tool:

```
read_thread(
  channel_id: "[DM channel ID]",
  message_ts: "[QAR message timestamp]",
  response_format: "concise"
)
```

## Batch Processing Tips

When checking many PEs:

1. **Parallel calls**: Make multiple `read_channel` calls in parallel (up to 10 at a time) to speed up the process.

2. **Two passes**: 
   - First pass: Use `concise` format with a wide time window to catch text replies
   - Second pass: Use `detailed` format with narrow timestamp windows to catch emoji reactions on messages where no text reply was found

3. **Record channel IDs**: When sending the initial messages, record each PE's DM channel ID. You'll need these for all subsequent reads.

4. **Check follow-ups too**: If follow-up reminders were sent, check those messages for reactions as well using the same detailed-format approach.

## Categorizing Responses

### Clean Approval
- PE replied "approved", "Approved", etc.
- PE reacted with thumbs-up, check mark, or similar approval emoji
- No change requests mentioned

### Approved with Changes
- PE approved overall but requested specific changes:
  - Remove a user (left the company, changed roles)
  - Add a user (missing from the list)
  - Modify entitlements (upgrade, downgrade)
  - Add a user to the list who should also have access

### Escalation / Question
- PE flagged an error (wrong PE assignment, wrong user)
- PE asked questions about access they don't understand
- PE requested changes that require follow-up from the process owner

### No Response
- No text reply in the DM
- No emoji reaction on the original message
- No thread reply
- No emoji reaction on the follow-up reminder (if sent)

## Common Pitfalls

1. **Missing emoji-only approvals**: The single most common mistake. Always check detailed format for reactions.

2. **Missing thread replies**: Some PEs reply in a thread. Always check with `read_thread`.

3. **Slack search limitations**: Slack's search API may not return all DM messages. Use `read_channel` with specific channel IDs for reliable results.

4. **Reaction search doesn't work on DMs**: The `has::emoji:` search modifier does not reliably index DM reactions. Do not rely on search — read each message individually with detailed format.

5. **Late responses**: Some PEs respond days or weeks after the initial message. Use a wide time window when doing the final response compilation.
