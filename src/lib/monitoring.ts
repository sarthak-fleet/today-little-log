import { initPostHog, track } from '@saas-maker/posthog-client';

let installed = false;

export function installBrowserMonitoring(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  initPostHog();

  window.addEventListener('error', (event) => {
    track('foundry_page_crash', {
      project_slug: 'today-little-log',
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
    track('foundry_page_crash', {
      project_slug: 'today-little-log',
      source: 'unhandled_rejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      url: window.location.href,
    });
  });
}

export function reportPageCrash(error: Error, info?: Record<string, unknown>): void {
  track('foundry_page_crash', {
    project_slug: 'today-little-log',
    source: 'manual',
    message: error.message,
    stack: error.stack,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...info,
  });
}
