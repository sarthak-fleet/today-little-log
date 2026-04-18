import { LifeWeeksGrid } from '@/components/LifeWeeksGrid';
import { useLifeMath } from '@/hooks/useLifeMath';
import { quoteOfDay } from '@/lib/mementoMori';
import { IdentitySetter } from '@/components/IdentitySetter';
import { Skull } from 'lucide-react';

const Life = () => {
  const life = useLifeMath(30_000);
  const quote = quoteOfDay();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Skull className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Your Life</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-foreground leading-tight">
          {life.dayOfLife !== null ? (
            <>
              You are on <span className="text-primary">day {life.dayOfLife.toLocaleString()}</span>
              {' '}of roughly <span className="text-accent">{(30000).toLocaleString()}</span>.
            </>
          ) : (
            <>How many weeks do you think you have?</>
          )}
        </h1>
        {life.dayOfLife !== null && life.daysLeft !== null && (
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            About <span className="font-semibold text-foreground">{life.daysLeft.toLocaleString()}</span> days left. Each square below is one week.
          </p>
        )}
      </section>

      <section className="px-4 max-w-5xl mx-auto pb-8">
        <IdentitySetter />
      </section>

      <section className="px-4 max-w-5xl mx-auto pb-10">
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-card">
          <LifeWeeksGrid />
        </div>
      </section>

      {life.dob && (
        <section className="px-4 max-w-5xl mx-auto pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Lived" value={`${life.pctLived?.toFixed(1)}%`} />
            <Stat label="Left" value={`${life.pctLeft?.toFixed(1)}%`} />
            <Stat label="Weeks lived" value={life.weeksLived?.toLocaleString() ?? '—'} />
            <Stat label="Days left today" value={`${life.hoursLeftToday}h ${life.remainingMinutesToday}m`} />
          </div>
        </section>
      )}

      <section className="px-4 max-w-3xl mx-auto pb-20">
        <blockquote className="border-l-2 border-primary/60 pl-5 italic text-foreground/80">
          "{quote.text}"
          {quote.source && <div className="not-italic text-xs text-muted-foreground mt-1">— {quote.source}</div>}
        </blockquote>
      </section>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl md:text-2xl font-display font-bold text-foreground mt-1">{value}</div>
    </div>
  );
}

export default Life;
