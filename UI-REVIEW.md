# UI Review — Today Little Log (post-4h sprint)

**Date:** 2026-04-18
**Scope:** ~15 new components + 7 new pages + 3 modified files
**Baseline:** Tailwind v4 `@theme` tokens in `src/index.css`, shadcn slate base

## Pillar Scores

| Pillar            | Score | Verdict                                                                 |
|-------------------|:-----:|-------------------------------------------------------------------------|
| Visual hierarchy  | 16/20 | Strong hero pages, but home has too many stacked cards competing        |
| Typography        | 15/20 | `tracking-widest` + tiny uppercase is overused to the point of tic      |
| Spacing           | 17/20 | Consistent `rounded-2xl p-5 shadow-soft` pattern, one-off pixel widths  |
| Color             | 15/20 | Token drift — hardcoded `emerald-*`, `sky-*`, `amber-*`, `orange-*`     |
| Interaction       | 14/20 | Real mobile z-index / overlap bug at bottom-right stack                 |
| Accessibility     | 13/20 | Icon-only buttons missing aria on ~8 spots; `<kbd>` without proper role |

**Overall: 90 / 120 → 75/100**

---

## Top 5–10 Real Issues

### 1. BLOCK — Mobile FAB stack collides with BottomNav
- `BottomNav` (`src/components/BottomNav.tsx:19`) is `fixed bottom-0 h-14` → owns the bottom 56 px on mobile.
- `QuickLogFab` (`src/components/QuickLogFab.tsx:76`): `bottom-6 right-6` on mobile. Button is `h-14 w-14`, so its box is ~24–80 px from bottom → **sits on top of BottomNav**.
- `ChatBot` (`src/components/ChatBot.tsx:42`): `bottom-20 right-4` → 80–128 px.
- `UrgeButton` (`src/components/UrgeButton.tsx:78`): `bottom-24 right-6` → 96–144 px. **Overlaps ChatBot** on mobile (same right edge, 80–128 vs 96–144).
- Fix: on mobile, stack FABs above BottomNav. E.g. QuickLogFab `bottom-20`, UrgeButton `bottom-36`, ChatBot `bottom-52`. Or: hide ChatBot behind FAB until expanded. Desktop spacing is fine.

### 2. FLAG — Color token drift (emerald / sky / amber / orange hardcoded)
12 components use tailwind palette colors directly instead of semantic HSL vars. The custom warm theme in `src/index.css:82-121` has `--primary`, `--accent`, `--destructive`, but no success/info/warning tokens, so devs reach for `emerald-500` / `orange-600` / `sky-600` / `amber-600`.
- `LifeScoreBadge.tsx:13-16`, `StreakBadge.tsx:11` (destructive/primary fine, ok)
- `ManaBadge.tsx:9-11`: `orange-600 bg-orange-500/10`
- `PmRitual.tsx:83`: `bg-emerald-500 text-white` (plus `text-white` not `text-primary-foreground`)
- `QuickLogFab.tsx:12-15`: 4 hardcoded palette tones
- `ScheduleCheckin.tsx:34-37`, `AmRitual.tsx:22-25`, `DevRitualTracker.tsx:61`, `WeeklyReview.tsx:45`, `AmRitual.tsx:119`, `PmRitual.tsx:46`, `NowRecommender.tsx:51`: all lean on `emerald-600` for "success/done".
- `Goals.tsx:10-12`, `Goals.tsx:100-103`, `Goals.tsx:132-135`: hardcoded emerald on goal-category tone + +2/-2 buttons.
- Fix: add `--success: 142 71% 40%;` / `--warning: 30 90% 55%;` / `--info: 200 85% 50%;` to `src/index.css:71` and alias them in `@theme` at top of file, then do a sed across `emerald-(500|600)` → `success`, `orange-600` → `warning`. One commit, unlocks dark-mode parity.

### 3. FLAG — Repeated Stat/Tile markup screams for a component
Tile patterns are inlined in 6+ places with 90% identical JSX:
- `DevRitualTracker.tsx:114-123` (`Stat`) — has its own local component, good.
- `Life.tsx:66-73` (`Stat`) — duplicate implementation.
- `Food.tsx:194-208` (`MacroTile`) — third variant.
- `CraftHoursWidget.tsx:50-53`, `WeightTracker.tsx:52-97`, `DevRitualTracker.tsx:45-65` all repeat the `rounded-2xl bg-card border border-border p-5 shadow-soft` card header with icon + uppercase tracking label.
- Fix: extract `src/components/ui/StatTile.tsx` ({ icon, label, value, tone }) and `src/components/ui/RitualCard.tsx` ({ icon, title, children }). Delete 4 of the 6 copies. 50-ish lines net-negative.

### 4. FLAG — `tracking-widest` + tiny-uppercase abuse
53 occurrences across 22 components. The style is fine in isolation but on a screen like `Index.tsx` you see it 8+ times in one scroll (AM, PM, Weekly, Now, etc.), which dilutes the signal that was the whole point.
- Examples: `AmRitual.tsx:116,126,146,158,177`, `PmRitual.tsx:43,54,64,76`, `WeeklyReview.tsx:42,53,63`, `NowRecommender.tsx:48,60,65`, `DevRitualTracker.tsx:58,94,117,128`, etc.
- Fix: reserve the tiny-uppercase treatment for **section headers only** (one per card). Inside a card, use sentence-case `text-xs text-muted-foreground`. Halves the visual shouting.

### 5. FLAG — `text-white` instead of `text-primary-foreground` / `text-destructive-foreground`
- `PmRitual.tsx:83`: `bg-emerald-500 text-white` — breaks if someone ever inverts the success hue.
- Keep it consistent with token contract.

### 6. FLAG — Missing `aria-label` on icon-only buttons (real a11y gap)
Keyboard + screen-reader users get `button`-with-nothing.
- `Goals.tsx:139-141` — delete icon
- `Food.tsx:179-181` — delete icon
- `PmRitual.tsx:78-90` — 10 score buttons labelled only with a number (fine) but no `role="radiogroup"` / `aria-pressed`
- `WhatToDo.tsx:150-157` — mana-cost edit button (has `title`, no `aria-label`)
- `EisenhowerBoard.tsx:120-130` — Q1/Q2/Q3/Q4 chips use `title` but not `aria-label`; screen readers may or may not pick up `title`.
- `IdentitySetter.tsx:113-119` — edit pencil has `title` only.
- Fix: add `aria-label="Delete goal"` etc. 5-min job.

### 7. FLAG — Lint has 5 hooks warnings in your new code
From `pnpm lint` output:
- `AmRitual.tsx:92` — missing `todayRow` dep.
- `DevRitualTracker.tsx:25` — missing `todayLog` dep.
- `PmRitual.tsx:22` — missing `todayRow` dep.
- `ShockCard.tsx:55` — missing `user` dep (currently uses `user?.id` in body).
- `WeeklyReview.tsx:24` — missing `thisWeek` dep.

All five are the same pattern: `useEffect(() => { if (todayRow) setState(...) }, [todayRow?.id])`. This is intentional (you want "sync from server when the row identity changes, not on every local edit"), so the right fix is eslint-disable with a comment on each, **not** adding the dep (that would cause edit-state-clobber loops). Or extract to a `useSyncFromServer(id, fields)` hook.

### 8. FLAG — `useMemo` abused as an effect in EisenhowerBoard
`src/components/EisenhowerBoard.tsx:38`:
```
useMemo(() => { setTasks(incoming); }, [incoming]);
```
This calls `setState` inside `useMemo` — works by accident, violates React's "render must be pure" rule, and will break with StrictMode double-invoke. React 19 will warn.
- Fix: either use derived state (read `incoming` directly, drop local `tasks` state — you only need it for optimistic quadrant updates, which you can do via a `quadrantOverrides` map) or move the sync to `useEffect`.

### 9. PASS-with-note — ShockCard / Dialog z-index OK
`SleepLock` (`z-[60]`) correctly wins over Radix Dialog overlay (`z-50`) which is important — if you're in a `ShockCard` Dialog at 11:59 PM and bedtime hits at midnight, SleepLock should punch through. Good call.

### 10. FLAG — `<div>` overlay instead of `Dialog` in SleepLock
`src/components/SleepLock.tsx:86-118` hand-rolls a modal with `role="dialog"` + `aria-label` but:
- No focus trap (keyboard user can tab behind it).
- No `aria-modal="true"`.
- No escape-to-close (intentional? maybe — it's a lock — but document that).
- Fix: use `AlertDialog` from shadcn with `onOpenAutoFocus` prevented, OR keep custom but add focus-trap library / `inert` attr on siblings.

---

## Per-file verdicts

| File | Verdict | Notes |
|------|:-:|---|
| `ShockCard.tsx` | PASS | One hooks warning (line 55). Clean token usage. |
| `LifeWeeksGrid.tsx` | PASS | `shadow-[0_0_6px_hsl(var(--accent))]` at L56 is fine (arbitrary using token). |
| `FooterStamp.tsx` | PASS | Desktop-only by design. |
| `LifeScoreBadge.tsx` | FLAG | `emerald-*` hardcoded L13. Hidden on small screens L20 — intentional? |
| `StreakBadge.tsx` | PASS | Uses tokens cleanly. |
| `ManaBadge.tsx` | FLAG | `orange-*` hardcoded L10. `hidden md:flex` L15 hides mana from mobile users entirely — and mana is core to the WhatToDo ranking. Show a mini pill on mobile. |
| `IdentitySetter.tsx` | FLAG | Edit pencil L113-119 has `title` but no `aria-label`. Hover-only reveal (opacity 0 → 100) is invisible on touch devices. |
| `QuickLogFab.tsx` | BLOCK | L76 mobile position collides with BottomNav. Hardcoded palette tones L12-15. |
| `UrgeButton.tsx` | FLAG | L78 mobile position overlaps ChatBot. |
| `WeightTracker.tsx` | PASS | Uses `hsl(var(--primary))` cleanly in SVG. Good. |
| `AmRitual.tsx` | FLAG | Hooks warning L92. `orange-600` L23 hardcoded. |
| `PmRitual.tsx` | FLAG | `bg-emerald-500 text-white` L83. Hooks warning L22. Score row lacks radiogroup semantics. |
| `WeeklyReview.tsx` | PASS | Hooks warning L24 only. |
| `DevRitualTracker.tsx` | FLAG | Hooks warning L25. `emerald-600` L61. Duplicated `Stat` pattern with `Life.tsx:Stat` and `Food.tsx:MacroTile`. |
| `EisenhowerBoard.tsx` | FLAG | `useMemo` as side-effect L38. |
| `NowRecommender.tsx` | FLAG | Near-duplicate of `WhatToDo.tsx` page logic — rank + random code copy-pasted. |
| `CraftHoursWidget.tsx` | PASS | Clean. |
| `ScheduleCheckin.tsx` | FLAG | Status meta hardcoded palette L34-37. Serializing JSON into `value_text` is ingenious but fragile — one day add a proper `schedule_checkins` table. |
| `SleepLock.tsx` | FLAG | Hand-rolled dialog, no focus trap. `bg-black/90` L88 is fine but doesn't follow token system. |
| `SleepTargetSetter.tsx` | PASS | Width `w-[92px]` at L40,44 is pixel-specific; fine for personal tool. |
| `Life.tsx` | PASS | `Stat` duplicates the component elsewhere, otherwise clean. |
| `Weight.tsx` | PASS | Pure layout shell. |
| `Dev.tsx` | PASS | Pure layout shell. |
| `Eisenhower.tsx` | PASS | Uses `<a href>` L28 for in-app link — should be `<Link>` from react-router-dom. |
| `Food.tsx` | FLAG | `<a href>` would be an issue if used; uses delete icon without aria L179-181. |
| `Goals.tsx` | FLAG | `emerald-*` palette on GoalRow row buttons L132, L135. |
| `WhatToDo.tsx` | FLAG | Duplicates `NowRecommender` logic; `<a href>` at L82 (should be `Link`). |
| `Index.tsx` | FLAG | 8 staggered `animationDelay` inline-styles L119-181 should be a utility class. Home is card-soup — consider collapsing AM+PM+Weekly into one tabbed card. |
| `Navbar.tsx` | PASS | Cleanest of the new batch. `hidden sm:flex` / `hidden md:flex` L132, L145 hide 3 features from mobile but all 3 are desktop-nice-to-have. |
| `AppLayout.tsx` | FLAG | Hover zone `onMouseEnter` sidebar L25-33 has no keyboard equivalent — Tab-only users can't open sidebar. |
| `AppSidebar.tsx` | PASS | Inline styles for stagger-transition L59-66, L81-85 fine. |
| `useAuth.ts` | PASS | One hooks warning (pre-existing pattern). |
| `Schedule.tsx` | PASS | Modified, small scope. |

---

## Anti-patterns NOT found (the good news)

1. **No `<div onClick>`** — every clickable is a `<button>` or `<Link>`. Grep confirms.
2. **No hardcoded hex / rgb** in the 15 new files — everything is either a token alias or a palette word. (Only `ScheduleMaker.tsx` has raw `hsl(220,70%,55%)` but that's pre-existing color-picker data, not styling.)
3. **No inline pixel hardcoding of breakpoints** — responsive via Tailwind utilities throughout.
4. **Dark mode considered** — tokens flip correctly via `.dark` block in `src/index.css:123-170`.
5. **No skeleton snowflakes** — uses one pattern (`bg-muted/40 animate-pulse rounded-{N}`) consistently.

---

## Short summary

**Score: 75/100**

**Top 3 anti-patterns found**
1. Mobile FAB stack (QuickLog + Urge + ChatBot) overlaps BottomNav and each other — real visual collision, not a nitpick.
2. Color-token drift — 12 files hardcode `emerald-*` / `orange-*` / `amber-*` because the warm theme has no success/warning tokens. Dark mode will look inconsistent.
3. `tracking-widest uppercase text-[10px]` used 53× across 22 files — the "shouty micro-label" has become the default label style, killing hierarchy.

**Top 3 anti-patterns NOT found**
1. No `<div onClick>` — every interactive is a real button / link.
2. No raw hex / rgb in the new components — tokens or palette only.
3. No skeleton-state snowflakes — one pulse pattern across the app.

**Would I ship this?** Yes, with one required fix before merging: **reposition QuickLogFab / UrgeButton / ChatBot on mobile** so they don't sit on top of BottomNav. Everything else (color drift, tracking-abuse, duplicated tiles, 5 hooks warnings) is real but not blocking for a solo personal app — schedule a 90-minute "tokens + tiles" cleanup pass and you're good.
