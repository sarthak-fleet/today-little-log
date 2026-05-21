import { GuestNotice } from '@/components/GuestNotice';
import { HomeHero } from '@/components/HomeHero';
import { Scoreboard } from '@/components/Scoreboard';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { loading, user } = useAuth();
  const isGuest = !loading && !user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isGuest && <HomeHero />}

      {isGuest && (
        <section className="mx-auto max-w-5xl px-4 pt-5">
          <GuestNotice message="You can test locally as a guest. Sign in to keep this scoreboard across devices." />
        </section>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        <Scoreboard readOnly />
      </main>
    </div>
  );
};

export default Index;
