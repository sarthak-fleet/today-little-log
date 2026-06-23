import { useEffect, useState } from 'react';

/**
 * Tracks browser online/offline state. Used to show a non-blocking banner so
 * the user understands why syncs may be failing — the app stays usable
 * offline (reads come from local state / cache), it just can't persist.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
