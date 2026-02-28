import type { JournalEntry } from '@/hooks/useJournalEntries';
import type { Habit, HabitLog } from '@/hooks/useHabits';
import type { TaskItem } from '@/hooks/useTasks';
import type { TimeBlock } from '@/hooks/useSchedule';
import type { LifeRule } from '@/hooks/useLifeRules';
import type { Emotion } from '@/hooks/useEmotions';
import { format } from 'date-fns';

export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": "Journal page — daily journal entries organized by categories. Users write reflections and log emotions.",
  "/habits": "Habits page — habit tracker with targets (do more) and limits (do less).",
  "/tasks": "Tasks page — task list with status tracking and time estimates.",
  "/schedule": "Schedule page — time blocks on a daily timeline.",
  "/rules": "Life Rules page — ordered list of personal principles.",
};

export interface LiveData {
  entries?: JournalEntry[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
  tasks?: TaskItem[];
  blocks?: TimeBlock[];
  rules?: LifeRule[];
  emotions?: Emotion[];
}

function serializeJournal(entries: JournalEntry[]): string {
  if (!entries.length) return 'No journal entries yet.';
  const lines = entries.slice(0, 20).map(e =>
    `- [${e.date}] (${e.entry_type}): ${e.content.slice(0, 300)}${e.content.length > 300 ? '...' : ''}`
  );
  return `Recent journal entries (${entries.length} total):\n${lines.join('\n')}`;
}

function serializeHabits(habits: Habit[], logs: HabitLog[]): string {
  if (!habits.length) return 'No habits tracked yet.';
  const today = format(new Date(), 'yyyy-MM-dd');
  const lines = habits.map(h => {
    const todayLog = logs.find(l => l.habit_id === h.id && l.date === today);
    const val = todayLog ? todayLog.value : 0;
    return `- ${h.title} (${h.target_type}, ${h.frequency}): ${val}/${h.target_value} ${h.track_type === 'time' ? 'min' : 'count'}`;
  });
  return `Habits (${habits.length}):\n${lines.join('\n')}`;
}

function serializeTasks(tasks: TaskItem[]): string {
  if (!tasks.length) return 'No tasks yet.';
  const open = tasks.filter(t => t.status === 'todo');
  const done = tasks.filter(t => t.status === 'done');
  const lines = open.slice(0, 25).map(t =>
    `- [ ] ${t.title}${t.estimate_minutes ? ` (~${t.estimate_minutes}m)` : ''}${t.notes ? ` — ${t.notes.slice(0, 100)}` : ''}`
  );
  if (open.length > 25) lines.push(`  ...and ${open.length - 25} more open tasks`);
  const doneLines = done.slice(0, 5).map(t => `- [x] ${t.title}`);
  return `Tasks (${open.length} open, ${done.length} done):\n${lines.join('\n')}${doneLines.length ? '\nRecently completed:\n' + doneLines.join('\n') : ''}`;
}

function serializeSchedule(blocks: TimeBlock[]): string {
  if (!blocks.length) return 'No time blocks scheduled today.';
  const sorted = [...blocks].sort((a, b) => a.startHour - b.startHour);
  const lines = sorted.map(b => {
    const startH = Math.floor(b.startHour);
    const startM = Math.round((b.startHour - startH) * 60);
    const endH = Math.floor(b.endHour);
    const endM = Math.round((b.endHour - endH) * 60);
    const fmt = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return `- ${fmt(startH, startM)}-${fmt(endH, endM)}: ${b.title}`;
  });
  return `Today's schedule (${blocks.length} blocks):\n${lines.join('\n')}`;
}

function serializeRules(rules: LifeRule[]): string {
  if (!rules.length) return 'No life rules set yet.';
  const capped = rules.slice(0, 30);
  const lines = capped.map((r, i) => `${i + 1}. ${r.content.slice(0, 200)}`);
  if (rules.length > 30) lines.push(`  ...and ${rules.length - 30} more rules`);
  return `Life rules (${rules.length}):\n${lines.join('\n')}`;
}

function serializeEmotions(emotions: Emotion[]): string {
  if (!emotions.length) return '';
  const recent = emotions.slice(0, 10);
  const lines = recent.map(e =>
    `- ${e.emotion}${e.comment ? `: ${e.comment}` : ''} (${format(new Date(e.logged_at), 'MMM d, h:mm a')})`
  );
  return `Recent emotions:\n${lines.join('\n')}`;
}

export function buildLiveContext(pathname: string, data: LiveData): string {
  const pageDesc = PAGE_DESCRIPTIONS[pathname] || `Page: ${pathname}`;
  const parts: string[] = [pageDesc, ''];

  // Always include what's relevant to the current page first
  switch (pathname) {
    case '/':
      if (data.entries) parts.push(serializeJournal(data.entries));
      if (data.emotions?.length) parts.push(serializeEmotions(data.emotions));
      break;
    case '/habits':
      if (data.habits) parts.push(serializeHabits(data.habits, data.habitLogs || []));
      break;
    case '/tasks':
      if (data.tasks) parts.push(serializeTasks(data.tasks));
      break;
    case '/schedule':
      if (data.blocks) parts.push(serializeSchedule(data.blocks));
      break;
    case '/rules':
      if (data.rules) parts.push(serializeRules(data.rules));
      break;
  }

  // Also include cross-page context (abbreviated) so the AI has a full picture
  parts.push('\n--- Other data for context ---');
  if (pathname !== '/' && data.entries?.length)
    parts.push(serializeJournal(data.entries.slice(0, 5)));
  if (pathname !== '/habits' && data.habits?.length)
    parts.push(serializeHabits(data.habits, data.habitLogs || []));
  if (pathname !== '/tasks' && data.tasks?.length)
    parts.push(serializeTasks(data.tasks));
  if (pathname !== '/schedule' && data.blocks?.length)
    parts.push(serializeSchedule(data.blocks));
  if (pathname !== '/rules' && data.rules?.length)
    parts.push(serializeRules(data.rules));
  if (pathname !== '/' && data.emotions?.length)
    parts.push(serializeEmotions(data.emotions));

  return parts.filter(Boolean).join('\n');
}

// Keep the old function for backwards compat
export function getPageDescription(pathname: string): string {
  return PAGE_DESCRIPTIONS[pathname] || `Page: ${pathname}`;
}
