import { eq } from 'drizzle-orm';
import {
  profiles,
  userStats,
  dailyCheckins,
  weeklyReviews,
  quickLogs,
  weightLogs,
  urgeLogs,
  devLogs,
  foodItems,
  foodLogs,
  goals,
  goalActions,
  manaState,
  projects,
  tasks,
  habits,
  habitLogs,
  emotions,
  journalEntries,
  lifeRules,
  schedules,
  timeSessions,
  scoreboardItems,
  scoreboardLogs,
  scoreboardDayNotes,
  scoreboardMonthLocks,
} from '../../src/db/schema';
import { createDb, json, requireUserId, type Env } from './_helpers';

const EXPORT_VERSION = 1;

/**
 * GET /api/data-export — single-shot dump of every user-scoped row,
 * returned as a downloadable JSON file. Auth tables (user/session/
 * account/verification) are intentionally excluded — they're identity,
 * not user data. Lets the user back up, migrate off, or hand their
 * trail to a researcher without surfacing it through twenty endpoints.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  // Tables keyed by `user_id`. One round-trip per table — small data
  // sizes per user, no need for batching.
  const [
    profileRows,
    userStatsRows,
    dailyCheckinsRows,
    weeklyReviewsRows,
    quickLogsRows,
    weightLogsRows,
    urgeLogsRows,
    devLogsRows,
    foodItemsRows,
    foodLogsRows,
    goalsRows,
    goalActionsRows,
    manaStateRows,
    projectsRows,
    tasksRows,
    habitsRows,
    habitLogsRows,
    emotionsRows,
    journalEntriesRows,
    lifeRulesRows,
    schedulesRows,
    timeSessionsRows,
    scoreboardItemsRows,
    scoreboardLogsRows,
    scoreboardDayNotesRows,
    scoreboardMonthLocksRows,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.user_id, userId)),
    db.select().from(userStats).where(eq(userStats.user_id, userId)),
    db.select().from(dailyCheckins).where(eq(dailyCheckins.user_id, userId)),
    db.select().from(weeklyReviews).where(eq(weeklyReviews.user_id, userId)),
    db.select().from(quickLogs).where(eq(quickLogs.user_id, userId)),
    db.select().from(weightLogs).where(eq(weightLogs.user_id, userId)),
    db.select().from(urgeLogs).where(eq(urgeLogs.user_id, userId)),
    db.select().from(devLogs).where(eq(devLogs.user_id, userId)),
    db.select().from(foodItems).where(eq(foodItems.user_id, userId)),
    db.select().from(foodLogs).where(eq(foodLogs.user_id, userId)),
    db.select().from(goals).where(eq(goals.user_id, userId)),
    db.select().from(goalActions).where(eq(goalActions.user_id, userId)),
    db.select().from(manaState).where(eq(manaState.user_id, userId)),
    db.select().from(projects).where(eq(projects.user_id, userId)),
    db.select().from(tasks).where(eq(tasks.user_id, userId)),
    db.select().from(habits).where(eq(habits.user_id, userId)),
    db.select().from(habitLogs).where(eq(habitLogs.user_id, userId)),
    db.select().from(emotions).where(eq(emotions.user_id, userId)),
    db.select().from(journalEntries).where(eq(journalEntries.user_id, userId)),
    db.select().from(lifeRules).where(eq(lifeRules.user_id, userId)),
    db.select().from(schedules).where(eq(schedules.user_id, userId)),
    db.select().from(timeSessions).where(eq(timeSessions.user_id, userId)),
    db.select().from(scoreboardItems).where(eq(scoreboardItems.user_id, userId)),
    db.select().from(scoreboardLogs).where(eq(scoreboardLogs.user_id, userId)),
    db.select().from(scoreboardDayNotes).where(eq(scoreboardDayNotes.user_id, userId)),
    db.select().from(scoreboardMonthLocks).where(eq(scoreboardMonthLocks.user_id, userId)),
  ]);

  const exportedAt = new Date().toISOString();
  const payload = {
    format: 'today-little-log-export',
    formatVersion: EXPORT_VERSION,
    exportedAt,
    userId,
    tables: {
      profile: profileRows[0] ?? null,
      user_stats: userStatsRows[0] ?? null,
      daily_checkins: dailyCheckinsRows,
      weekly_reviews: weeklyReviewsRows,
      quick_logs: quickLogsRows,
      weight_logs: weightLogsRows,
      urge_logs: urgeLogsRows,
      dev_logs: devLogsRows,
      food_items: foodItemsRows,
      food_logs: foodLogsRows,
      goals: goalsRows,
      goal_actions: goalActionsRows,
      mana_state: manaStateRows[0] ?? null,
      projects: projectsRows,
      tasks: tasksRows,
      habits: habitsRows,
      habit_logs: habitLogsRows,
      emotions: emotionsRows,
      journal_entries: journalEntriesRows,
      life_rules: lifeRulesRows,
      schedules: schedulesRows,
      time_sessions: timeSessionsRows,
      scoreboard_items: scoreboardItemsRows,
      scoreboard_logs: scoreboardLogsRows,
      scoreboard_day_notes: scoreboardDayNotesRows,
      scoreboard_month_locks: scoreboardMonthLocksRows,
    },
  };

  const filename = `today-little-log-${exportedAt.slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
};
