import { ScheduleMaker } from '@/components/ScheduleMaker';
import { useReportSaving } from '@/components/SavingContext';
import { GuestNotice } from '@/components/GuestNotice';
import { useSchedule } from '@/hooks/useSchedule';
import { ScheduleCheckin } from '@/components/ScheduleCheckin';
import { SleepTargetSetter } from '@/components/SleepTargetSetter';

const Schedule = () => {
  const { blocks, isLoaded, isSaving, updateBlocks, clearAll, isLoggedIn } = useSchedule();

  useReportSaving(isSaving);

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Login prompt */}
        {!isLoggedIn && (
          <GuestNotice message="Log in to save your schedule across devices" />
        )}

        <div>
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">Schedule Maker</h2>
          <p className="text-muted-foreground">
            Drag on the timeline to create time blocks and plan your day
          </p>
        </div>

        <SleepTargetSetter />
        <ScheduleCheckin />

        <ScheduleMaker
          blocks={blocks}
          isLoaded={isLoaded}
          onBlocksChange={updateBlocks}
          onClearAll={clearAll}
        />
    </div>
  );
};

export default Schedule;
