import { useState, useEffect } from 'react';
import { CRAFT_TRACK, readCompleted, markCompleted, unmarkCompleted, type CraftSkill } from '@/lib/aiCraft';
import { useUserStats } from '@/hooks/useUserStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ExternalLink, X, Brain } from 'lucide-react';

/**
 * AI-native craft checklist. 14 shippable artifacts. Each "done"
 * needs an evidence URL (github / notebook / demo). Visible progress
 * toward being an AI-native engineer, not a leetcode grinder.
 */
export function CraftTrack() {
  const { award } = useUserStats();
  const [completed, setCompleted] = useState<Record<string, string>>(() => readCompleted());
  const [evidence, setEvidence] = useState<Record<string, string>>({});

  useEffect(() => {
    const i = window.setInterval(() => setCompleted(readCompleted()), 3000);
    return () => window.clearInterval(i);
  }, []);

  const complete = async (s: CraftSkill) => {
    const url = evidence[s.id]?.trim();
    if (!url) return;
    markCompleted(s.id, url);
    setCompleted(readCompleted());
    setEvidence((e) => ({ ...e, [s.id]: '' }));
    // XP scales with hours of the skill.
    await award(s.hours * 10, 3);
  };

  const uncomplete = (id: string) => {
    unmarkCompleted(id);
    setCompleted(readCompleted());
  };

  const total = CRAFT_TRACK.length;
  const done = Object.keys(completed).length;
  const areas = ['foundation', 'retrieval', 'agents', 'evals', 'training', 'protocols', 'systems'] as const;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Brain className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">AI-native craft</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          <span className="text-foreground font-bold">{done}</span>/{total} shipped
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      {areas.map((area) => {
        const inArea = CRAFT_TRACK.filter((s) => s.area === area);
        if (inArea.length === 0) return null;
        return (
          <div key={area} className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{area}</div>
            <ul className="space-y-1.5">
              {inArea.map((s) => {
                const isDone = !!completed[s.id];
                return (
                  <li key={s.id} className={`rounded-xl border p-3 ${isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-background'}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => isDone ? uncomplete(s.id) : null}
                        className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${isDone ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-mono">{s.hours}h</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`font-display font-semibold text-sm ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{s.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">→ {s.artifact}</div>
                        {isDone ? (
                          <a
                            href={completed[s.id]}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> evidence
                          </a>
                        ) : (
                          <div className="flex gap-1.5 mt-2">
                            <Input
                              value={evidence[s.id] ?? ''}
                              onChange={(e) => setEvidence((ev) => ({ ...ev, [s.id]: e.target.value }))}
                              placeholder="repo / notebook / demo URL"
                              className="h-7 text-xs bg-background"
                            />
                            <Button size="sm" className="h-7" onClick={() => complete(s)} disabled={!evidence[s.id]?.trim()}>
                              Ship
                            </Button>
                          </div>
                        )}
                      </div>
                      {isDone && (
                        <button onClick={() => uncomplete(s.id)} className="text-muted-foreground hover:text-destructive" aria-label="Unmark">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground italic">
        Shipping over studying. Each row earns XP by hours × 10. Evidence URL required.
      </p>
    </div>
  );
}
