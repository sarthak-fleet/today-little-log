import { useEffect, useState, useCallback } from 'react';
import { getAIConfig } from '@saas-maker/ai';
import { currentShift, type Shift } from '@/lib/protocol';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { useDevLogs } from '@/hooks/useDevLogs';
import { useMana } from '@/hooks/useMana';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const STORAGE_KEY = 'chatbot-ai-config';
const LAST_SHIFT_KEY = 'tll:coach:last-shift-shown';
const LAST_MESSAGE_KEY = 'tll:coach:last-message';

const SYSTEM_PROMPT = `You are the user's drill-sergeant life coach. Tone: direct, short, no hedging, no pleasantries.
You have ONE job per call: tell the user what to do RIGHT NOW given the data below.
Rules:
- 2-4 sentences MAX.
- Call out specific metrics when bad (weight flat, rituals skipped, mana low).
- Do not explain. Do not coach feelings. Prescribe.
- If user is inside Shift 3 (deep work), tell them what to open and for how long.
- If user missed a ritual, name it and say fix it now.
- If user is in Sleep or Wind-down, tell them to close the app.
- Use the identity statement if provided.`;

interface CoachMessage { text: string; ts: string }

/**
 * Passive-aggressive drill sergeant. Fires once per shift boundary.
 * Uses BYOK AI config (same as /chat). Falls back to canned messages
 * when no AI key. Persisted last message in localStorage so reload
 * keeps the last nudge visible.
 */
export function AICoach() {
  const { user, profile } = useAuth({ includeProfile: true });
  const { todayRow } = useDailyCheckins();
  const { logs: weight, trajectory } = useWeightLogs();
  const { todayLog: devToday, weekSummary: devWeek } = useDevLogs();
  const { state: mana } = useMana();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<CoachMessage | null>(() => {
    try {
      const raw = localStorage.getItem(LAST_MESSAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [shift, setShift] = useState<Shift>(() => currentShift());

  // Re-evaluate shift every minute.
  useEffect(() => {
    const i = window.setInterval(() => setShift(currentShift()), 60_000);
    return () => window.clearInterval(i);
  }, []);

  const buildPrompt = useCallback(() => {
    const amFilled = !!(todayRow?.am_intents?.length || todayRow?.am_regret);
    const pmFilled = !!(todayRow?.pm_wins || todayRow?.pm_wastes || todayRow?.pm_score);
    const weightToday = weight.some((w) => w.date === format(new Date(), 'yyyy-MM-dd'));
    const lines = [
      profile?.identity_statement ? `User identity: "${profile.identity_statement}"` : null,
      `Current shift: ${shift.label}. CTA: ${shift.nowCta}`,
      `Current time: ${format(new Date(), 'HH:mm')}`,
      `AM ritual today: ${amFilled ? 'done' : 'MISSING'}`,
      `PM ritual today: ${pmFilled ? 'done' : 'open'}`,
      `Weight logged today: ${weightToday ? 'yes' : 'no'}`,
      trajectory ? `Weight current: ${trajectory.current} kg, target: ${trajectory.target} kg, trend: ${(trajectory.kgPerDay * 7).toFixed(2)} kg/wk` : null,
      todayRow?.sleep_hours != null ? `Sleep last night: ${todayRow.sleep_hours}h` : null,
      todayRow?.psi_score != null ? `PSI right now: ${todayRow.psi_score}/100` : null,
      mana ? `Mana: ${mana.bank_remaining}/${mana.daily_max}` : null,
      devToday ? `Today deep-work: ${devToday.deep_work_minutes}min, leet: ${devToday.leetcode_count}` : null,
      devWeek ? `This week deep-work: ${Math.floor(devWeek.deepWork / 60)}h, leet: ${devWeek.leetcode}` : null,
    ].filter(Boolean).join('\n');
    return lines;
  }, [profile?.identity_statement, shift, todayRow, weight, trajectory, mana, devToday, devWeek]);

  const fetchNudge = useCallback(async () => {
    const config = getAIConfig(STORAGE_KEY);
    if (!config?.apiKey || !config?.endpointUrl || !config?.model) {
      // Canned fallback
      const fallback = cannedMessage(shift, todayRow);
      const msg = { text: fallback, ts: new Date().toISOString() };
      setMessage(msg);
      try { localStorage.setItem(LAST_MESSAGE_KEY, JSON.stringify(msg)); } catch { /* ignore */ }
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: config.endpointUrl,
          apiKey: config.apiKey,
          model: config.model,
          systemPrompt: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildPrompt() }],
        }),
      });
      const text = await res.text();
      const msg = { text: text.trim() || cannedMessage(shift, todayRow), ts: new Date().toISOString() };
      setMessage(msg);
      try { localStorage.setItem(LAST_MESSAGE_KEY, JSON.stringify(msg)); } catch { /* ignore */ }
    } catch {
      const fallback = cannedMessage(shift, todayRow);
      const msg = { text: fallback, ts: new Date().toISOString() };
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [shift, todayRow, buildPrompt]);

  // Fire once per shift transition per calendar day.
  useEffect(() => {
    if (!user) return;
    const key = format(new Date(), 'yyyy-MM-dd') + ':' + shift.id;
    let last: string | null = null;
    try { last = localStorage.getItem(LAST_SHIFT_KEY); } catch { /* ignore */ }
    if (last === key) return;
    try { localStorage.setItem(LAST_SHIFT_KEY, key); } catch { /* ignore */ }
    fetchNudge();
    setOpen(true);
  }, [user, shift.id, fetchNudge]);

  if (!user) return null;

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-40 right-6 md:bottom-48 md:right-6 z-40 h-12 w-12 rounded-full bg-accent text-accent-foreground shadow-lg hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Coach"
        title="Coach"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed bottom-56 right-6 md:right-6 z-40 w-[calc(100vw-3rem)] max-w-sm rounded-2xl bg-card border border-accent/40 shadow-card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent">
              <MessageSquare className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">Coach</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={fetchNudge} disabled={loading} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {loading && !message ? (
            <div className="text-sm text-muted-foreground italic">thinking…</div>
          ) : message ? (
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{message.text}</div>
          ) : (
            <div className="text-sm text-muted-foreground italic">No nudge yet. Tap refresh.</div>
          )}
          <div className="text-[10px] text-muted-foreground">
            Shift: <span className="font-mono">{shift.label}</span>
          </div>
          <Button size="sm" variant="ghost" className="w-full text-xs" onClick={fetchNudge} disabled={loading}>
            Push me harder
          </Button>
        </div>
      )}
    </>
  );
}

function cannedMessage(shift: Shift, checkin: { am_intents?: string[] | null; am_regret?: string | null; pm_wins?: string | null; pm_wastes?: string | null; pm_score?: number | null } | null): string {
  const amFilled = !!(checkin?.am_intents?.length || checkin?.am_regret);
  const pmFilled = !!(checkin?.pm_wins || checkin?.pm_wastes || checkin?.pm_score);
  if (shift.id === 'wake' && !amFilled) return 'AM ritual. 3 intents + regret line. Do it now before you open anything else.';
  if (shift.id === 'workout') return 'Workout. 45 min. No negotiation. Log it before you shower.';
  if (shift.id === 'shift3a') return 'Shift 3 Block A started. LeetCode or side-project. 1h 45m on one thing. Phone in other room.';
  if (shift.id === 'shift3b') return 'Shift 3 Block B. Applications or interview prep. 2h. No switching.';
  if (shift.id === 'pm-ritual' && !pmFilled) return 'PM ritual open. Wins. Wastes. Score 1-10. Weight. Then sleep.';
  if (shift.id === 'winddown') return 'Wind down. Paper book only. Dim the lights. Bedtime in 1h.';
  if (shift.id === 'sleep') return 'Sleep. Close the app. Phone on DND.';
  return shift.nowCta;
}
