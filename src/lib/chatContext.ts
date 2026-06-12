/**
 * Context builder for the floating chat assistant.
 *
 * Always appends recent habit/journal/timer history pulled from
 * localStorage so the model can answer "what did I do this week"
 * without a server round-trip. Route-specific builders add what's
 * visible on the current page on top of that.
 */

const BASE_PROMPT = `You are the in-app assistant for "Today Little Log", a personal life PWA. The user logs habits (with daily values), a journal, and timer sessions that auto-log into habits. Be concise. Default to under 5 sentences unless the user asks for detail. When asked something you cannot answer from the provided history, say so plainly. Never invent metrics or dates that aren't in the context.`;

interface StoredHabit {
  id: string;
  title: string;
  target_type: 'target' | 'limit';
  track_type: 'count' | 'time';
  frequency: 'daily' | 'weekly';
  target_value: number;
}
interface StoredHabitLog { id: string; habit_id: string; date: string; value: number }
interface StoredJournalEntry { id?: string; date?: string; content?: string; entry_type?: string }
interface StoredFocusSession { startedAt?: string; durationMin?: number; taskTitle?: string; habitId?: string | null }

function readJSON<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}

function safeText(selector: string): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const text = (el.textContent ?? '').trim();
  return text || null;
}

function collectScoreboard(): string | null {
  if (typeof document === 'undefined') return null;
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-scoreboard-item]'));
  if (items.length === 0) return null;
  const lines = items.slice(0, 20).map((el) => {
    const label = el.dataset.label ?? el.textContent?.trim() ?? 'item';
    const done = el.dataset.done === 'true' ? '✓' : '·';
    const kind = el.dataset.kind ?? 'check';
    return `- [${done}] ${label} (${kind})`;
  });
  return `Scoreboard for today:\n${lines.join('\n')}`;
}

function collectTodayEntry(): string | null {
  const entry = safeText('[data-today-entry]');
  return entry ? `Today's journal entry (excerpt):\n${entry.slice(0, 600)}` : null;
}

function collectHabitHistory(): string | null {
  const habits = readJSON<StoredHabit[]>('habits-data') ?? [];
  const logs = readJSON<StoredHabitLog[]>('habit-logs-data') ?? [];
  if (habits.length === 0 && logs.length === 0) return null;
  const byHabit = new Map(habits.map((h) => [h.id, h]));
  const recent = logs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  const lines: string[] = [];
  if (recent.length) {
    lines.push('Recent habit logs (most recent first):');
    for (const log of recent) {
      const h = byHabit.get(log.habit_id);
      const unit = h?.track_type === 'time' ? ' min' : '';
      lines.push(`- ${log.date} · ${h?.title ?? log.habit_id}: ${log.value}${unit}`);
    }
  }
  if (habits.length) {
    if (lines.length) lines.push('');
    lines.push('Defined habits:');
    for (const h of habits.slice(0, 20)) {
      const direction = h.target_type === 'limit' ? 'limit' : 'target';
      const unit = h.track_type === 'time' ? ' min' : '';
      lines.push(`- ${h.title} (${h.frequency}, ${direction} ${h.target_value}${unit})`);
    }
  }
  return lines.length ? lines.join('\n') : null;
}

function collectJournalHistory(): string | null {
  const entries = readJSON<StoredJournalEntry[]>('journal-entries-data') ?? [];
  if (entries.length === 0) return null;
  const recent = entries
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 7);
  const lines = ['Recent journal entries (last 7):'];
  for (const e of recent) {
    const content = (e.content ?? '').replace(/\s+/g, ' ').slice(0, 280);
    lines.push(`- ${e.date ?? '?'} [${e.entry_type ?? 'daily'}]: ${content}`);
  }
  return lines.join('\n');
}

function collectFocusContext(): string | null {
  const session = readJSON<StoredFocusSession>('tll:focus-session');
  if (!session?.startedAt) return null;
  const started = new Date(session.startedAt);
  const elapsedMin = Math.max(0, Math.round((Date.now() - started.getTime()) / 60_000));
  return `Active timer: "${session.taskTitle ?? '—'}" — ${elapsedMin}/${session.durationMin ?? '?'} min elapsed${session.habitId ? `, linked to habit ${session.habitId}` : ''}.`;
}

interface ContextBuilder {
  title: string;
  build: () => string | null;
}

const HISTORY_BUILDERS: ContextBuilder[] = [
  { title: 'Habit history', build: collectHabitHistory },
  { title: 'Journal history', build: collectJournalHistory },
  { title: 'Active timer', build: collectFocusContext },
];

const ROUTE_BUILDERS: Record<string, ContextBuilder[]> = {
  '/': [
    { title: 'Home', build: () => 'User is on the home page (hero + scoreboard + today journal entry).' },
    { title: 'Scoreboard', build: collectScoreboard },
    { title: 'Today entry', build: collectTodayEntry },
  ],
  '/habits': [
    { title: 'Habits page', build: () => 'User is on the habits page where they add/log/edit daily habits.' },
  ],
  '/journal': [
    { title: 'Journal page', build: () => 'User is on the journal page (daily entry + past entries list).' },
    { title: 'Today entry', build: collectTodayEntry },
  ],
  '/focus': [
    { title: 'Timer', build: () => 'User is on the timer (focus) page. They can start a block linked to a time-tracked habit; elapsed minutes are logged to that habit on stop.' },
  ],
  '/review': [
    { title: 'Review', build: () => 'User is on the review page seeing their last 7 days of scoreboard, AM/PM rituals, and journal.' },
  ],
  '/life': [
    { title: 'Life', build: () => 'User is on the memento mori life-weeks page.' },
  ],
};

/**
 * Build a system prompt + context blob for the current pathname.
 * The base prompt is always present; route-specific sections come first,
 * then the persistent history sections.
 */
export function buildChatSystemPrompt(pathname: string): string {
  const routeBuilders = ROUTE_BUILDERS[pathname] ?? [
    { title: 'Page', build: () => `User is on ${pathname}.` },
  ];
  const builders = [...routeBuilders, ...HISTORY_BUILDERS];

  const sections: string[] = [BASE_PROMPT];
  for (const b of builders) {
    let value: string | null;
    try {
      value = b.build();
    } catch {
      value = null;
    }
    if (value) sections.push(`## ${b.title}\n${value}`);
  }
  return sections.join('\n\n');
}
