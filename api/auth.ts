import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './_lib/auth-instance';

const handler = toNodeHandler(auth);

export default async function (req: VercelRequest, res: VercelResponse) {
  // Vercel rewrites /api/auth/callback/google → /api/auth?authPath=callback/google
  // Reconstruct the original URL so Better Auth can route correctly
  const authPath = req.query.authPath;
  if (authPath) {
    const subPath = Array.isArray(authPath) ? authPath.join('/') : authPath;
    // Remove authPath from query string, keep everything else
    const url = new URL(req.url!, `http://${req.headers.host}`);
    url.searchParams.delete('authPath');
    const qs = url.searchParams.toString();
    req.url = `/api/auth/${subPath}${qs ? '?' + qs : ''}`;
  }
  return handler(req, res);
}
