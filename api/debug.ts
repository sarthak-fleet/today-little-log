import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  blocks: text('blocks', { mode: 'json' }).notNull().$type<unknown[]>().default([]),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (t) => [uniqueIndex('schedules_user_id_idx').on(t.user_id)]);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.TURSO_DATABASE_URL!;
  const token = process.env.TURSO_AUTH_TOKEN!;
  try {
    const client = createClient({ url, authToken: token });
    const db = drizzle(client);
    const rows = await db.select().from(schedules).limit(1);
    return res.json({ ok: true, rowCount: rows.length });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      code: err.code,
      url: url.substring(0, 20) + '...',
      urlFull: url,
      tokenLen: token?.length,
      stack: err.stack?.split('\n').slice(0, 8),
    });
  }
}
