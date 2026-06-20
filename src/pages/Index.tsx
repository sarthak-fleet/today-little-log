import { lazy, Suspense, useEffect, useState } from 'react';

import { GuestNotice } from '@/components/GuestNotice';
import { HomeHero } from '@/components/HomeHero';
import { useAuth } from '@/hooks/useAuth';

const Scoreboard = lazy(() =>
  import('@/components/Scoreboard').then((m) => ({ default: m.Scoreboard })),
);
const WeeklyReflection = lazy(() =>
  import('@/components/WeeklyReflection').then((m) => ({ default: m.WeeklyReflection })),
);

const Index = () => {
  const { user } = useAuth();
  const [showBelowFold, setShowBelowFold] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShowBelowFold(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Show landing hero whenever there is no signed-in user — including while
  // auth is still resolving — so the index.html LCP shell isn't replaced by
  // a blank screen and then a late React paint.
  const isGuest = !user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isGuest && <HomeHero />}

      {showBelowFold && isGuest ? (
        <Suspense fallback={null}>
          <WeeklyReflection />
        </Suspense>
      ) : null}

      {showBelowFold && isGuest ? (
        <section className="mx-auto max-w-5xl px-4 pt-5">
          <GuestNotice message="You can test locally as a guest. Sign in to keep this scoreboard across devices." />
        </section>
      ) : null}

      <main id="scoreboard" className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        {showBelowFold ? (
          <Suspense fallback={null}>
            <Scoreboard />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
};

export default Index;
