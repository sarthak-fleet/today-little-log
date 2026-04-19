import { ScheduleMaker } from '@/components/ScheduleMaker';
import { useReportSaving } from '@/components/SavingContext';
import { GuestNotice } from '@/components/GuestNotice';
import { useSchedule } from '@/hooks/useSchedule';
import { ScheduleCheckin } from '@/components/ScheduleCheckin';
import { SleepTargetSetter } from '@/components/SleepTargetSetter';
import { CraftHoursWidget } from '@/components/CraftHoursWidget';
import { Clock } from 'lucide-react';

const Schedule = () => {
  const { blocks, isLoaded, isSaving, updateBlocks, clearAll, isLoggedIn } = useSchedule();

  useReportSaving(isSaving);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Clock className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Schedule</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Block the day. <span className="text-primary italic font-medium">No drift.</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Drag on the timeline to create time blocks and plan your day.
        </p>
      </section>

      {!isLoggedIn && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <GuestNotice message="Log in to save your schedule across devices" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pb-20 space-y-6">
        <SleepTargetSetter />
        <CraftHoursWidget />
        <ScheduleCheckin />
        <ScheduleMaker
          blocks={blocks}
          isLoaded={isLoaded}
          onBlocksChange={updateBlocks}
          onClearAll={clearAll}
        />
      </div>
    </div>
  );
};

export default Schedule;
