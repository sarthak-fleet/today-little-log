import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.TURSO_DATABASE_URL;
  return res.json({
    hasUrl: !!url,
    urlLength: url?.length ?? 0,
    urlPrefix: url?.substring(0, 10) ?? 'MISSING',
    nodeVersion: process.version,
    envKeys: Object.keys(process.env).filter(k =>
      k.startsWith('TURSO') || k.startsWith('BETTER') || k.startsWith('GOOGLE') || k.startsWith('VITE_')
    ),
  });
}
