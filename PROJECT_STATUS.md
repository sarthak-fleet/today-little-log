# Project Status

Last updated: 2026-06-12

## Current Scope

Today Little Log is a personal life PWA narrowed to three core tracking surfaces — daily scoreboard, habits, and journal — plus AM/PM rituals and a focus timer for time start/stop. The data this captures is the historical context for a future AI layer.

## Done

- The app deploys to Cloudflare Pages with Pages Functions.
- Turso/Drizzle, better-auth Google, and PWA behavior are part of the current architecture.
- Three core flows verified end-to-end in guest mode: habits (add/log/edit/delete), scoreboard, journal, and the focus block start/persist/stop cycle (`tests/verify_core_flows.spec.ts`).
- `/habits`, `/rituals`, `/focus` routes are reachable; bottom nav surfaces Habits + Rituals; sidebar adds Focus, Patterns, Review.
- FocusMode start/stop now works for guests too (no auth gate) and has an explicit Stop button alongside Discard.
- Error boundary wraps the app shell; delete confirmations are in place on Habits and Journal.
- The mobile FAB / stale Vercel references called out in older status items no longer exist in the codebase.

## Parked

- Hook warnings (`react-hooks/set-state-in-effect` × ~30) are pre-existing tech debt. Touching them is a refactor, not a wrap-up.
- Secrets rotation is owned by the operator, not the codebase.
- Social sharing, public productivity feeds, heavy analytics, coaching, and quantified-self marketplace features are deferred — the app should stay private by default.
- New feature expansion waits until the AI layer that consumes this history is in flight.
