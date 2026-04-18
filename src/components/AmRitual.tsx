import { useEffect, useState } from 'react';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sunrise, Check, Gauge } from 'lucide-react';

const MAX_INTENTS = 3;

function PsiSlider() {
  const { todayRow, save } = useDailyCheckins();
  const [value, setValue] = useState<number>(todayRow?.psi_score ?? 50);

  useEffect(() => {
    if (todayRow?.psi_score != null) setValue(todayRow.psi_score);
  }, [todayRow?.id, todayRow?.psi_score]);

  const tone = value >= 80 ? 'text-destructive'
    : value >= 60 ? 'text-orange-600'
    : value >= 40 ? 'text-primary'
    : 'text-emerald-600';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Gauge className="h-3 w-3" /> Brain pressure (PSI)
        </label>
        <span className={`text-sm font-display font-bold tabular-nums ${tone}`}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        onMouseUp={() => save({ psi_score: value })}
        onTouchEnd={() => save({ psi_score: value })}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-widest">
        <span>calm</span>
        <span>steady</span>
        <span className="text-destructive">about to explode</span>
      </div>
    </div>
  );
}

export function AmRitual() {
  const { user } = useAuth();
  const { todayRow, save } = useDailyCheckins();
  const [intents, setIntents] = useState<string[]>(['', '', '']);
  const [regret, setRegret] = useState('');
  const [sleep, setSleep] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (todayRow) {
      const arr = todayRow.am_intents ?? [];
      setIntents([arr[0] ?? '', arr[1] ?? '', arr[2] ?? '']);
      setRegret(todayRow.am_regret ?? '');
      setSleep(todayRow.sleep_hours != null ? String(todayRow.sleep_hours) : '');
    }
  }, [todayRow?.id]);

  const filledCount = intents.filter((i) => i.trim().length > 0).length;
  const done = (todayRow?.am_intents?.filter((i) => i?.trim().length).length ?? 0) >= 1 || (todayRow?.am_regret?.length ?? 0) > 0;

  if (!user) return null;

  const submit = async () => {
    const trimmed = intents.map((i) => i.trim()).filter(Boolean).slice(0, MAX_INTENTS);
    const sleepNum = parseFloat(sleep);
    await save({
      am_intents: trimmed,
      am_regret: regret.trim() || null,
      sleep_hours: Number.isFinite(sleepNum) ? sleepNum : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Sunrise className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Morning</span>
        </div>
        {done && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
            <Check className="h-3 w-3" /> Logged
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Three things that matter today
        </label>
        {intents.map((v, i) => (
          <Input
            key={i}
            value={v}
            onChange={(e) => {
              const next = [...intents];
              next[i] = e.target.value;
              setIntents(next);
            }}
            placeholder={i === 0 ? 'The one thing that actually moves a goal' : `Intent ${i + 1}`}
            className="bg-background"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            If I skip it I'll regret...
          </label>
          <Textarea
            value={regret}
            onChange={(e) => setRegret(e.target.value)}
            rows={2}
            placeholder="One line, honest."
            className="bg-background resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Sleep last night
          </label>
          <Input
            type="number"
            step="0.1"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            placeholder="hours"
            className="bg-background"
          />
        </div>
      </div>

      <PsiSlider />

      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground">
          {filledCount}/{MAX_INTENTS} intents · +10 XP on first save
        </span>
        <Button size="sm" onClick={submit} disabled={!filledCount && !regret.trim() && !sleep}>
          {saved ? <><Check className="h-4 w-4 mr-1" /> Saved</> : 'Commit today'}
        </Button>
      </div>
    </div>
  );
}
