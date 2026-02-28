import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const dbModule = await import('./_lib/db');
    return res.json({
      ok: true,
      keys: Object.keys(dbModule),
      hasDb: !!dbModule.db,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
