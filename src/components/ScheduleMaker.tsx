import { useState, useRef, useEffect } from 'react';
import { Trash2, Pencil, GripVertical, Palette, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TimeBlock {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  color: string;
}

interface ScheduleMakerProps {
  blocks: TimeBlock[];
  isLoaded: boolean;
  onBlocksChange: (blocks: TimeBlock[]) => void;
  onClearAll: () => void;
}

const COLORS = [
  'hsl(220, 70%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(340, 65%, 55%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(200, 70%, 50%)',
  'hsl(0, 70%, 55%)',
  'hsl(30, 80%, 50%)',
  'hsl(180, 60%, 45%)',
  'hsl(300, 50%, 50%)',
  'hsl(120, 50%, 45%)',
  'hsl(250, 60%, 60%)',
];

const HOUR_HEIGHT = 60;
const SLOT_HEIGHT = HOUR_HEIGHT / 4; // 15-minute slots

export const ScheduleMaker = ({ blocks, isLoaded, onBlocksChange, onClearAll }: ScheduleMakerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ startSlot: number; endSlot: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragBlock, setDragBlock] = useState<{ id: string; offsetSlots: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; edge: 'top' | 'bottom' } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const slots = Array.from({ length: 96 }, (_, i) => i); // 96 x 15-min slots

  const getSlotFromY = (clientY: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollTop = timelineRef.current.scrollTop;
    const y = clientY - rect.top + scrollTop;
    return Math.max(0, Math.min(95, Math.floor(y / SLOT_HEIGHT)));
  };

  const slotToHour = (slot: number) => slot / 4;
  const hourToSlot = (hour: number) => Math.round(hour * 4);

  // Handle mouse events on document for reliable drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      
      // Resizing block
      if (resizing) {
        const slot = getSlotFromY(e.clientY);
        const block = blocks.find(b => b.id === resizing.id);
        if (!block) return;
        
        if (resizing.edge === 'top') {
          const endSlot = hourToSlot(block.endHour);
          const newStartSlot = Math.max(0, Math.min(endSlot - 1, slot));
          onBlocksChange(blocks.map(b => 
            b.id === resizing.id ? { ...b, startHour: slotToHour(newStartSlot) } : b
          ));
        } else {
          const startSlot = hourToSlot(block.startHour);
          const newEndSlot = Math.max(startSlot + 1, Math.min(96, slot + 1));
          onBlocksChange(blocks.map(b => 
            b.id === resizing.id ? { ...b, endHour: slotToHour(newEndSlot) } : b
          ));
        }
        return;
      }
      
      // Dragging existing block
      if (dragBlock) {
        const slot = getSlotFromY(e.clientY);
        const block = blocks.find(b => b.id === dragBlock.id);
        if (!block) return;
        
        const duration = block.endHour - block.startHour;
        const durationSlots = hourToSlot(duration);
        let newStartSlot = slot - dragBlock.offsetSlots;
        
        // Clamp to bounds
        newStartSlot = Math.max(0, Math.min(96 - durationSlots, newStartSlot));
        
        onBlocksChange(blocks.map(b => 
          b.id === dragBlock.id 
            ? { ...b, startHour: slotToHour(newStartSlot), endHour: slotToHour(newStartSlot + durationSlots) }
            : b
        ));
        return;
      }
      
      // Creating new block via drag
      if (dragging) {
        const slot = getSlotFromY(e.clientY);
        setDragging(prev => prev ? { ...prev, endSlot: slot } : null);
      }
    };

    const handleMouseUp = () => {
      if (dragging && isMouseDown && !dragBlock) {
        const startSlot = Math.min(dragging.startSlot, dragging.endSlot);
        const endSlot = Math.max(dragging.startSlot, dragging.endSlot);
        
        if (endSlot > startSlot) {
          const newBlock: TimeBlock = {
            id: crypto.randomUUID(),
            startHour: slotToHour(startSlot),
            endHour: slotToHour(endSlot + 1),
            title: '',
            color: COLORS[blocks.length % COLORS.length],
          };
          onBlocksChange([...blocks, newBlock]);
          setEditingId(newBlock.id);
        }
      }
      setDragging(null);
      setDragBlock(null);
      setResizing(null);
      setIsMouseDown(false);
    };

    if (isMouseDown) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMouseDown, dragging, dragBlock, resizing, blocks, onBlocksChange]);

  const handleSlotClick = (slot: number) => {
    if (dragging || dragBlock) return;
    // Create a 15-min block on click
    const newBlock: TimeBlock = {
      id: crypto.randomUUID(),
      startHour: slotToHour(slot),
      endHour: slotToHour(slot + 1),
      title: '',
      color: COLORS[blocks.length % COLORS.length],
    };
    onBlocksChange([...blocks, newBlock]);
    setEditingId(newBlock.id);
  };

  const handleSlotMouseDown = (e: React.MouseEvent, slot: number) => {
    if ((e.target as HTMLElement).closest('.time-block')) return;
    e.preventDefault();
    setIsMouseDown(true);
    setDragging({ startSlot: slot, endSlot: slot });
  };

  const handleBlockDragStart = (e: React.MouseEvent, block: TimeBlock) => {
    e.preventDefault();
    e.stopPropagation();
    const slot = getSlotFromY(e.clientY);
    const blockStartSlot = hourToSlot(block.startHour);
    setIsMouseDown(true);
    setDragBlock({ id: block.id, offsetSlots: slot - blockStartSlot });
  };

  const handleResizeStart = (e: React.MouseEvent, blockId: string, edge: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setIsMouseDown(true);
    setResizing({ id: blockId, edge });
  };

  const updateBlockTitle = (id: string, title: string) => {
    onBlocksChange(blocks.map(b => b.id === id ? { ...b, title } : b));
  };

  const updateBlockColor = (id: string, color: string) => {
    onBlocksChange(blocks.map(b => b.id === id ? { ...b, color } : b));
  };

  const deleteBlock = (id: string) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const formatTime = (hour: number): string => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const selectionStart = dragging ? Math.min(dragging.startSlot, dragging.endSlot) : null;
  const selectionEnd = dragging ? Math.max(dragging.startSlot, dragging.endSlot) : null;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Timeline */}
      <div className="flex-1">
        <div
          ref={timelineRef}
          className="relative bg-card border border-border rounded-lg overflow-auto"
          style={{ height: 'min(70vh, 600px)' }}
        >
          <div style={{ height: 24 * HOUR_HEIGHT, position: 'relative' }}>
            {/* Hour labels */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 w-14 text-xs text-muted-foreground px-2 py-1 bg-muted/30 border-b border-border/30"
                style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                {formatTime(hour)}
              </div>
            ))}

            {/* Clickable 15-min slots */}
            {slots.map((slot) => (
              <div
                key={slot}
                className="absolute left-14 right-0 border-b border-border/20 hover:bg-primary/10 cursor-pointer transition-colors"
                style={{ 
                  top: slot * SLOT_HEIGHT, 
                  height: SLOT_HEIGHT,
                  borderBottomStyle: slot % 4 === 3 ? 'solid' : 'dashed',
                  borderBottomColor: slot % 4 === 3 ? 'hsl(var(--border))' : undefined,
                }}
                onMouseDown={(e) => handleSlotMouseDown(e, slot)}
                onClick={() => !dragging && handleSlotClick(slot)}
              />
            ))}

            {/* Drag selection preview */}
            {dragging && !dragBlock && selectionStart !== null && selectionEnd !== null && (
              <div
                className="absolute left-14 right-2 bg-primary/40 border-2 border-primary rounded-md pointer-events-none z-20"
                style={{
                  top: selectionStart * SLOT_HEIGHT,
                  height: (selectionEnd - selectionStart + 1) * SLOT_HEIGHT,
                }}
              >
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary-foreground bg-primary/60 rounded">
                  {formatTime(slotToHour(selectionStart))} - {formatTime(slotToHour(selectionEnd + 1))}
                </span>
              </div>
            )}

            {/* Time blocks */}
            {blocks.map((block) => {
              const top = block.startHour * HOUR_HEIGHT + 1;
              const height = (block.endHour - block.startHour) * HOUR_HEIGHT - 2;
              const isSmall = height < 50;
              const isDragging = dragBlock?.id === block.id;
              const isResizing = resizing?.id === block.id;
              
              return (
                <div
                  key={block.id}
                  className={`time-block absolute left-14 right-2 rounded-md shadow-md z-10 overflow-visible transition-shadow ${isDragging || isResizing ? 'shadow-lg ring-2 ring-primary' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
                  style={{
                    top,
                    height,
                    backgroundColor: block.color,
                  }}
                >
                  {/* Top resize handle */}
                  <div 
                    className="absolute -top-1 left-0 right-0 h-3 cursor-ns-resize group flex items-center justify-center"
                    onMouseDown={(e) => handleResizeStart(e, block.id, 'top')}
                  >
                    <div className="w-10 h-1 rounded-full bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  {/* Bottom resize handle */}
                  <div 
                    className="absolute -bottom-1 left-0 right-0 h-3 cursor-ns-resize group flex items-center justify-center"
                    onMouseDown={(e) => handleResizeStart(e, block.id, 'bottom')}
                  >
                    <div className="w-10 h-1 rounded-full bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className={`h-full p-2 flex ${isSmall ? 'flex-row items-center gap-2' : 'flex-col'}`}>
                    {/* Drag handle */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab hover:bg-white/20 transition-colors"
                      onMouseDown={(e) => handleBlockDragStart(e, block)}
                    >
                      <GripVertical className="h-4 w-4 text-white/70" />
                    </div>
                    
                    <div className="flex-1 min-w-0 ml-5">
                      {editingId === block.id ? (
                        <Input
                          autoFocus
                          placeholder="Enter name..."
                          value={block.title}
                          onChange={(e) => updateBlockTitle(block.id, e.target.value)}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 text-sm bg-background border-input"
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1 cursor-pointer group/title"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(block.id);
                          }}
                        >
                          <span className="font-semibold text-white truncate text-sm drop-shadow">
                            {block.title || 'Click to name'}
                          </span>
                          <Pencil className="h-3 w-3 text-white/80 opacity-0 group-hover/title:opacity-100 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-1 ${isSmall ? '' : 'mt-auto ml-5'}`}>
                      <span className="text-xs text-white/90 drop-shadow">
                        {formatTime(block.startHour)} - {formatTime(block.endHour)}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20 ml-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Palette className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 bg-popover border border-border z-50" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-4 gap-1">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${block.color === color ? 'border-foreground' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateBlockColor(block.id, color)}
                              />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20"
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
          Click for 15-min block, drag to select range, or drag blocks to move them
        </p>
      </div>

      {/* Schedule Summary */}
      <div className="lg:w-auto lg:min-w-64 lg:max-w-sm space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Schedule Summary</h3>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Click on timeline to add blocks
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="w-4 h-4 rounded-full flex-shrink-0 border border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: block.color }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 bg-popover border border-border z-50" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-4 gap-1">
                          {COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${block.color === color ? 'border-foreground' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => updateBlockColor(block.id, color)}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
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
            onClick={onClearAll}
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};