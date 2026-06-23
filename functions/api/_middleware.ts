/**
 * Backend performance timing middleware for Pages Functions.
 *
 * Wraps every /api/* request to measure response time with
 * `performance.now()`, reports it via the `Server-Timing` response header,
 * and logs requests slower than 200 ms via `console.warn`.
 */
export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const start = performance.now();
  const url = new URL(request.url);

  const response = await context.next();
  const duration = performance.now() - start;

  // Add Server-Timing header
  const headers = new Headers(response.headers);
  headers.set('Server-Timing', `app;dur=${Math.round(duration)}`);
  const timedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  // Log slow requests
  if (duration > 200) {
    console.warn(`[slow] ${request.method} ${url.pathname} — ${Math.round(duration)}ms`);
  }

  return timedResponse;
};
