import { useState } from 'react';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useAuth } from '@/hooks/useAuth';
import { useQuickLogs } from '@/hooks/useQuickLogs';
import { isAuditDay, findMondayCommitments } from '@/lib/commitments';
import { useUserStats } from '@/hooks/useUserStats';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Gavel, Check, X } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Thursday + Friday: show Monday's commitments. Ask for evidence.
 * No evidence = XP penalty. Evidence = XP bonus.
 */
export function CommitmentAudit() {
  const { user } = useAuth();
  const { rows } = useDailyCheckins();
  const { add: logQuick } = useQuickLogs();
  const { award } = useUserStats();
  const [evidence, setEvidence] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, 'delivered' | 'missed'>>({});

  if (!user) return null;
  if (!isAuditDay()) return null;

  const mondayRow = findMondayCommitments(rows);
  const intents = mondayRow?.am_intents ?? [];
  if (intents.length === 0) return null;

  const submit = async (idx: number, verdict: 'delivered' | 'missed') => {
    const ev = evidence[idx] ?? '';
    await logQuick('note', verdict === 'delivered' ? 1 : 0, `AUDIT ${format(new Date(), 'E')}: "${intents[idx]}" → ${verdict}${ev ? ` · ${ev}` : ''}`);
    if (verdict === 'delivered') await award(15, 3);
    else await award(0, -5);
    setSubmitted((s) => ({ ...s, [idx]: verdict }));
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-destructive/10 to-orange-500/10 border border-destructive/40 p-5 space-y-4">
      <div className="flex items-center gap-2 text-destructive">
        <Gavel className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.25em]">Monday audit</span>
      </div>
      <p className="text-sm text-foreground">
        Monday you committed to {intents.length} thing{intents.length === 1 ? '' : 's'}. Now prove it.
      </p>
      <ul className="space-y-3">
        {intents.map((intent, i) => {
          const verdict = submitted[i];
          return (
            <li key={i} className="rounded-xl bg-background/60 border border-border p-3 space-y-2">
              <div className="font-display font-semibold text-foreground">"{intent}"</div>
              {verdict ? (
                <div className={`text-xs font-semibold uppercase tracking-widest ${verdict === 'delivered' ? 'text-emerald-600' : 'text-destructive'}`}>
                  {verdict === 'delivered' ? '+15 XP · logged' : '−5 score · logged'}
                </div>
              ) : (
                <>
                  <Textarea
                    value={evidence[i] ?? ''}
                    onChange={(e) => setEvidence((ev) => ({ ...ev, [i]: e.target.value }))}
                    placeholder="Evidence (commit hash, screenshot, what you shipped)"
                    rows={2}
                    className="bg-background resize-none text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => submit(i, 'missed')}>
                      <X className="h-3.5 w-3.5 mr-1" /> Missed
                    </Button>
                    <Button size="sm" onClick={() => submit(i, 'delivered')} disabled={!evidence[i]?.trim()}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Delivered
                    </Button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
