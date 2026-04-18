import { useStreak } from '@/hooks/useStreak';
import { Flame } from 'lucide-react';

export function StreakBadge() {
  const { current, longest, loaded } = useStreak();
  if (!loaded || current === 0) return null;

  const hot = current >= 7;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${hot ? 'text-destructive bg-destructive/10 border-destructive/30' : 'text-primary bg-primary/10 border-primary/30'}`}
      title={`Longest streak: ${longest} days`}
    >
      <Flame className={`h-3.5 w-3.5 ${hot ? 'animate-pulse' : ''}`} />
      <span className="font-mono tabular-nums">{current}</span>
      <span className="text-[10px] opacity-70">day{current === 1 ? '' : 's'}</span>
    </div>
  );
}
