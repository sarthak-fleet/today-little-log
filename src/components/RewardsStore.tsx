import { useState, useEffect } from 'react';
import { readRewards, writeRewards, addReward, removeReward, type Reward } from '@/lib/rewards';
import { useUserStats } from '@/hooks/useUserStats';
import { useQuickLogs } from '@/hooks/useQuickLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Plus, Trash2, Lock, Check } from 'lucide-react';

/**
 * XP → reward redemption. User pre-commits to what they'll let
 * themselves have. App enforces the price.
 */
export function RewardsStore() {
  const { stats, award } = useUserStats();
  const { add: logQuick } = useQuickLogs();
  const [list, setList] = useState<Reward[]>(() => readRewards());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [redeemed, setRedeemed] = useState<string | null>(null);

  useEffect(() => {
    const i = window.setInterval(() => setList(readRewards()), 2000);
    return () => window.clearInterval(i);
  }, []);

  const handleAdd = () => {
    const c = parseInt(cost);
    if (!name.trim() || !Number.isFinite(c) || c <= 0) return;
    const r: Reward = { id: `r-${Date.now()}`, name: name.trim(), cost: c };
    addReward(r);
    setList(readRewards());
    setName(''); setCost(''); setAdding(false);
  };

  const handleRedeem = async (r: Reward) => {
    if (stats.xp < r.cost) return;
    // Deduct XP via the award hook. Negative xp = spend.
    await award(-r.cost, 0);
    // Log the redemption so it shows up on /review.
    await logQuick('note', r.cost, `REDEEMED: ${r.name}`);
    setRedeemed(r.id);
    setTimeout(() => setRedeemed(null), 2000);
  };

  const handleRemove = (id: string) => {
    removeReward(id);
    setList(readRewards());
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <Gift className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Rewards store</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">Bank: <span className="text-foreground font-bold">{stats.xp} XP</span></span>
      </div>

      <ul className="space-y-2">
        {list.map((r) => {
          const affordable = stats.xp >= r.cost;
          const isRedeemed = redeemed === r.id;
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-xl border p-3 ${affordable ? 'border-border bg-background' : 'border-border/40 bg-muted/20'}`}>
              {!affordable && <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${affordable ? 'text-foreground' : 'text-muted-foreground'}`}>{r.name}</div>
                <div className="text-[11px] font-mono text-muted-foreground">{r.cost} XP</div>
              </div>
              {isRedeemed ? (
                <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> redeemed
                </span>
              ) : (
                <Button
                  size="sm"
                  disabled={!affordable}
                  variant={affordable ? 'default' : 'ghost'}
                  onClick={() => handleRedeem(r)}
                  className="h-7"
                >
                  Buy
                </Button>
              )}
              <button onClick={() => handleRemove(r.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reward name" className="flex-1 bg-background" />
          <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="XP" className="w-24 bg-background" />
          <Button size="sm" onClick={handleAdd} disabled={!name.trim() || !cost}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add reward
        </Button>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        Spending XP is irreversible. Make rewards expensive enough to feel earned.
      </p>
    </div>
  );
}
