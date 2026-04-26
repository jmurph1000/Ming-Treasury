# QAR Slack Message Templates

## Initial Review Message

```
Hi [PE Name]! It's time for the quarterly bank access review ([Quarter]).

Here are the users on your team with banking portal access:

[User Name]
- [Bank]: [Entitlement]
- [Bank]: [Entitlement]

[User Name]
- [Bank]: [Entitlement]
- [Bank]: [Entitlement]
- [Bank]: [Entitlement]

If everything looks good, just reply "approved" or give a :+1:.
If any changes are needed, just let me know which user and what should change.
```

### Formatting notes:
- User names should be italicized in Slack using `_User Name_`
- Entitlements are listed as bullet points under each user using `•`
- If a user has more than 6 entitlements, truncate with `+N more` to keep the message readable
- Group all entitlements for the same user together, even if they come from different sheets
- Deduplicate users who appear with slightly different name formats across portals

## Follow-Up Reminder Message

```
Hi [PE Name]! Just following up on the quarterly bank access review ([Quarter]) I sent on [original date]. When you get a chance, could you review the banking portal access for your team and reply "approved" or let me know if any changes are needed? Thanks!
```

### When to send:
- Approximately 2 weeks after the initial message
- Only to PEs who have not responded via text reply OR emoji reaction
- Before sending reminders, re-check all original messages for emoji reactions using `detailed` format in `read_channel`
