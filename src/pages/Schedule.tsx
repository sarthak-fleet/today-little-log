import { ScheduleMaker } from '@/components/ScheduleMaker';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Schedule = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-serif font-bold">Schedule Maker</h1>
            </div>
          </div>
          <p className="text-muted-foreground ml-12">
            Drag on the timeline to create time blocks and plan your day
          </p>
        </header>

        {/* Schedule Maker */}
        <ScheduleMaker />
      </div>
    </div>
  );
};

export default Schedule;
