import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    const db = drizzle(client);
    const result = await db.run({ sql: 'SELECT 1 as ok', args: [] });
    return res.json({ ok: true, result });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
