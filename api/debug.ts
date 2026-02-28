import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './_schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows = await db.select().from(schema.schedules).limit(1);
    return res.json({ ok: true, rowCount: rows.length });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
