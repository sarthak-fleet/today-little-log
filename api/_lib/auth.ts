import type { VercelRequest } from '@vercel/node';
import { and, eq, gt } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db, session } from './db';

const SESSION_COOKIE_KEYS = [
  '__Secure-better-auth.session_token',
  'better-auth.session_token',
  '__Secure-better-auth-session_token',
  'better-auth-session_token',
];

function getCookieValue(req: VercelRequest, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const segments = cookieHeader.split(';');
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const raw = trimmed.slice(name.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return null;
}

function unsignCookieValue(value: string, secret: string): string | null {
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === value.length - 1) return null;

  const unsignedValue = value.slice(0, lastDot);
  const signatureBase64 = value.slice(lastDot + 1);

  const expectedSignature = createHmac('sha256', secret)
    .update(unsignedValue)
    .digest('base64');

  const actualBytes = Buffer.from(signatureBase64, 'base64');
  const expectedBytes = Buffer.from(expectedSignature, 'base64');
  if (actualBytes.length !== expectedBytes.length) return null;

  return timingSafeEqual(actualBytes, expectedBytes) ? unsignedValue : null;
}

async function getUserIdFast(req: VercelRequest): Promise<string | null> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  for (const cookieKey of SESSION_COOKIE_KEYS) {
    const cookieValue = getCookieValue(req, cookieKey);
    if (!cookieValue) continue;

    const token = unsignCookieValue(cookieValue, secret);
    if (!token) continue;

    const [row] = await db
      .select({ userId: session.userId })
      .from(session)
      .where(and(eq(session.token, token), gt(session.expiresAt, new Date())))
      .limit(1);

    if (row?.userId) return row.userId;
  }

  return null;
}

async function getUserIdFallback(req: VercelRequest): Promise<string | null> {
  const [{ fromNodeHeaders }, { auth }] = await Promise.all([
    import('better-auth/node'),
    import('./auth-instance'),
  ]);

  const sessionData = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return sessionData?.user?.id ?? null;
}

export async function getUserId(req: VercelRequest): Promise<string | null> {
  try {
    const fastUserId = await getUserIdFast(req);
    if (fastUserId) return fastUserId;
  } catch {
    // If fast-path parsing/query fails, use canonical Better Auth lookup.
  }

  try {
    return await getUserIdFallback(req);
  } catch {
    return null;
  }
}
