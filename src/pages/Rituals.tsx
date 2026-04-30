import { AmRitual } from '@/components/AmRitual';
import { PmRitual } from '@/components/PmRitual';
import Habits from './Habits';
import { Sunrise } from 'lucide-react';

const Rituals = () => {
  const hour = new Date().getHours();
  const morningFirst = hour < 18;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Sunrise className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Rituals</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
          One daily ritual log
        </h1>
        <p className="mt-2 text-muted-foreground">
          Open the day, close the day, and track the repeated items that deserve history.
        </p>
      </section>

      <section className="px-4 max-w-3xl mx-auto pb-20 space-y-6">
        <Habits embedded />
        {morningFirst ? (
          <>
            <AmRitual />
            <PmRitual />
          </>
        ) : (
          <>
            <PmRitual />
            <AmRitual />
          </>
        )}
      </section>
    </div>
  );
};

export default Rituals;
