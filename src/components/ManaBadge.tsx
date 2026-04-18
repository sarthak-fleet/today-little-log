import { useMana } from '@/hooks/useMana';
import { Zap } from 'lucide-react';

export function ManaBadge() {
  const { state, isLoaded } = useMana();
  if (!isLoaded || !state) return null;

  const pct = state.daily_max > 0 ? state.bank_remaining / state.daily_max : 0;
  const tone = pct > 0.5 ? 'text-primary bg-primary/10 border-primary/30'
    : pct > 0.2 ? 'text-orange-600 bg-orange-500/10 border-orange-500/30'
    : 'text-destructive bg-destructive/10 border-destructive/30 animate-pulse';

  return (
    <div
      className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tone}`}
      title={`Mana: ${state.bank_remaining}/${state.daily_max}`}
    >
      <Zap className="h-3.5 w-3.5" />
      <span className="font-mono tabular-nums">{state.bank_remaining}</span>
      <span className="opacity-50">/</span>
      <span className="font-mono tabular-nums opacity-80">{state.daily_max}</span>
    </div>
  );
}
