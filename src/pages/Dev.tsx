import { DevRitualTracker } from '@/components/DevRitualTracker';
import { Code2 } from 'lucide-react';

const Dev = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Code2 className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Craft</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Better engineer. <span className="text-primary italic font-medium">Every day.</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Deep work, leet reps, commits. Compounding skill beats talent without log.
        </p>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-20">
        <DevRitualTracker />
      </section>
    </div>
  );
};

export default Dev;
