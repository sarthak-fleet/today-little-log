import { useState, useCallback } from 'react';
import { getAIConfig } from '@saas-maker/ai';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { useDevLogs } from '@/hooks/useDevLogs';
import { useUrgeLogs } from '@/hooks/useUrgeLogs';
import { useGoals } from '@/hooks/useGoals';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';

const STORAGE_KEY = 'chatbot-ai-config';
const CACHE_KEY = 'tll:weekly-report';

const SYSTEM_PROMPT = `You are the user's weekly performance reviewer.
Given 7 days of logs, write a 6-8 sentence review.
Structure:
1. Weight delta (bluntly).
2. Deep-work delivered vs promised.
3. Ritual consistency.
4. One behavioural pattern you see.
5. ONE prescription for next week (specific, 1 sentence).
No fluff. No emojis. No "great job". Direct.`;

/**
 * Sunday-auto (but callable any day) AI-generated weekly review.
 * Caches last response per week so re-visits don't waste tokens.
 */
export function WeeklyAutoReport() {
  const { rows: checkins } = useDailyCheckins();
  const { logs: weight, trajectory } = useWeightLogs();
  const { logs: dev } = useDevLogs();
  const { logs: urges } = useUrgeLogs();
  const { goals } = useGoals();

  const [report, setReport] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { week, text } = JSON.parse(raw);
      if (week === format(new Date(), 'RRRR-II')) return text;
      return null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const build = useCallback(() => {
    const weekAgo = subDays(new Date(), 7);
    const dw = dev.filter((l) => new Date(l.date) >= weekAgo);
    const cw = checkins.filter((c) => new Date(c.date) >= weekAgo);
    const uw = urges.filter((u) => new Date(u.logged_at) >= weekAgo);
    const deepMin = dw.reduce((s, l) => s + l.deep_work_minutes, 0);
    const leet = dw.reduce((s, l) => s + l.leetcode_count, 0);
    const commits = dw.reduce((s, l) => s + l.commits, 0);
    const hits = cw.filter((c) => c.hit).length;
    const sleepAvg = (() => {
      const v = cw.map((c) => c.sleep_hours).filter((x): x is number => x != null);
      return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 'n/a';
    })();
    const psiAvg = (() => {
      const v = cw.map((c) => c.psi_score).filter((x): x is number => x != null);
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 'n/a';
    })();
    const wstart = weight.length ? weight[weight.length - 1]?.kg : null;
    const wend = weight.length ? weight[0]?.kg : null;
    const wdelta = wstart != null && wend != null ? (wend - wstart).toFixed(1) : 'n/a';
    return [
      `Week: ${format(subDays(new Date(), 7), 'MMM d')}–${format(new Date(), 'MMM d')}`,
      trajectory ? `Weight: current ${trajectory.current}kg, target ${trajectory.target}kg, delta this week ${wdelta}kg` : '',
      `Deep work: ${Math.floor(deepMin / 60)}h${deepMin % 60}m across ${dw.length} days`,
      `LeetCode: ${leet} done, commits: ${commits}`,
      `Rituals hit: ${hits}/7 days`,
      `Sleep avg: ${sleepAvg}h`,
      `PSI avg: ${psiAvg}`,
      `Urges: ${uw.length} total (${uw.filter((u) => u.status === 'resisted').length} resisted, ${uw.filter((u) => u.status === 'acted').length} acted)`,
      goals.length ? `Goal probabilities: ${goals.map((g) => `${g.title}=${Math.round(g.probability)}%`).join('; ')}` : '',
    ].filter(Boolean).join('\n');
  }, [dev, checkins, urges, weight, trajectory, goals]);

  const fetchReport = useCallback(async () => {
    const cfg = getAIConfig(STORAGE_KEY);
    if (!cfg?.apiKey || !cfg?.endpointUrl || !cfg?.model) {
      setErr('Set the AI key in the chat settings first.');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: cfg.endpointUrl,
          apiKey: cfg.apiKey,
          model: cfg.model,
          systemPrompt: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: build() }],
        }),
      });
      const text = (await res.text()).trim();
      if (!res.ok || !text) { setErr('LLM returned nothing.'); return; }
      setReport(text);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ week: format(new Date(), 'RRRR-II'), text }));
      } catch { /* ignore */ }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [build]);

  const isSunday = new Date().getDay() === 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Brain className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">AI weekly review</span>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchReport} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {report ? (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{report}</p>
      ) : err ? (
        <p className="text-sm text-destructive">{err}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground italic">
            {isSunday ? 'It\'s Sunday. Get this week\'s verdict.' : 'Pull a mid-week gut-check.'}
          </p>
          <Button size="sm" onClick={fetchReport} disabled={loading}>
            Generate review
          </Button>
        </div>
      )}
    </div>
  );
}
