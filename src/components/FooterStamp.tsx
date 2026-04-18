import { useLifeMath } from '@/hooks/useLifeMath';

/**
 * Tiny always-on stamp: "Xh Ym dead today · Zh left."
 * Renders as a bottom-right fixed pill across all authed routes.
 */
export function FooterStamp() {
  const life = useLifeMath(60_000);
  const h = Math.floor(life.minutesElapsedToday / 60);
  const m = life.minutesElapsedToday % 60;
  const left = `${life.hoursLeftToday}h ${life.remainingMinutesToday}m`;

  const urgent = life.isEndOfDayCrunch;

  return (
    <div
      className={`
        hidden md:flex fixed bottom-3 right-3 z-30 items-center gap-2
        px-3 py-1.5 rounded-full text-[11px] font-mono
        bg-background/80 backdrop-blur-sm border shadow-soft
        ${urgent ? 'border-destructive text-destructive animate-pulse' : 'border-border text-muted-foreground'}
      `}
      aria-label="Today time stamp"
    >
      <span>{h}h {m}m dead</span>
      <span className="opacity-40">·</span>
      <span className={urgent ? 'font-semibold' : ''}>{left} left</span>
    </div>
  );
}
