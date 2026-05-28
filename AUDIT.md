# Security Audit — today-little-log
**Date**: 2026-03-28 | **Status**: Paused

## Secrets in Git History
`.env` was previously committed (commit `7ffd1bb`), later removed in `67e2d94`. Secrets (Turso token, Better Auth secret, Google OAuth credentials) are **exposed in git history** and must be considered compromised.

## Credentials on Disk
- `.env` contains real Turso DB URL/token, Better Auth secret, **Google OAuth client ID + secret** (plaintext)
- `.env.local` contains SaaS Maker API key
- Both files are gitignored and not currently tracked — no new leakage risk
- **Google OAuth credentials (`GOCSPX-...`) need immediate rotation** per project strategy

## Deployment
Deployed on Cloudflare Pages via Wrangler. Historical Vercel references are stale and should not guide current deploy work.

## Code Security
- No CORS misconfigurations found
- One `dangerouslySetInnerHTML` in `src/components/ui/chart.tsx` (shadcn/ui chart — low risk, library code)
- No hardcoded secrets in source files; all sensitive values read from env vars
- API keys (chatbot) are user-supplied at runtime via password input — acceptable pattern

## Action Items
- [ ] Rotate Google OAuth client secret (per project strategy — exposed in git history)
- [ ] Rotate Turso auth token (exposed in git history)
- [ ] Rotate Better Auth secret (exposed in git history)
- [ ] Run `git filter-branch` or BFG to purge `.env` from git history
- [x] Add `.env.local` explicitly to `.gitignore`
- [ ] Verify Cloudflare Pages env vars are updated after rotation
