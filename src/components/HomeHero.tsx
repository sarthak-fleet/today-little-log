import { Link } from 'react-router-dom';
import { CalendarDays, LineChart, Sparkles } from 'lucide-react';

/**
 * Light, honest landing hero shown to first-time (guest) visitors above the
 * scoreboard. today-little-log is a personal tool, so marketing is
 * intentionally minimal — a clear one-line value prop, three real features,
 * and a how-it-works line. No testimonials, no invented stats.
 */
export function HomeHero() {
  return (
    <section className="mx-auto mt-4 max-w-5xl px-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Today Little Log
        </p>
        <h1 className="mt-2 text-2xl font-display font-extrabold tracking-tight text-foreground md:text-3xl">
          One daily scoreboard — your axes, your points.
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
          A personal daily tracker. Define the input items that matter to you
          and the points for each, log them every day, and see your score
          against your own ideal. No streak guilt, no 27 dashboards.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Feature
            icon={<LineChart className="h-4 w-4" />}
            title="Your scoreboard"
            body="Custom items with min / ideal / max points. Score the day, not a checkbox."
          />
          <Feature
            icon={<CalendarDays className="h-4 w-4" />}
            title="Month at a glance"
            body="A calendar of every day's score so trends are obvious."
          />
          <Feature
            icon={<Sparkles className="h-4 w-4" />}
            title="Rituals & journal"
            body="AM/PM rituals and a freeform journal feed into the same day."
          />
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          How it works: try it as a guest right below — your data stays in this
          browser. Sign in to sync it across devices and install it as an app.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            to="/auth"
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in to sync
          </Link>
          <Link
            to="/about"
            className="inline-flex h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-foreground">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}
