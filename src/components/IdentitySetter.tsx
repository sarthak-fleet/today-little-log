import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { XP_REWARDS } from '@/lib/xp';
import { Pencil, Check, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'I am a focused engineer at 70kg who sleeps 11–7.',
  'I ship code daily and protect my sleep above all.',
  'I trade dopamine now for freedom later.',
  'I am the person my future self looks back on with pride.',
];

interface IdentitySetterProps {
  compact?: boolean;
  className?: string;
}

/**
 * Lets user write & display their "highest self" statement.
 * Shown on ShockCard, home, and /life page.
 */
export function IdentitySetter({ compact = false, className = '' }: IdentitySetterProps) {
  const { user, profile, updateProfile } = useAuth({ includeProfile: true });
  const { award } = useUserStats();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(profile?.identity_statement ?? '');
  }, [profile?.identity_statement]);

  const identity = profile?.identity_statement;

  const save = async () => {
    if (!draft.trim() || !user) return;
    const wasEmpty = !identity;
    await updateProfile({ identity_statement: draft.trim() });
    if (wasEmpty) await award(XP_REWARDS.IDENTITY_SET, 5);
    setEditing(false);
  };

  if (!user) return null;

  if (!identity && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`w-full text-left group rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-4 ${className}`}
      >
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="h-3.5 w-3.5" /> Highest Self
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap to write your one-line identity. Who you're becoming.
        </p>
      </button>
    );
  }

  if (editing) {
    return (
      <div className={`rounded-xl border border-primary/40 bg-card p-4 space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="h-3.5 w-3.5" /> Highest Self
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={160}
          placeholder={SUGGESTIONS[0]}
          className="font-display text-base resize-none bg-background"
          autoFocus
        />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setDraft(s)}
              type="button"
              className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {s.length > 28 ? `${s.slice(0, 28)}…` : s}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setDraft(identity ?? '');
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!draft.trim()}>
            <Check className="h-4 w-4 mr-1.5" /> Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-semibold uppercase tracking-[0.25em]">
            <Sparkles className="h-3 w-3" /> Highest Self
          </div>
          <p
            className={`mt-2 font-display font-medium text-foreground leading-snug ${compact ? 'text-sm' : 'text-base md:text-lg italic'}`}
          >
            {identity}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
