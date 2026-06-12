import { useEffect, useState } from 'react';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sunset, Check } from 'lucide-react';

export function PmRitual() {
  const { user } = useAuth();
  const { todayRow, save } = useDailyCheckins();
  const [wins, setWins] = useState('');
  const [wastes, setWastes] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (todayRow) {
      setWins(todayRow.pm_wins ?? '');
      setWastes(todayRow.pm_wastes ?? '');
      setScore(todayRow.pm_score ?? null);
    }
    // Same as AmRitual: only resync when the row identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayRow?.id]);

  const done = !!(todayRow?.pm_wins || todayRow?.pm_wastes || todayRow?.pm_score);

  if (!user) return null;

  const submit = async () => {
    await save({
      pm_wins: wins.trim() || null,
      pm_wastes: wastes.trim() || null,
      pm_score: score ?? null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <Sunset className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Evening</span>
        </div>
        {done && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
            <Check className="h-3 w-3" /> Reviewed
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Won</label>
          <Textarea
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            rows={3}
            placeholder="What actually moved the needle?"
            className="bg-background resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Wasted</label>
          <Textarea
            value={wastes}
            onChange={(e) => setWastes(e.target.value)}
            rows={3}
            placeholder="What ate the hours?"
            className="bg-background resize-none"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score this day (1-10)</label>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => setScore(n)}
              className={`flex-1 h-9 rounded-md text-sm font-semibold transition-all border ${score === n
                ? n >= 8 ? 'bg-emerald-500 text-white border-emerald-500'
                  : n >= 5 ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={!wins.trim() && !wastes.trim() && score == null}>
          {saved ? <><Check className="h-4 w-4 mr-1" /> Saved</> : 'Close today'}
        </Button>
      </div>
    </div>
  );
}
