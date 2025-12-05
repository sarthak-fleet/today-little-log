import { useState, useRef, useCallback } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeBlock {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  color: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 60%)',
  'hsl(160, 60%, 45%)',
  'hsl(340, 65%, 55%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 60%, 55%)',
];

const HOUR_HEIGHT = 60; // pixels per hour

export const ScheduleMaker = () => {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHourFromY = useCallback((clientY: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const hour = Math.max(0, Math.min(24, y / HOUR_HEIGHT));
    return Math.round(hour * 4) / 4; // Snap to 15-minute intervals
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.time-block')) return;
    e.preventDefault();
    const hour = getHourFromY(e.clientY);
    setIsDragging(true);
    setDragStart(hour);
    setDragEnd(hour);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const hour = getHourFromY(e.clientY);
    setDragEnd(hour);
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStart === null || dragEnd === null) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);

    if (end - start >= 0.25) {
      const newBlock: TimeBlock = {
        id: crypto.randomUUID(),
        startHour: start,
        endHour: end,
        title: '',
        color: COLORS[blocks.length % COLORS.length],
      };
      setBlocks([...blocks, newBlock]);
      setEditingId(newBlock.id);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const updateBlockTitle = (id: string, title: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, title } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const formatTime = (hour: number): string => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const selectionStart = dragStart !== null && dragEnd !== null ? Math.min(dragStart, dragEnd) : null;
  const selectionEnd = dragStart !== null && dragEnd !== null ? Math.max(dragStart, dragEnd) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Timeline */}
      <div className="flex-1 relative">
        <div
          ref={timelineRef}
          className="relative bg-card border border-border rounded-lg overflow-hidden select-none"
          style={{ height: 24 * HOUR_HEIGHT }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Hour lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-border/50 flex items-start"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="text-xs text-muted-foreground px-2 py-1 bg-background/80 rounded-br">
                {formatTime(hour)}
              </span>
            </div>
          ))}

          {/* Drag selection preview */}
          {isDragging && selectionStart !== null && selectionEnd !== null && (
            <div
              className="absolute left-12 right-2 bg-primary/30 border-2 border-dashed border-primary rounded-md pointer-events-none z-10"
              style={{
                top: selectionStart * HOUR_HEIGHT,
                height: (selectionEnd - selectionStart) * HOUR_HEIGHT,
              }}
            />
          )}

          {/* Time blocks */}
          {blocks.map((block) => (
            <div
              key={block.id}
              className="time-block absolute left-12 right-2 rounded-md shadow-md cursor-pointer transition-shadow hover:shadow-lg group"
              style={{
                top: block.startHour * HOUR_HEIGHT + 2,
                height: (block.endHour - block.startHour) * HOUR_HEIGHT - 4,
                backgroundColor: block.color,
              }}
              onClick={() => setEditingId(block.id)}
            >
              <div className="h-full p-2 flex flex-col text-white">
                <div className="flex items-center justify-between gap-2">
                  <GripVertical className="h-4 w-4 opacity-50" />
                  <span className="text-xs opacity-75">
                    {formatTime(block.startHour)} - {formatTime(block.endHour)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBlock(block.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {editingId === block.id ? (
                  <Input
                    autoFocus
                    placeholder="Add title..."
                    value={block.title}
                    onChange={(e) => updateBlockTitle(block.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                    className="mt-1 h-7 bg-background border-border text-foreground placeholder:text-muted-foreground text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="font-medium mt-1 truncate">
                    {block.title || 'Untitled'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Summary */}
      <div className="lg:w-72 space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Your Schedule</h3>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Drag on the timeline to create time blocks
            </p>
          ) : (
            <div className="space-y-2">
              {blocks
                .sort((a, b) => a.startHour - b.startHour)
                .map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: block.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {block.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(block.startHour)} - {formatTime(block.endHour)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteBlock(block.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {blocks.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setBlocks([])}
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};
