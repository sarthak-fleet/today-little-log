import { useState, useRef } from 'react';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TimeBlock {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  color: string;
}

const COLORS = [
  'hsl(220, 70%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(340, 65%, 55%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(200, 70%, 50%)',
];

const HOUR_HEIGHT = 48;

export const ScheduleMaker = () => {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startY: number;
    startHour: number;
    currentHour: number;
  } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHourFromY = (clientY: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = clientY - rect.top + timelineRef.current.scrollTop;
    const hour = Math.max(0, Math.min(24, y / HOUR_HEIGHT));
    return Math.round(hour * 4) / 4;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.time-block') || 
        (e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('input')) {
      return;
    }
    
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const hour = getHourFromY(e.clientY);
    setDragState({
      isDragging: true,
      startY: e.clientY,
      startHour: hour,
      currentHour: hour,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState?.isDragging) return;
    e.preventDefault();
    const hour = getHourFromY(e.clientY);
    setDragState(prev => prev ? { ...prev, currentHour: hour } : null);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState?.isDragging) return;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    const start = Math.min(dragState.startHour, dragState.currentHour);
    const end = Math.max(dragState.startHour, dragState.currentHour);

    if (end - start >= 0.25) {
      const newBlock: TimeBlock = {
        id: crypto.randomUUID(),
        startHour: start,
        endHour: end,
        title: '',
        color: COLORS[blocks.length % COLORS.length],
      };
      setBlocks(prev => [...prev, newBlock]);
      setEditingId(newBlock.id);
    }

    setDragState(null);
  };

  const updateBlockTitle = (id: string, title: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, title } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const addQuickBlock = (hour: number) => {
    const newBlock: TimeBlock = {
      id: crypto.randomUUID(),
      startHour: hour,
      endHour: hour + 1,
      title: '',
      color: COLORS[blocks.length % COLORS.length],
    };
    setBlocks(prev => [...prev, newBlock]);
    setEditingId(newBlock.id);
  };

  const formatTime = (hour: number): string => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const selectionStart = dragState ? Math.min(dragState.startHour, dragState.currentHour) : null;
  const selectionEnd = dragState ? Math.max(dragState.startHour, dragState.currentHour) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Timeline */}
      <div className="flex-1">
        <div
          ref={timelineRef}
          className="relative bg-card border border-border rounded-lg overflow-auto touch-none"
          style={{ height: 'min(70vh, 600px)' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDragState(null)}
        >
          <div style={{ height: 24 * HOUR_HEIGHT, position: 'relative' }}>
            {/* Hour rows */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/40 flex items-start group"
                style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className="text-xs text-muted-foreground px-2 py-1 w-16 flex-shrink-0 bg-muted/30">
                  {formatTime(hour)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 ml-auto mr-2 mt-1"
                  onClick={() => addQuickBlock(hour)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Drag selection preview */}
            {dragState && selectionStart !== null && selectionEnd !== null && selectionEnd > selectionStart && (
              <div
                className="absolute left-16 right-2 bg-primary/30 border-2 border-dashed border-primary rounded-md pointer-events-none z-20"
                style={{
                  top: selectionStart * HOUR_HEIGHT,
                  height: (selectionEnd - selectionStart) * HOUR_HEIGHT,
                }}
              >
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary">
                  {formatTime(selectionStart)} - {formatTime(selectionEnd)}
                </span>
              </div>
            )}

            {/* Time blocks */}
            {blocks.map((block) => {
              const blockHeight = (block.endHour - block.startHour) * HOUR_HEIGHT - 4;
              const isSmall = blockHeight < 60;
              
              return (
                <div
                  key={block.id}
                  className="time-block absolute left-16 right-2 rounded-md shadow-md z-10"
                  style={{
                    top: block.startHour * HOUR_HEIGHT + 2,
                    height: blockHeight,
                    backgroundColor: block.color,
                  }}
                >
                  <div className={`h-full p-2 flex ${isSmall ? 'flex-row items-center gap-2' : 'flex-col'}`}>
                    {/* Title area */}
                    <div className="flex-1 min-w-0">
                      {editingId === block.id ? (
                        <Input
                          autoFocus
                          placeholder="Enter name..."
                          value={block.title}
                          onChange={(e) => updateBlockTitle(block.id, e.target.value)}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingId(null);
                            e.stopPropagation();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 text-sm bg-background border-input"
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1 cursor-pointer group/title"
                          onClick={() => setEditingId(block.id)}
                        >
                          <span className="font-semibold text-white truncate text-sm">
                            {block.title || 'Click to add name'}
                          </span>
                          <Pencil className="h-3 w-3 text-white/70 opacity-0 group-hover/title:opacity-100 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                    
                    {/* Time and delete */}
                    <div className={`flex items-center gap-1 ${isSmall ? '' : 'mt-1'}`}>
                      <span className="text-xs text-white/80">
                        {formatTime(block.startHour)} - {formatTime(block.endHour)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/20 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBlock(block.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Drag on empty area to create blocks, or click + button
        </p>
      </div>

      {/* Schedule Summary */}
      <div className="lg:w-72 space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Schedule Summary</h3>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No blocks yet. Create your first one!
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {blocks
                .sort((a, b) => a.startHour - b.startHour)
                .map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted"
                    onClick={() => setEditingId(block.id)}
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
                      className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlock(block.id);
                      }}
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
