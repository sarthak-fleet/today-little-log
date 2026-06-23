const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY ?? 'phc_qgiAarw4Co4pw9fz3Fxj4UJaHmqzFetqs4JrXhGc35Nd';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let installed = false;
let posthogPromise: Promise<typeof import('posthog-js').default> | null = null;

function loadPosthog() {
  if (!posthogPromise) {
    posthogPromise = import('posthog-js').then((mod) => mod.default);
  }
  return posthogPromise;
}

export function installBrowserMonitoring(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  void loadPosthog().then((posthog) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'always',
      capture_pageview: false,
      autocapture: false,
    });

    window.addEventListener('error', (event) => {
      posthog.capture('foundry_page_crash', {
        project_id: 'today-little-log',
        source: 'window_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
        url: window.location.href,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      posthog.capture('foundry_page_crash', {
        project_id: 'today-little-log',
        source: 'unhandled_rejection',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        url: window.location.href,
      });
    });
  });
}

export async function reportPageCrash(error: Error, info?: Record<string, unknown>): Promise<void> {
  const posthog = await loadPosthog();
  posthog.capture('foundry_page_crash', {
    project_id: 'today-little-log',
    source: 'manual',
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    ...info,
  });
}
