export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Content-Type') && method !== 'GET' && method !== 'HEAD') {
    headers.set('Content-Type', 'application/json');
  }

  const startedAt = performance.now();
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });
  const durationMs = performance.now() - startedAt;

  if (import.meta.env.DEV) {
    const serverTiming = res.headers.get('server-timing');
    const timingNote = serverTiming ? ` | ${serverTiming}` : '';
    console.debug(`[api] ${method} ${path} ${res.status} ${Math.round(durationMs)}ms${timingNote}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  return res.json();
}
