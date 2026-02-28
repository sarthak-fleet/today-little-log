import type { VercelRequest } from '@vercel/node';
import { and, eq, gt } from 'drizzle-orm';
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

async function verifySignedCookieValue(
  value: string,
  secret: string
): Promise<string | null> {
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === value.length - 1) return null;

  const unsignedValue = value.slice(0, lastDot);
  const signatureBase64 = value.slice(lastDot + 1);
  const signatureBytes = Buffer.from(signatureBase64, 'base64');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    new TextEncoder().encode(unsignedValue)
  );

  return isValid ? unsignedValue : null;
}

async function getSessionToken(req: VercelRequest): Promise<string | null> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  for (const cookieKey of SESSION_COOKIE_KEYS) {
    const cookieValue = getCookieValue(req, cookieKey);
    if (!cookieValue) continue;

    const unsignedToken = await verifySignedCookieValue(cookieValue, secret);
    if (unsignedToken) return unsignedToken;
  }

  return null;
}

export async function getUserId(req: VercelRequest): Promise<string | null> {
  const token = await getSessionToken(req);
  if (!token) return null;

  const [row] = await db
    .select({ userId: session.userId })
    .from(session)
    .where(and(eq(session.token, token), gt(session.expiresAt, new Date())))
    .limit(1);

  return row?.userId ?? null;
}
