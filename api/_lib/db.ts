import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

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
  userStats, quickLogs, weightLogs, urgeLogs,
  dailyCheckins, devLogs, weeklyReviews,
  foodItems, foodLogs, goals, goalActions, manaState,
} from './schema';
