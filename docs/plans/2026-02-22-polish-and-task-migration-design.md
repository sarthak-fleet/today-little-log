# Polish & Task Migration Design

## Goal

Add guest-to-auth task migration and fix 8 high-impact UI rough edges.

## 1. Guest-to-Auth Task Migration

**Problem:** When a guest logs in, localStorage tasks don't migrate to Supabase. Habits already do this.

**Solution:** In `useTasks.ts`, after loading Supabase tasks for a logged-in user, check `guest-tasks-data` in localStorage. If guest tasks exist and Supabase has none, batch insert them, then clear localStorage.

**Pattern:** Mirror `useHabits.ts` lines 62-91.

## 2. Standardize Page Padding

**Problem:** Pages use inconsistent vertical padding (`py-8 md:py-12`, `py-6`, `py-6 md:py-10`) and max-widths (`max-w-xl` vs `max-w-3xl`).

**Fix:** All pages use `py-6 md:py-8 px-4 max-w-3xl mx-auto`.

**Files:** Index.tsx, Habits.tsx, Tasks.tsx, TimeTracking.tsx, Schedule.tsx, Rules.tsx.

## 3. Delete Confirmation Dialogs

**Problem:** Deleting journal entries, tasks, and habits is instant with no confirmation.

**Fix:** Use existing `AlertDialog` from shadcn to wrap all delete actions. Consistent "Are you sure?" pattern.

**Files:** PastEntries.tsx, Tasks.tsx, Habits.tsx.

## 4. Standardize Empty States

**Problem:** Empty states look different across pages (dashed border vs icon+text vs nothing).

**Fix:** Consistent pattern: muted icon + heading + description + CTA button. Extract shared component if repetition is high.

**Files:** Habits.tsx, Tasks.tsx, PastEntries.tsx, TimeTracking.tsx.

## 5. Fix Touch Targets

**Problem:** Icon buttons (`h-7 w-7`, `h-8 w-8`) are below 44x44px minimum for mobile.

**Fix:** Ensure all interactive icon buttons have `min-h-[44px] min-w-[44px]` or use `size="icon"` with proper dimensions.

**Files:** PastEntries.tsx, Habits.tsx, Tasks.tsx, TimeTracking.tsx.

## 6. Standardize Page Headers

**Problem:** Each page has different heading styling and layout.

**Fix:** Consistent flex row with heading left + action buttons right, same text size across pages.

**Files:** Habits.tsx, Tasks.tsx, TimeTracking.tsx, Schedule.tsx, Rules.tsx.

## 7. Fix Sidebar Spacer

**Problem:** `AppLayout.tsx` uses `w-14` spacer but sidebar collapsed width may differ.

**Fix:** Match spacer to actual collapsed sidebar width.

**File:** AppLayout.tsx.

## 8. Add Error Boundary

**Problem:** No error fallback UI anywhere. Failed API calls silently fail.

**Fix:** Add a React error boundary component wrapping page content. Show friendly "Something went wrong" with retry button.

**Files:** New ErrorBoundary component, wrap in App.tsx or AppLayout.tsx.

## 9. Fix Mobile Schedule

**Problem:** ScheduleMaker timeline is unusable on small screens (70vh height, tiny labels).

**Fix:** On mobile, switch to a simplified vertical list view instead of the full timeline grid. Use `lg:` breakpoint to show full timeline.

**File:** ScheduleMaker.tsx.
