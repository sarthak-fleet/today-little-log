import { WifiOff } from 'lucide-react';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Thin, non-blocking banner shown while the browser is offline. The app keeps
 * working from local state — this only sets the expectation that changes
 * won't sync until the connection returns.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      <span>You&apos;re offline — changes will sync once you reconnect.</span>
    </div>
  );
}
