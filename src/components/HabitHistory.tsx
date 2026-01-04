import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { Calendar, TrendingUp } from "lucide-react";
import type { Habit, HabitLog } from "@/hooks/useHabits";

interface HabitHistoryProps {
  habit: Habit | null;
  logs: HabitLog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitHistory({ habit, logs, open, onOpenChange }: HabitHistoryProps) {
  if (!habit) return null;

  const habitLogs = logs
    .filter((log) => log.habit_id === habit.id && log.value > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalValue = habitLogs.reduce((sum, log) => sum + log.value, 0);
  const daysLogged = habitLogs.length;

  const formatValue = (value: number) => {
    if (habit.track_type === "time") {
      const hrs = Math.floor(value / 60);
      const mins = value % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }
    return value.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {habit.title} History
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold text-primary">{daysLogged}</p>
            <p className="text-xs text-muted-foreground">Days Logged</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold text-primary">{formatValue(totalValue)}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {habitLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No history yet. Start tracking!
            </p>
          ) : (
            <div className="space-y-2">
              {habitLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(parseISO(log.date), "EEEE, MMM d, yyyy")}
                    </span>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatValue(log.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
