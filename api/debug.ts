import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schedules } from './_lib/db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows = await db.select().from(schedules).limit(1);
    return res.json({ ok: true, rowCount: rows.length });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
