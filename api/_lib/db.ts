import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../../src/db/schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
export { schema };
export {
  user, session, account, verification,
  profiles, projects, tasks, habits, habitLogs,
  emotions, journalEntries, lifeRules, schedules, timeSessions,
} from '../../src/db/schema';
