import { PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HomeHero() {
  return (
    <section className="mx-auto mt-4 max-w-5xl px-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Today Little Log
        </p>
        <h1 className="mt-2 text-2xl font-display font-extrabold tracking-tight text-foreground md:text-3xl">
          Write one line about your day. Every day.
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
          A tiny daily log. Fill in what you did — sleep, exercise, focus — and get a score.
          Look back at how your month actually went. No guilt, no 27 dashboards.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-background p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sample entry — today
          </p>
          <div className="mt-3 space-y-2">
            <SampleRow label="Sleep" score="12/14" note="7.5h · woke at 6:30" />
            <SampleRow label="Exercise" score="8/10" note="30 min walk + stretch" />
            <SampleRow label="Focus" score="9/9" note="Deep work all morning" />
          </div>
          <p className="mt-3 text-sm italic text-muted-foreground">
            "Felt sharp today. The early start helped."
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#scoreboard"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            <PenLine className="h-4 w-4" />
            Write today's entry ↓
          </a>
          <Link
            to="/auth"
            className="inline-flex h-12 w-full items-center justify-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:w-auto"
          >
            Sign in to sync across devices
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Works without an account — your data stays in this browser. Sign in to sync across devices and install as an app.
        </p>
      </div>
    </section>
  );
}

function SampleRow({ label, score, note }: { label: string; score: string; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="w-16 shrink-0 text-sm font-semibold text-foreground">{label}</span>
      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
        {score}
      </span>
      <span className="truncate text-xs text-muted-foreground">{note}</span>
    </div>
  );
}
