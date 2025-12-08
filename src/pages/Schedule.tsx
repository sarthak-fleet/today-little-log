import { ScheduleMaker } from '@/components/ScheduleMaker';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, BookOpen, Feather, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSchedule } from '@/hooks/useSchedule';

const Schedule = () => {
  const { user } = useAuth();
  const { blocks, isLoaded, isSaving, updateBlocks, clearAll, isLoggedIn } = useSchedule();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="py-4 px-4 border-b border-border/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-serif font-bold">Schedule Maker</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-muted-foreground hover:text-foreground"
              title="Rules for Life"
            >
              <Link to="/rules">
                <BookOpen className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-muted-foreground hover:text-foreground"
              title="Journal"
            >
              <Link to="/">
                <Feather className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-5xl mx-auto px-4 py-6">
        {/* Login prompt */}
        {!isLoggedIn && (
          <div className="mb-6 p-3 bg-muted/50 border border-border rounded-lg flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <LogIn className="h-4 w-4 inline mr-2" />
              Log in to save your schedule across devices
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
          </div>
        )}

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
