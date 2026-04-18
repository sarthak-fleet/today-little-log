import { useUserStats } from '@/hooks/useUserStats';
import { Flame } from 'lucide-react';

/**
 * LifeScore visual + XP pill. 0-100, decays 1/day idle. Colors shift with score.
 */
export function LifeScoreBadge() {
  const { stats, loaded } = useUserStats();
  if (!loaded) return null;

  const score = Math.round(stats.life_score);
  const tone =
    score >= 75 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'
    : score >= 50 ? 'text-primary bg-primary/10 border-primary/30'
    : score >= 25 ? 'text-orange-600 bg-orange-500/10 border-orange-500/30'
    : 'text-destructive bg-destructive/10 border-destructive/40 animate-pulse';

  return (
    <div
      className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${tone}`}
      title={`Life score ${score}/100 · ${stats.xp} XP`}
    >
      <Flame className="h-3.5 w-3.5" />
      <span className="font-mono tabular-nums">{score}</span>
      <span className="opacity-40">·</span>
      <span className="font-mono tabular-nums text-[10px] opacity-80">{stats.xp} XP</span>
    </div>
  );
}
