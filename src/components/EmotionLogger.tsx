import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, MessageSquare, X } from 'lucide-react';
import { useEmotions, EMOTION_OPTIONS, Emotion } from '@/hooks/useEmotions';
import { format, formatDistanceToNow } from 'date-fns';

export function EmotionLogger() {
  const { emotions, logEmotion, deleteEmotion, getLastEmotion } = useEmotions();
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const lastEmotion = getLastEmotion();
  const lastEmotionOption = lastEmotion 
    ? EMOTION_OPTIONS.find(e => e.value === lastEmotion.emotion)
    : null;

  const handleLogEmotion = async () => {
    if (!selectedEmotion) return;
    
    setIsLogging(true);
    await logEmotion(selectedEmotion, comment || undefined);
    setSelectedEmotion(null);
    setComment('');
    setIsLogging(false);
  };

  const handleQuickLog = async (emotionValue: string) => {
    setSelectedEmotion(emotionValue);
  };

  const handleDeleteEmotion = async (id: string) => {
    await deleteEmotion(id);
  };

  // Group emotions by date
  const groupedEmotions = emotions.reduce((acc, emotion) => {
    const date = format(new Date(emotion.logged_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(emotion);
    return acc;
  }, {} as Record<string, Emotion[]>);

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        {/* Last emotion display */}
        {lastEmotion && lastEmotionOption && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/30">
            <span className="text-2xl">{lastEmotionOption.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Feeling {lastEmotionOption.label.toLowerCase()}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastEmotion.logged_at), { addSuffix: true })}
              </p>
              {lastEmotion.comment && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  "{lastEmotion.comment}"
                </p>
              )}
            </div>
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                  <History className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Emotion History</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  {Object.entries(groupedEmotions).length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No emotions logged yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedEmotions).map(([date, dayEmotions]) => (
                        <div key={date}>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            {format(new Date(date), 'EEEE, MMMM d')}
                          </h4>
                          <div className="space-y-2">
                            {dayEmotions.map(emotion => {
                              const opt = EMOTION_OPTIONS.find(e => e.value === emotion.emotion);
                              return (
                                <div
                                  key={emotion.id}
                                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 group"
                                >
                                  <span className="text-xl">{opt?.emoji || '😐'}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {opt?.label || emotion.emotion}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(emotion.logged_at), 'h:mm a')}
                                      </span>
                                    </div>
                                    {emotion.comment && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {emotion.comment}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteEmotion(emotion.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Emotion picker */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">How are you feeling?</p>
          <div className="flex flex-wrap gap-2">
            {EMOTION_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleQuickLog(option.value)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all
                  ${selectedEmotion === option.value
                    ? 'bg-primary text-primary-foreground scale-105'
                    : 'bg-muted/50 hover:bg-muted'
                  }
                `}
              >
                <span>{option.emoji}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Comment and submit */}
          {selectedEmotion && (
            <div className="flex gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="relative flex-1">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add a note (optional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogEmotion();
                  }}
                />
              </div>
              <Button 
                onClick={handleLogEmotion} 
                disabled={isLogging}
                size="sm"
              >
                Log
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedEmotion(null);
                  setComment('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
