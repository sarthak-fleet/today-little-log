import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7">
      <Link to="/" className="text-xs text-muted-foreground hover:underline">
        ← Today
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Privacy</h1>
      <p className="mt-4 text-xs text-muted-foreground">Last updated: 2026-05-15.</p>

      <h2 className="mt-8 text-base font-semibold">What we store</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Google identity (id, name, email, avatar) when you sign in.</li>
        <li>Your Scoreboard items, daily logs, scores, and notes.</li>
        <li>Journal entries.</li>
        <li>Tasks and habits.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Where</h2>
      <p className="mt-2">
        Data lives in a Turso (libSQL) database scoped to your account.
        Sessions are stored in the same DB via better-auth. Secrets are
        Cloudflare Pages encrypted secrets &mdash; never in source.
      </p>

      <h2 className="mt-8 text-base font-semibold">What we don&apos;t do</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>No third-party analytics or remarketing pixels.</li>
        <li>No selling of journal or scoreboard data.</li>
        <li>PSI scoring (brain-pressure metric) runs against your configured AI provider; nothing is retained server-side beyond the score itself.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Deletion</h2>
      <p className="mt-2">
        Revoke the Google OAuth grant in your Google account to disconnect.
        Contact the maintainer to delete your full account data.
      </p>
    </main>
  );
}
