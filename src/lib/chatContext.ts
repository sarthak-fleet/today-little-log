/**
 * Route-aware context builder for the floating chat assistant.
 *
 * Each builder returns a short markdown blob describing what the user is
 * looking at. The blob is appended to the system prompt so the model can
 * give answers grounded in the current page rather than generic chitchat.
 *
 * Builders read directly from the DOM by data-attribute. They never throw —
 * a missing surface just yields a smaller context.
 */

const BASE_PROMPT = `You are the in-app assistant for "Today Little Log", a personal life PWA. The user keeps a daily scoreboard of small habits, runs morning/evening rituals, journals, and tracks tasks. Be concise. Default to under 5 sentences unless the user asks for detail. When asked something you cannot answer from page context, say so plainly. Never invent metrics or dates that aren't in the context.`;

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

function collectAmRitual(): string | null {
  const intents = Array.from(document.querySelectorAll<HTMLInputElement>('[data-am-intent]'))
    .map((el) => el.value?.trim())
    .filter(Boolean);
  const regret = (document.querySelector<HTMLTextAreaElement>('[data-am-regret]')?.value ?? '').trim();
  if (intents.length === 0 && !regret) return null;
  const lines = ['Morning ritual draft:'];
  intents.forEach((i, idx) => lines.push(`- intent ${idx + 1}: ${i}`));
  if (regret) lines.push(`- regret line: ${regret}`);
  return lines.join('\n');
}

interface ContextBuilder {
  /** Section title used in the system prompt. */
  title: string;
  /** Returns extra context, or null if not applicable. */
  build: () => string | null;
}

const ROUTE_BUILDERS: Record<string, ContextBuilder[]> = {
  '/': [
    { title: 'Home', build: () => 'User is on the home page (hero + scoreboard + today journal entry).' },
    { title: 'Scoreboard', build: collectScoreboard },
    { title: 'Today entry', build: collectTodayEntry },
  ],
  '/rituals': [
    { title: 'Rituals', build: () => 'User is on the rituals page (morning + evening check-ins).' },
    { title: 'AM ritual', build: collectAmRitual },
  ],
  '/focus': [
    { title: 'Focus', build: () => 'User is on the focus page running a pomodoro session. They get an XP penalty if they tab away mid-session.' },
  ],
  '/memories': [
    { title: 'Memories', build: () => 'User is on the memories page browsing past journal entries.' },
  ],
  '/review': [
    { title: 'Review', build: () => 'User is on the review page seeing their last 7 days of scoreboard, AM/PM rituals, and journal.' },
  ],
  '/life': [
    { title: 'Life', build: () => 'User is on the memento mori life-weeks page.' },
  ],
  '/tasks': [
    { title: 'Tasks', build: () => 'User is on the tasks page (a flat list of tasks with priorities).' },
  ],
  '/eisenhower': [
    { title: 'Eisenhower', build: () => 'User is on the Eisenhower matrix (urgent/important quadrants).' },
  ],
};

/**
 * Build a system prompt + context blob for the current pathname.
 * The base prompt is always present; route-specific sections are appended
 * only if the corresponding builder returns content.
 */
export function buildChatSystemPrompt(pathname: string): string {
  const builders = ROUTE_BUILDERS[pathname] ?? [
    { title: 'Page', build: () => `User is on ${pathname}.` },
  ];

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
