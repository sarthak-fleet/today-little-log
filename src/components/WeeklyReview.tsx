import { useEffect, useState } from 'react';
import { useWeeklyReviews } from '@/hooks/useWeeklyReviews';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, Heart, Check } from 'lucide-react';

/**
 * Sunday nudge. Only renders on Sunday OR when this week's review is
 * already started. Silent otherwise to avoid noise.
 */
export function WeeklyReview({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const { user } = useAuth();
  const { thisWeek, save } = useWeeklyReviews();
  const [achieved, setAchieved] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (thisWeek) {
      setAchieved(thisWeek.achieved ?? '');
      setGratitude(thisWeek.gratitude ?? '');
    }
  }, [thisWeek?.id]);

  if (!user) return null;
  const isSunday = new Date().getDay() === 0;
  const hasContent = !!(thisWeek?.achieved || thisWeek?.gratitude);
  if (!alwaysShow && !isSunday && !hasContent) return null;

  const submit = async () => {
    await save(achieved.trim(), gratitude.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/5 border border-accent/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <Trophy className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">This week</span>
        </div>
        {hasContent && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
            <Check className="h-3 w-3" /> Reviewed
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Achieved</label>
          <Textarea
            value={achieved}
            onChange={(e) => setAchieved(e.target.value)}
            rows={4}
            placeholder="What did you actually ship, lose, or become this week?"
            className="bg-background resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <Heart className="h-3 w-3 inline mr-1" /> Gratitude
          </label>
          <Textarea
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            rows={4}
            placeholder="Three things. People, moments, luck."
            className="bg-background resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={!achieved.trim() && !gratitude.trim()}>
          {saved ? <><Check className="h-4 w-4 mr-1" /> Saved</> : 'Save week'}
        </Button>
      </div>
    </div>
  );
}
