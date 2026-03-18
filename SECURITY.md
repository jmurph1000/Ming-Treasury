# Security Audit Report — Gusto Treasury Payment Portal

**Date:** 2026-03-18
**Auditor:** Automated + Manual Review

---

## 1. Dependency Audit (npm audit)

### Backend (`backend/`)
- **Vulnerabilities found:** 0
- **Status:** Clean

### Frontend (`frontend/`)
- **Total vulnerabilities found:** 2 (both moderate)
- **Auto-fixed:** 1

| Package | Severity | Title | Status |
|---------|----------|-------|--------|
| next (< 15.5.13) | Moderate | HTTP request smuggling in rewrites (GHSA-ggv3-7p47-pfv8) | **Fixed** — upgraded to 15.5.13 |
| next (< 16.1.7) | Moderate | Unbounded next/image disk cache growth (GHSA-3x4c-7xq6-9pq8) | **Accepted** — fix requires Next.js 16 (breaking change) |

**Mitigation for remaining vulnerability:** The image disk cache issue (GHSA-3x4c-7xq6-9pq8) affects `next/image` optimization. Risk is low for an internal portal with limited users. Monitor for Next.js 15.x patch. Upgrade to Next.js 16 when stable and tested.

### Root workspace
- Mirrors frontend findings (monorepo lockfile). No additional vulnerabilities.

---

## 2. Hardcoded Secrets Review

| Finding | Location | Risk | Status |
|---------|----------|------|--------|
| JWT_SECRET fallback | `backend/src/middleware/auth.ts:11` | Medium | **Acceptable** — fallback is for local dev only; production must set `JWT_SECRET` env var |
| ANTHROPIC_API_KEY | `.env` (root) | High if committed | **Safe** — `.env` is in `.gitignore` and NOT tracked by git |
| MCP server URLs | `backend/src/routes/bunmahon.ts:346-360` | Low | **Acceptable** — RunLayer proxy URLs, not secrets |

**No hardcoded secrets found in committed source code.**

---

## 3. .gitignore Verification

The following sensitive paths are confirmed excluded from version control:

| Pattern | Purpose | Tracked? |
|---------|---------|----------|
| `.env` / `.env*.local` | API keys, JWT secret, session secret | No |
| `*.db` / `*.db-journal` / `*.db-wal` | SQLite database files | No |
| `backups/` | Database backup JSON files | No |
| `*.pem` / `*.key` | TLS certificates and private keys | No |
| `credentials.json` / `secrets.json` | Service account credentials | No |
| `node_modules/` | Dependencies | No |

All entries verified via `git ls-files` — none are tracked.

---

## 4. Authentication & Authorization

- **JWT tokens** with configurable expiry (env-based)
- **Session management** via Redis with TTL
- **RBAC middleware** (`adminOnly`, `hasRole()`) on all sensitive routes
- **httpOnly cookies** for token storage (XSS-resistant)
- **Dual approval** required for payments over $1M

---

## 5. Recommendations

1. **Set strong JWT_SECRET in production** — do not rely on the dev fallback
2. **Rotate ANTHROPIC_API_KEY** periodically and monitor usage
3. **Upgrade Next.js to 16.x** when stable to resolve remaining moderate vulnerability
4. **Enable HTTPS** in production (currently HTTP for local dev)
5. **Add rate limiting** to `/api/bunmahon/chat` to prevent API key abuse
6. **Run `npm audit` on each deploy** as part of CI/CD pipeline
