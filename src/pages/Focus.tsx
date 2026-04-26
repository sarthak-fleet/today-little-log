import { FocusMode } from '@/components/FocusMode';
import { Target } from 'lucide-react';

const Focus = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Target className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Focus</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
          One block. One thing.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tab-switch costs 5 XP. Pick a duration, name the task, lock in.
        </p>
      </section>

      <section className="px-4 max-w-2xl mx-auto pb-20">
        <FocusMode />
      </section>
    </div>
  );
};

export default Focus;
