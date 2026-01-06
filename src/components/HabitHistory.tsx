import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { Calendar, Check, TrendingUp } from "lucide-react";
import type { Habit, HabitLog } from "@/hooks/useHabits";

interface HabitHistoryProps {
  habit: Habit | null;
  logs: HabitLog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateLog: (habitId: string, value: number, date: string) => void;
}

export function HabitHistory({ habit, logs, open, onOpenChange, onUpdateLog }: HabitHistoryProps) {
  const habitLogs = useMemo(() => {
    if (!habit) return [];
    const filtered = logs.filter((log) => log.habit_id === habit.id);
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const seen = new Set<string>();
    const uniqueLogs: HabitLog[] = [];
    sorted.forEach((log) => {
      if (seen.has(log.date)) return;
      seen.add(log.date);
      uniqueLogs.push(log);
    });
    return uniqueLogs;
  }, [habit, logs]);

  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const initialValues: Record<string, string> = {};
    habitLogs.forEach((log) => {
      initialValues[log.id] = String(log.value);
    });
    setEditedValues(initialValues);
  }, [habitLogs, open]);

  if (!habit) return null;

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

  const handleSaveLog = (log: HabitLog) => {
    const rawValue = editedValues[log.id];
    const parsedValue = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      setEditedValues((prev) => ({ ...prev, [log.id]: String(log.value) }));
      return;
    }
    if (parsedValue !== log.value) {
      onUpdateLog(log.habit_id, parsedValue, log.date);
    }
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
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(parseISO(log.date), "EEEE, MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-24 text-right"
                      value={editedValues[log.id] ?? String(log.value)}
                      onChange={(event) =>
                        setEditedValues((prev) => ({ ...prev, [log.id]: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSaveLog(log);
                        }
                      }}
                    />
                    {habit.track_type === "time" && (
                      <span className="text-xs text-muted-foreground">min</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleSaveLog(log)}
                      title="Save log"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
