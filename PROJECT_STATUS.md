# Project Status

Last updated: 2026-06-04

## Current Scope

Today Little Log is a personal life PWA for daily scoring, journaling, rituals, habits, tasks, reflection, and a private no-zero-day scoreboard.

## Done

- The app deploys to Cloudflare Pages with Pages Functions.
- Turso/Drizzle, better-auth Google, and PWA behavior are part of the current architecture.
- Core product areas include scoreboard, journal, memory review, AM/PM rituals, focus planning, habits, tasks, Eisenhower planning, memento mori, and Google sign-in.
- Recent AI/product tasks added the first-entry CTA, streak recovery, weekly reflection preview, and private-by-default note.
- UI review and audit files document current design debt, mobile layout issues, and security/deployment risks.

## Planned Next

1. Fix the mobile floating-action-button stack overlap with the bottom navigation.
2. Rotate and purge previously committed secrets before treating production credentials as trustworthy.
3. Bring stale Vercel references into alignment with Cloudflare Pages deployment.
4. Reduce UI token drift, duplicated stat/tile patterns, accessibility gaps, and hook warnings.

## Deferred / Parked

- Social sharing and public productivity feeds are deferred; the app should stay private by default.
- Heavy analytics, coaching, or quantified-self marketplace features are parked.
- New feature expansion should wait until the core mobile daily loop is clean.
