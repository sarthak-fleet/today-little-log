import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TodayPrompt } from '@/components/TodayPrompt';
import { PastEntries } from '@/components/PastEntries';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useAuth } from '@/hooks/useAuth';
import { Feather, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Index = () => {
  const { getTodayEntry, getRecentEntries, saveEntry, isLoaded } = useJournalEntries();
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Feather className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const todayEntry = getTodayEntry();
  const pastEntries = getRecentEntries(20);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-6 px-4 border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Feather className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-foreground text-lg">
                Daily Journal
              </h1>
              <p className="text-xs text-muted-foreground font-sans">
                A moment for reflection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'User'} />
              <AvatarFallback className="text-xs">
                {profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Today's Entry */}
        <section className="mb-12">
          <TodayPrompt
            todayEntry={todayEntry}
            onSave={(content) => saveEntry(content)}
          />
        </section>

        {/* Divider */}
        {pastEntries.length > 0 && (
          <div className="relative my-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground font-sans">
                Looking back
              </span>
            </div>
          </div>
        )}

        {/* Past Entries */}
        <section>
          <PastEntries entries={pastEntries} />
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-muted-foreground font-sans">
          Your thoughts, securely stored
        </p>
      </footer>
    </div>
  );
};

export default Index;
