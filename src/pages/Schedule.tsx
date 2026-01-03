import { ScheduleMaker } from '@/components/ScheduleMaker';
import { Navbar } from '@/components/Navbar';
import { GuestNotice } from '@/components/GuestNotice';
import { useSchedule } from '@/hooks/useSchedule';

const Schedule = () => {
  const { blocks, isLoaded, isSaving, updateBlocks, clearAll, isLoggedIn } = useSchedule();

  return (
    <div className="min-h-screen bg-background">
      <Navbar isSaving={isSaving} />

      <div className="container max-w-5xl mx-auto px-4 py-6">
        {/* Login prompt */}
        {!isLoggedIn && (
          <div className="mb-6">
            <GuestNotice message="Log in to save your schedule across devices" />
          </div>
        )}

        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Schedule Maker</h2>
        <p className="text-muted-foreground mb-6">
          Drag on the timeline to create time blocks and plan your day
        </p>

        {/* Schedule Maker */}
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
