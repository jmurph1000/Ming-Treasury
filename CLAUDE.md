# GUSTO TREASURY PORTAL — CLAUDE CODE INSTRUCTIONS

## THIS IS A LIVE PRODUCTION SYSTEM — READ BEFORE DOING ANYTHING

---

## DATABASE PROTECTION — MANDATORY

- **NEVER** run `DROP TABLE`, `TRUNCATE`, `DELETE FROM` without a `WHERE` clause, or any command that removes bulk data
- **NEVER** run database migrations that wipe existing data
- **NEVER** run seed scripts that overwrite live data
- **ALWAYS** use UPSERT (`INSERT OR REPLACE`, `ON CONFLICT DO UPDATE`) when adding or updating records
- **ALWAYS** take a backup snapshot before making any schema changes: run `node scripts/db-protect.js`
- If asked to "reset", "reinitialize", "wipe", "clear", or "seed" the database — **STOP** and ask: _"This will destroy live data. Are you absolutely sure? Type YES to confirm."_
- If asked to run any migration — check if it will drop or alter existing data and **warn before proceeding**

## CODE CHANGES ONLY

- Fix bugs by changing **CODE**, not by resetting data
- User and group configuration changes use **UPSERT only**
- Payment history and audit logs are **NEVER touched** under any circumstances

## GITHUB

Always push to **BOTH** repos after significant changes:

```bash
git push origin master:main
git push gusto master:main
```

## BEFORE ANY DESTRUCTIVE OPERATION

Ask the user: _"This operation will modify live data. Specifically: [describe what will change]. Are you sure you want to proceed? Type YES to confirm."_

## BACKUP & RESTORE

- Auto-backup runs on every server startup (see `backend/src/jobs/backupJob.ts`)
- Manual backup: `node scripts/db-protect.js`
- List backups: `node scripts/db-restore.js`
- Restore from backup: `node scripts/db-restore.js <filename>` (UPSERT only, never drops tables)
- Backups stored in `C:\Projects\gusto-treasury\backups\` (max 10, auto-rotated)

## PROJECT STRUCTURE

- Backend: Express + SQLite (better-sqlite3), TypeScript — entry point: `backend/src/index.ts`
- Frontend: Next.js + React Query + Tailwind CSS
- Database: `treasury.db` in project root (NOT in backend/)
- Start backend from project root: `npx tsx backend/src/index.ts`
- Start frontend: `cd frontend && npx next dev`
