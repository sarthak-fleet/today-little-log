import { toast } from '@/components/ui/sonner';

/** Error raised when a request never reaches the server (offline / DNS / CORS). */
export class NetworkError extends Error {
  constructor(message = 'network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Error raised when the server responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Throttle the offline toast so a burst of failed syncs shows it once.
let lastNetworkToastAt = 0;

function notifyNetworkFailure() {
  const now = Date.now();
  if (now - lastNetworkToastAt < 8000) return;
  lastNetworkToastAt = now;
  toast.error("You're offline", {
    description:
      "We couldn't reach the server. Your latest change wasn't saved — it'll work once you're back online.",
  });
}

interface ApiFetchOptions extends RequestInit {
  /**
   * Show a toast when the request fails because the network is unreachable.
   * Defaults to true for writes (so a dropped sync is never silent) and false
   * for GETs (callers there usually have their own fallback / loading state).
   */
  toastOnNetworkError?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const isWrite = method !== 'GET' && method !== 'HEAD';
  const toastOnNetworkError = options.toastOnNetworkError ?? isWrite;

  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && isWrite) {
    headers.set('Content-Type', 'application/json');
  }

  const startedAt = performance.now();
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (cause) {
    // `fetch` only rejects when the request never completed — i.e. the
    // network is down. Surface it so a failed sync degrades gracefully.
    if (toastOnNetworkError) notifyNetworkFailure();
    throw new NetworkError(cause instanceof Error ? cause.message : 'network request failed');
  }
  const durationMs = performance.now() - startedAt;

  if (import.meta.env.DEV) {
    const serverTiming = res.headers.get('server-timing');
    const timingNote = serverTiming ? ` | ${serverTiming}` : '';
    console.info(`[api] ${method} ${path} ${res.status} ${Math.round(durationMs)}ms${timingNote}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(text || `API error ${res.status}`, res.status);
  }

  return res.json();
}
