import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../_lib/auth';

const handler = toNodeHandler(auth);

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
