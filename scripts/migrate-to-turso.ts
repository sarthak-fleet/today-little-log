// scripts/migrate-to-turso.ts
// Run with: npx tsx scripts/migrate-to-turso.ts
//
// Reads all data from Supabase (via service role key to bypass RLS),
// writes to Turso. Preserves all IDs and user_ids.
//
// Required env vars:
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createTursoClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema';

const supabase = createSupabaseClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const turso = createTursoClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(turso, { schema });

async function migrateTable(name: string, table: any) {
  console.log(`Migrating ${name}...`);
  const { data, error } = await supabase.from(name).select('*');
  if (error) throw new Error(`Failed to read ${name}: ${error.message}`);
  if (!data || data.length === 0) {
    console.log(`  ${name}: 0 rows, skipping`);
    return;
  }
  // Insert in batches of 50 (SQLite has variable limits)
  for (let i = 0; i < data.length; i += 50) {
    const batch = data.slice(i, i + 50);
    await db.insert(table).values(batch);
  }
  console.log(`  ${name}: ${data.length} rows migrated`);
}

async function main() {
  // Order: parent tables first, then children (FK constraints)
  await migrateTable('profiles', schema.profiles);
  await migrateTable('projects', schema.projects);
  await migrateTable('tasks', schema.tasks);
  await migrateTable('habits', schema.habits);
  await migrateTable('habit_logs', schema.habitLogs);
  await migrateTable('emotions', schema.emotions);
  await migrateTable('journal_entries', schema.journalEntries);
  await migrateTable('life_rules', schema.lifeRules);
  await migrateTable('schedules', schema.schedules);
  await migrateTable('time_sessions', schema.timeSessions);

  console.log('\nMigration complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
