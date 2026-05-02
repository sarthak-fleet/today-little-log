import { TodayPrompt } from '@/components/TodayPrompt';
import { useReportSaving } from '@/components/SavingContext';
import { GuestNotice } from '@/components/GuestNotice';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useAuth } from '@/hooks/useAuth';
import { useLifeMath } from '@/hooks/useLifeMath';
import { useScoreboard } from '@/hooks/useScoreboard';
import { Scoreboard } from '@/components/Scoreboard';
import { type EntryType } from '@/hooks/useJournalEntries';
import { JournalSkeleton } from '@/components/PageSkeleton';

const Index = () => {
  const { loading } = useAuth();
  const life = useLifeMath(60_000);
  const scoreboard = useScoreboard();

  const {
    getTodayEntry,
    getWeeklyEntry,
    getMonthlyEntry,
    saveEntry,
    isLoaded,
    isSaving,
    isLoggedIn,
    isSunday,
    isLastDayOfMonth,
  } = useJournalEntries();

  const handleSave = (content: string, entryType: EntryType) => {
    saveEntry(content, undefined, entryType);
  };

  useReportSaving(isSaving);

  const dailyItems = scoreboard.items.filter((item) => item.category === 'daily');
  const todayHits = dailyItems.filter((item) => {
    const log = scoreboard.todayLogs.find((row) => row.item_id === item.id);
    if (!log) return false;
    return item.kind === 'check' ? log.value_bool : Boolean(log.value_text && log.value_text.trim());
  }).length;
  const shouldLockReflection = new Date().getHours() >= 15 && dailyItems.length > 0 && todayHits === 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <section className="pt-12 pb-8 md:pt-20 md:pb-12 px-4 max-w-4xl mx-auto">
        <div className="space-y-5 text-left animate-fade-in">
          {life.dayOfLife !== null && life.daysLeft !== null ? (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                <span className="h-[1px] w-6 bg-primary" />
                Day {life.dayOfLife.toLocaleString()} of ~{(30000).toLocaleString()}
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight leading-[1.05]">
                <span className="text-foreground">About </span>
                <span className="text-primary">{life.daysLeft.toLocaleString()}</span>
                <span className="text-foreground"> days</span>
                <br />
                <span className="text-accent italic font-medium">to become who you want.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl font-sans leading-relaxed">
                {life.hoursLeftToday}h {life.remainingMinutesToday}m left today. Log what matters. Skip what doesn't.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-foreground leading-[1.05]">
                How many days <br />
                <span className="text-primary italic font-medium">do you have left?</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl font-sans leading-relaxed">
                Set your date of birth once and this app starts counting what matters. Top-right → cake icon.
              </p>
            </>
          )}
        </div>
      </section>

      {!loading && !isLoggedIn && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-muted/50 rounded-2xl p-4 transition-all hover:bg-muted/80">
            <GuestNotice message="Log in to save your journal across devices and unlock full features." />
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 space-y-8 pb-20">
        <section className="animate-slide-up" style={{ animationDelay: '0.02s' }}>
          <Scoreboard />
        </section>

        {!shouldLockReflection && (
          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-card rounded-3xl p-8 shadow-card border-none relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-base">✍️</span>
                Daily Reflection
              </h2>
              {loading || !isLoaded ? (
                <JournalSkeleton />
              ) : (
                <TodayPrompt
                  todayEntry={getTodayEntry()}
                  weeklyEntry={getWeeklyEntry()}
                  monthlyEntry={getMonthlyEntry()}
                  isSunday={isSunday()}
                  isLastDayOfMonth={isLastDayOfMonth()}
                  onSave={handleSave}
                />
              )}
            </div>
          </section>
        )}
      </div>

      <footer className="py-20 text-center bg-muted/20">
        <p className="text-sm text-muted-foreground font-sans tracking-wide italic">
          {life.daysLeft !== null
            ? `Today is one of about ${life.daysLeft.toLocaleString()}. Don't give it away cheap.`
            : `The trouble is, you think you have time. — Jack Kornfield`}
        </p>
      </footer>
    </div>
  );
};

export default Index;
