import { WeightTracker } from '@/components/WeightTracker';
import { Scale } from 'lucide-react';

const Weight = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Scale className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Body</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Log the number. <span className="text-primary italic font-medium">Own it.</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          One kg a week is ~500 kcal deficit per day. No hiding.
        </p>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-20">
        <WeightTracker />
      </section>
    </div>
  );
};

export default Weight;
