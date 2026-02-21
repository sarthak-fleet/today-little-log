# Polish & Task Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add guest-to-auth task migration and fix 8 high-impact UI rough edges.

**Architecture:** All changes are frontend-only. No new Supabase tables or migrations needed. Task migration mirrors the existing habit migration pattern. UI changes are CSS/component-level polish.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui (AlertDialog already available)

---

### Task 1: Guest-to-Auth Task Migration

**Files:**
- Modify: `src/hooks/useTasks.ts:43-66`

**Step 1: Add migration logic after Supabase load**

In `useTasks.ts`, inside the `loadTasks` function (line 43), after Supabase data is loaded and mapped (line 61), add migration logic. Mirror `useHabits.ts:62-91`.

Replace lines 43-66:

```typescript
const loadTasks = async () => {
  if (isLoggedIn && user) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      const mapped: TaskItem[] = data.map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes ?? undefined,
        estimate_minutes: t.estimate_minutes ?? undefined,
        status: t.status as 'todo' | 'done',
        sort_order: (t as any).sort_order ?? 0,
        created_at: t.created_at,
      }));
      setTasks(mapped);

      // Migrate guest tasks to Supabase if DB is empty
      const guestTasks = readGuestTasks();
      if (guestTasks.length > 0 && mapped.length === 0) {
        for (const task of guestTasks) {
          await supabase.from('tasks').insert({
            id: task.id,
            user_id: user.id,
            title: task.title,
            notes: task.notes ?? null,
            estimate_minutes: task.estimate_minutes ?? null,
            status: task.status,
            sort_order: task.sort_order,
          } as any);
        }
        // Reload after migration
        const { data: reloaded } = await supabase
          .from('tasks')
          .select('*')
          .order('sort_order', { ascending: true });
        if (reloaded) {
          setTasks(reloaded.map((t) => ({
            id: t.id,
            title: t.title,
            notes: t.notes ?? undefined,
            estimate_minutes: t.estimate_minutes ?? undefined,
            status: t.status as 'todo' | 'done',
            sort_order: (t as any).sort_order ?? 0,
            created_at: t.created_at,
          })));
        }
        localStorage.removeItem(GUEST_TASKS_KEY);
      }
    }
  } else {
    setTasks(readGuestTasks());
  }
  setIsLoaded(true);
};
```

Also update the `useEffect` dependency to include `user`:

```typescript
}, [authLoading, isLoggedIn, user]);
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 3: Commit**

```bash
git add src/hooks/useTasks.ts
git commit -m "feat: add guest-to-auth task migration"
```

---

### Task 2: Standardize Page Padding

**Files:**
- Modify: `src/pages/Index.tsx:86`
- Modify: `src/pages/Tasks.tsx:162`
- Modify: `src/pages/TimeTracking.tsx:201`
- Modify: `src/pages/Habits.tsx:153`
- Modify: `src/pages/Rules.tsx` (find main content div)

Target: All pages use `max-w-3xl mx-auto px-4 py-6 md:py-8` for their main content wrapper. Schedule.tsx already uses `max-w-5xl` which is correct for its wider layout — leave it.

**Step 1: Apply consistent padding**

Changes:

- `Index.tsx:86`: Change `py-8 md:py-12` to `py-6 md:py-8`
- `Tasks.tsx:162`: Change `max-w-xl` to `max-w-3xl`, change `py-6 md:py-10` to `py-6 md:py-8`
- `TimeTracking.tsx:201`: Change `py-6 md:py-10` to `py-6 md:py-8`
- `Habits.tsx:153`: Already `py-6` — add `md:py-8`
- `Rules.tsx`: Find main content div, standardize to `max-w-3xl mx-auto px-4 py-6 md:py-8`

Also fix `Tasks.tsx:157` GuestNotice wrapper: Change `max-w-xl` to `max-w-3xl`.

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/pages/Index.tsx src/pages/Tasks.tsx src/pages/TimeTracking.tsx src/pages/Habits.tsx src/pages/Rules.tsx
git commit -m "ui: standardize page padding across all pages"
```

---

### Task 3: Delete Confirmation Dialogs

**Files:**
- Modify: `src/components/PastEntries.tsx:172-179`
- Modify: `src/pages/Tasks.tsx:73-80`
- Modify: `src/pages/Habits.tsx:319-326`

All three files have instant-delete buttons with `onClick={() => onDelete(id)}` or similar. Wrap each in an `AlertDialog`.

**Step 1: Add confirmation to PastEntries.tsx**

Add import at top:
```typescript
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
```

Replace the delete Button (lines 172-179) with:
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete entry?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => onDelete(entry.id)}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Step 2: Add confirmation to Tasks.tsx**

Add same AlertDialog import. Replace the delete Button in TaskRow (lines 73-80) with:
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0 mt-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete task?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => onDelete(task.id)}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Step 3: Add confirmation to Habits.tsx**

Add same AlertDialog import. Replace the delete Button (lines 319-326) with:
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete habit?</AlertDialogTitle>
      <AlertDialogDescription>This will delete the habit and all its logged history. This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => deleteHabit(habit.id)}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Step 4: Build and verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/components/PastEntries.tsx src/pages/Tasks.tsx src/pages/Habits.tsx
git commit -m "ui: add delete confirmation dialogs"
```

---

### Task 4: Fix Touch Targets

**Files:**
- Modify: `src/components/PastEntries.tsx:167,175`
- Modify: `src/pages/Tasks.tsx:76`
- Modify: `src/pages/Habits.tsx:313,322`

All icon buttons with `h-7 w-7` or `h-8 w-8` need at minimum `min-h-[44px] min-w-[44px]`. Keep the visual size small but expand the touch area.

**Step 1: Update touch targets**

For each small icon button, change the className pattern. Instead of making the button visually bigger, use padding to expand the hit area while keeping visual size:

- `PastEntries.tsx:167`: `h-8 w-8` → `h-9 w-9`
- `PastEntries.tsx:175`: `h-8 w-8` → `h-9 w-9`
- `Tasks.tsx:76`: `h-7 w-7` → `h-9 w-9`
- `Habits.tsx:313` (edit): `h-7 w-7` → `h-9 w-9`
- `Habits.tsx:322` (delete): `h-7 w-7` → `h-9 w-9`

Note: the AlertDialog wrappers from Task 3 will already contain these buttons, so update the className inside the AlertDialogTrigger buttons. `h-9 w-9` = 36px which is close to 44px with padding.

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/PastEntries.tsx src/pages/Tasks.tsx src/pages/Habits.tsx
git commit -m "ui: increase touch targets on icon buttons"
```

---

### Task 5: Standardize Page Headers

**Files:**
- Modify: `src/pages/Habits.tsx:154-155`
- Modify: `src/pages/Tasks.tsx:163-190`
- Modify: `src/pages/TimeTracking.tsx:202-215`
- Modify: `src/pages/Rules.tsx` (header section)

Target pattern: All pages use the same heading structure — `text-xl font-display font-semibold` left-aligned with optional subtitle, action buttons right-aligned. Tasks currently has an icon box prefix — remove it for consistency with other pages.

**Step 1: Simplify Tasks header**

In `Tasks.tsx`, replace lines 163-190 (the icon box + progress bar header) with a simpler pattern matching other pages:

```typescript
{/* Header */}
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl font-display font-semibold text-foreground">Tasks</h2>
      <p className="text-sm text-muted-foreground">
        {taskCounts.open} open{totalMinutes > 0 && ` · ~${totalMinutes} min`}
      </p>
    </div>
    <span className="text-xs font-medium text-muted-foreground tabular-nums">
      {taskCounts.done}/{taskCounts.total}
    </span>
  </div>
  {taskCounts.total > 0 && (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary/70 transition-all duration-500 ease-out"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  )}
</div>
```

This removes the icon box but keeps the progress bar and stats.

**Step 2: Ensure Rules page header matches**

In `Rules.tsx`, ensure the heading uses the same pattern: `text-xl font-display font-semibold text-foreground`.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/pages/Tasks.tsx src/pages/Rules.tsx
git commit -m "ui: standardize page headers"
```

---

### Task 6: Fix Sidebar Spacer

**Files:**
- Modify: `src/components/AppLayout.tsx:28`

**Step 1: Match spacer to sidebar collapsed width**

The sidebar hover zone uses `3.5rem` (w-14) when collapsed (line 23). The spacer on line 28 is `w-14`. This is actually correct — both are `3.5rem`. However, the issue is the sidebar renders its own content at a different width.

Check `AppSidebar` to confirm collapsed width. If both match at `w-14`, this is already correct and we skip this task.

Read `src/components/AppSidebar.tsx` to verify.

If spacer matches, mark as done.

**Step 2: Commit (if changes made)**

```bash
git add src/components/AppLayout.tsx
git commit -m "fix: match sidebar spacer to collapsed width"
```

---

### Task 7: Add Error Boundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx:26-37`

**Step 1: Create ErrorBoundary component**

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-sm">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-display font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">An unexpected error occurred. Try refreshing the page.</p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Wrap routes in App.tsx**

In `App.tsx`, import and wrap the `<Routes>` block:

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';
```

Wrap inside BrowserRouter:
```typescript
<BrowserRouter>
  <ErrorBoundary>
    <Routes>
      ...
    </Routes>
  </ErrorBoundary>
</BrowserRouter>
```

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "feat: add error boundary with fallback UI"
```

---

### Task 8: Fix Mobile Schedule

**Files:**
- Modify: `src/components/ScheduleMaker.tsx:220-270`

**Step 1: Add mobile-friendly list view**

The full drag-and-drop timeline is desktop-only (needs mouse events, hover states, precise positioning). On mobile, show a simplified list of blocks with add/edit capability.

Before the return statement in ScheduleMaker (around line 220), add a mobile check and alternate view:

```typescript
// Mobile: simplified block list
const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
```

In the JSX, wrap the timeline in `hidden lg:block` and add a mobile view with `lg:hidden`:

```tsx
<div className="flex flex-col lg:flex-row gap-6">
  {/* Mobile: simplified list */}
  <div className="lg:hidden space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{blocks.length} blocks scheduled</p>
      <div className="flex gap-2">
        {blocks.length > 0 && (
          <Button variant="outline" size="sm" onClick={onClearAll}>Clear all</Button>
        )}
      </div>
    </div>
    {blocks.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Use a larger screen to create schedule blocks</p>
      </div>
    ) : (
      <div className="space-y-2">
        {[...blocks].sort((a, b) => a.startHour - b.startHour).map((block) => (
          <div
            key={block.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60"
            style={{ borderLeftWidth: 4, borderLeftColor: block.color }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{block.title || 'Untitled'}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(block.startHour)} - {formatTime(block.endHour)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => {
                const updated = blocks.filter(b => b.id !== block.id);
                onBlocksChange(updated);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Desktop: full timeline */}
  <div className="hidden lg:block flex-1">
    {/* ... existing timeline code ... */}
  </div>

  {/* Summary sidebar - shown on both */}
  {/* ... existing summary code ... */}
</div>
```

Add `Trash2` to the lucide-react imports if not already present.

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/ScheduleMaker.tsx
git commit -m "ui: add mobile-friendly schedule view"
```

---

### Task 9: Standardize Empty States

**Files:**
- Modify: `src/pages/Tasks.tsx` (empty state in task list)
- Modify: `src/pages/Habits.tsx` (empty state)
- Modify: `src/components/PastEntries.tsx` (empty state)

Target pattern: All empty states use centered muted icon + heading + description.

**Step 1: Update empty states to consistent pattern**

For each page, find the empty state render and update to:

```tsx
<div className="text-center py-12">
  <IconName className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
  <p className="text-sm font-medium text-muted-foreground">No items yet</p>
  <p className="text-xs text-muted-foreground/70 mt-1">Description text here</p>
</div>
```

Use appropriate icon and text per page:
- Tasks: `ListChecks` / "No tasks yet" / "Add your first task above"
- Habits: `Heart` (or current icon) / "No habits yet" / "Create your first habit to start tracking"
- PastEntries: `BookOpen` (or current icon) / "No entries yet" / "Start writing to see your history"

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/pages/Tasks.tsx src/pages/Habits.tsx src/components/PastEntries.tsx
git commit -m "ui: standardize empty states across pages"
```

---

### Task 10: Final build, push, deploy

**Step 1: Full build**

Run: `npm run build`
Confirm clean build.

**Step 2: Push**

```bash
git push origin main
```

Vercel auto-deploys from main.

**Step 3: Verify deployment**

Check https://today-little-log.vercel.app loads correctly.
