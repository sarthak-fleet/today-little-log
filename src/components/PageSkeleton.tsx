import { Skeleton } from '@/components/ui/skeleton';

export function JournalSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* Emotion logger placeholder */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-10 w-16 rounded-lg" />
        ))}
      </div>
      {/* Today's entry */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      {/* Past entries */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function HabitsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      {/* Habit cards */}
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-border/50 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TasksSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header + progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      {/* Add task input */}
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
      {/* Tabs */}
      <Skeleton className="h-9 w-48 rounded-lg" />
      {/* Task rows */}
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 rounded-xl p-3.5">
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Timeline */}
      <div className="space-y-0">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-t border-border/30">
            <Skeleton className="h-4 w-12 shrink-0" />
            <Skeleton className={`h-8 rounded-lg ${i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-1/2' : 'w-0'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RulesSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <Skeleton className="h-6 w-32" />
      {/* Add rule input */}
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-16 rounded-lg" />
      </div>
      {/* Rule rows */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-border/50">
            <Skeleton className="h-5 w-8 shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
