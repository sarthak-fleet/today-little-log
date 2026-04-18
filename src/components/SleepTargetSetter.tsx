import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Moon, Sun, Check } from 'lucide-react';

/**
 * Inline pair of time inputs — sets profile.sleep_target_bed and
 * profile.sleep_target_wake. SleepLock + dashboard read from here.
 */
export function SleepTargetSetter({ className = '' }: { className?: string }) {
  const { user, profile, updateProfile } = useAuth({ includeProfile: true });
  const [bed, setBed] = useState('');
  const [wake, setWake] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBed(profile?.sleep_target_bed ?? '');
    setWake(profile?.sleep_target_wake ?? '');
  }, [profile?.sleep_target_bed, profile?.sleep_target_wake]);

  if (!user) return null;

  const save = async () => {
    await updateProfile({
      sleep_target_bed: bed || null,
      sleep_target_wake: wake || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className={`rounded-xl bg-card border border-border p-4 flex flex-wrap items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Moon className="h-3 w-3" /> Sleep targets
      </div>
      <div className="flex items-center gap-2">
        <Moon className="h-3.5 w-3.5 text-primary" />
        <Input type="time" value={bed} onChange={(e) => setBed(e.target.value)} className="h-8 w-[92px] bg-background" />
      </div>
      <div className="flex items-center gap-2">
        <Sun className="h-3.5 w-3.5 text-accent" />
        <Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="h-8 w-[92px] bg-background" />
      </div>
      <Button size="sm" className="h-8" onClick={save}>
        {saved ? <><Check className="h-3.5 w-3.5 mr-1" /> Saved</> : 'Save'}
      </Button>
    </div>
  );
}
