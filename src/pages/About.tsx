import { useState } from 'react';
import { Link } from 'react-router-dom';

type ExportResult = { ok: true; error?: undefined } | { ok: false; error: string };

async function downloadExport(): Promise<ExportResult> {
  try {
    const res = await fetch('/api/data-export', { credentials: 'include' });
    if (res.status === 401) return { ok: false, error: 'Sign in to export your data.' };
    if (!res.ok) return { ok: false, error: `Export failed (${res.status}).` };
    const blob = await res.blob();
    const fromHeader = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1];
    const filename = fromHeader ?? `today-little-log-${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export default function About() {
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    setExportState('loading');
    setExportError(null);
    const result = await downloadExport();
    if (result.ok) {
      setExportState('ok');
      setTimeout(() => setExportState('idle'), 2400);
      return;
    }
    setExportState('err');
    setExportError(result.error ?? 'Export failed.');
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7">
      <Link to="/" className="text-xs text-muted-foreground hover:underline">
        ← Today
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">About</h1>
      <p className="mt-4">
        A personal-life PWA built around a single daily Scoreboard: you define the input items (e.g.
        &ldquo;movement&rdquo;, &ldquo;deep focus&rdquo;, &ldquo;no scrolling&rdquo;) and the min /
        ideal / max points for each. Each day, log the inputs and see your score against ideal
        &mdash; with no-zero-day streaks, monthly calendar view, and AM / PM rituals + journal
        feeding into it.
      </p>

      <h2 className="mt-8 text-base font-semibold">Surfaces</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <Link to="/" className="underline">
            Today
          </Link>{' '}
          &mdash; the Scoreboard plus a single entry into the day.
        </li>
        <li>
          <Link to="/journal" className="underline">
            Journal
          </Link>{' '}
          &mdash; freeform note-taking, memories, daily reflections.
        </li>
        <li>
          <Link to="/patterns" className="underline">
            Patterns
          </Link>{' '}
          &mdash; AI-surfaced patterns from your score + task data.
        </li>
        <li>
          <Link to="/life" className="underline">
            Life
          </Link>{' '}
          &mdash; memento mori grid of life in weeks.
        </li>
        <li>
          <Link to="/review" className="underline">
            Review
          </Link>{' '}
          &mdash; weekly retrospective with next-week planning.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Principles</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>One score, your axes. Not 27 dashboards.</li>
        <li>No streak guilt-tripping; no-zero-day is encouragement, not punishment.</li>
        <li>PWA-installable. Your data lives in your Turso DB scoped to your account.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Your data</h2>
      <p className="mt-2 text-muted-foreground">
        Download a single JSON file with every row scoped to your account &mdash; scoreboard items +
        logs, habits + habit logs, tasks, journal, daily check-ins, weekly reviews, the lot. Useful
        as a backup, or if you ever want to leave.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exportState === 'loading'}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted/40 disabled:opacity-50"
        >
          {exportState === 'loading' ? 'Preparing…' : 'Export my data (JSON)'}
        </button>
        {exportState === 'ok' && <span className="text-xs text-emerald-500">Downloaded.</span>}
        {exportState === 'err' && exportError && (
          <span className="text-xs text-rose-500">{exportError}</span>
        )}
      </div>
    </main>
  );
}
