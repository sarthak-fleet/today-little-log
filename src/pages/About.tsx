import { Link } from "react-router-dom";

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7">
      <Link to="/" className="text-xs text-muted-foreground hover:underline">
        ← Today
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">About</h1>
      <p className="mt-4">
        A personal-life PWA built around a single daily Scoreboard: you
        define the input items (e.g. &ldquo;movement&rdquo;, &ldquo;deep focus&rdquo;,
        &ldquo;no scrolling&rdquo;) and the min / ideal / max points for each.
        Each day, log the inputs and see your score against ideal &mdash;
        with no-zero-day streaks, monthly calendar view, and AM / PM
        rituals + journal feeding into it.
      </p>

      <h2 className="mt-8 text-base font-semibold">Surfaces</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><Link to="/" className="underline">Today</Link> &mdash; the Scoreboard plus a single entry into the day.</li>
        <li><Link to="/journal" className="underline">Journal</Link> &mdash; freeform note-taking, memories, daily reflections.</li>
        <li><Link to="/patterns" className="underline">Patterns</Link> &mdash; AI-surfaced patterns from your score + task data.</li>
        <li><Link to="/life" className="underline">Life</Link> &mdash; memento mori grid of life in weeks.</li>
        <li><Link to="/review" className="underline">Review</Link> &mdash; weekly retrospective with next-week planning.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Principles</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>One score, your axes. Not 27 dashboards.</li>
        <li>No streak guilt-tripping; no-zero-day is encouragement, not punishment.</li>
        <li>PWA-installable. Your data lives in your Turso DB scoped to your account.</li>
      </ul>
    </main>
  );
}
