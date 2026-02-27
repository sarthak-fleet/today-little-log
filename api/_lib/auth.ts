import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import type { VercelRequest } from '@vercel/node';
import { db, schema } from './db';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});

export async function getUserId(req: VercelRequest): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) return null;
  return session.user.id;
}
