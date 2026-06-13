import { and, eq, gte, lte, desc } from 'drizzle-orm';
import {
  habits as habitsTable,
  habitLogs as habitLogsTable,
  journalEntries as journalEntriesTable,
  dailyCheckins as dailyCheckinsTable,
  timeSessions as timeSessionsTable,
  scoreboardItems as scoreboardItemsTable,
  scoreboardLogs as scoreboardLogsTable,
} from '../../src/db/schema';
import { createDb, requireUserId, type Env } from './_helpers';

/**
 * MCP server for Today Little Log — JSON-RPC 2.0 over HTTP.
 *
 * Auth: better-auth session cookie via `requireUserId`. Clients running
 * in the same browser get auth for free. CLI / external agents must
 * either run inside the same browser context or carry the session
 * cookie explicitly (`Cookie: better-auth.session_token=...`).
 *
 * Scope is intentionally read-only — every tool is a `list_*` query
 * that returns the caller's own historical data.
 */

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: number | string | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: number | string | null;
  error: { code: number; message: string; data?: unknown };
}

const SERVER_INFO = {
  name: 'today-little-log',
  version: '0.1.0',
};

const PROTOCOL_VERSION = '2024-11-05';

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const TOOL_DEFS: ToolDef[] = [
  {
    name: 'list_habits',
    description: 'List the authenticated user\'s defined habits (title, target type/value, frequency, time vs count).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_habit_logs',
    description: 'List habit log entries. Filter by ISO date range (yyyy-MM-dd) and/or habit_id.',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Inclusive lower bound, yyyy-MM-dd.' },
        date_to: { type: 'string', description: 'Inclusive upper bound, yyyy-MM-dd.' },
        habit_id: { type: 'string', description: 'Optional habit id to restrict to.' },
        limit: { type: 'integer', minimum: 1, maximum: 500, default: 200 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_journal_entries',
    description: 'List journal entries. Returns date, entry_type, and content. Filter by date range.',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Inclusive lower bound, yyyy-MM-dd.' },
        date_to: { type: 'string', description: 'Inclusive upper bound, yyyy-MM-dd.' },
        entry_type: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_daily_checkins',
    description: 'List AM/PM ritual rows: intents, regret line, sleep hours, wins, wastes, day score.',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string' },
        date_to: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 60 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_timer_sessions',
    description: 'List completed timer/focus sessions. Each row: started_at, ended_at, duration_seconds, reference (habit or task), notes.',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Inclusive lower bound on started_at date.' },
        date_to: { type: 'string', description: 'Inclusive upper bound on started_at date.' },
        limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_scoreboard_logs',
    description: 'List daily scoreboard score entries with the user-attached note for the day.',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string' },
        date_to: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 500, default: 200 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_scoreboard_items',
    description: 'List the user\'s scoreboard items (the rows of the daily matrix) with their score bounds and ideal.',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'yyyy-MM. Omit for all configured.' },
      },
      additionalProperties: false,
    },
  },
];

function err(id: JsonRpcRequest['id'], code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, data } };
}
function ok(id: JsonRpcRequest['id'], result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
function asInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

async function runTool(
  name: string,
  rawArgs: unknown,
  db: ReturnType<typeof createDb>,
  userId: string,
): Promise<unknown> {
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>;

  switch (name) {
    case 'list_habits': {
      const rows = await db.select().from(habitsTable).where(eq(habitsTable.user_id, userId));
      return { habits: rows };
    }
    case 'list_habit_logs': {
      const dateFrom = asString(args.date_from);
      const dateTo = asString(args.date_to);
      const habitId = asString(args.habit_id);
      const limit = Math.min(500, asInt(args.limit, 200));
      const conds = [eq(habitLogsTable.user_id, userId)];
      if (dateFrom) conds.push(gte(habitLogsTable.date, dateFrom));
      if (dateTo) conds.push(lte(habitLogsTable.date, dateTo));
      if (habitId) conds.push(eq(habitLogsTable.habit_id, habitId));
      const rows = await db.select().from(habitLogsTable).where(and(...conds)).orderBy(desc(habitLogsTable.date)).limit(limit);
      return { logs: rows };
    }
    case 'list_journal_entries': {
      const dateFrom = asString(args.date_from);
      const dateTo = asString(args.date_to);
      const entryType = asString(args.entry_type);
      const limit = Math.min(200, asInt(args.limit, 50));
      const conds = [eq(journalEntriesTable.user_id, userId)];
      if (dateFrom) conds.push(gte(journalEntriesTable.date, dateFrom));
      if (dateTo) conds.push(lte(journalEntriesTable.date, dateTo));
      if (entryType) conds.push(eq(journalEntriesTable.entry_type, entryType));
      const rows = await db.select().from(journalEntriesTable).where(and(...conds)).orderBy(desc(journalEntriesTable.date)).limit(limit);
      return { entries: rows };
    }
    case 'list_daily_checkins': {
      const dateFrom = asString(args.date_from);
      const dateTo = asString(args.date_to);
      const limit = Math.min(200, asInt(args.limit, 60));
      const conds = [eq(dailyCheckinsTable.user_id, userId)];
      if (dateFrom) conds.push(gte(dailyCheckinsTable.date, dateFrom));
      if (dateTo) conds.push(lte(dailyCheckinsTable.date, dateTo));
      const rows = await db.select().from(dailyCheckinsTable).where(and(...conds)).orderBy(desc(dailyCheckinsTable.date)).limit(limit);
      return { checkins: rows };
    }
    case 'list_timer_sessions': {
      const dateFrom = asString(args.date_from);
      const dateTo = asString(args.date_to);
      const limit = Math.min(500, asInt(args.limit, 100));
      const conds = [eq(timeSessionsTable.user_id, userId)];
      if (dateFrom) conds.push(gte(timeSessionsTable.started_at, dateFrom));
      if (dateTo) conds.push(lte(timeSessionsTable.started_at, `${dateTo}T23:59:59Z`));
      const rows = await db.select().from(timeSessionsTable).where(and(...conds)).orderBy(desc(timeSessionsTable.started_at)).limit(limit);
      return { sessions: rows };
    }
    case 'list_scoreboard_logs': {
      const dateFrom = asString(args.date_from);
      const dateTo = asString(args.date_to);
      const limit = Math.min(500, asInt(args.limit, 200));
      const conds = [eq(scoreboardLogsTable.user_id, userId)];
      if (dateFrom) conds.push(gte(scoreboardLogsTable.date, dateFrom));
      if (dateTo) conds.push(lte(scoreboardLogsTable.date, dateTo));
      const rows = await db.select().from(scoreboardLogsTable).where(and(...conds)).orderBy(desc(scoreboardLogsTable.date)).limit(limit);
      return { logs: rows };
    }
    case 'list_scoreboard_items': {
      const month = asString(args.month);
      const conds = [eq(scoreboardItemsTable.user_id, userId)];
      if (month) conds.push(eq(scoreboardItemsTable.score_month, month));
      const rows = await db.select().from(scoreboardItemsTable).where(and(...conds));
      return { items: rows };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleRpc(
  rpc: JsonRpcRequest,
  db: ReturnType<typeof createDb>,
  userId: string,
): Promise<JsonRpcSuccess | JsonRpcError | null> {
  const id = rpc.id ?? null;
  switch (rpc.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOL_DEFS });
    case 'tools/call': {
      const params = (rpc.params ?? {}) as { name?: string; arguments?: unknown };
      if (!params.name) return err(id, -32602, 'Missing tool name');
      try {
        const result = await runTool(params.name, params.arguments, db, userId);
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
          isError: false,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'tool failed';
        return ok(id, {
          content: [{ type: 'text', text: message }],
          isError: true,
        });
      }
    }
    default:
      return err(id, -32601, `Method not found: ${rpc.method}`);
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({
        server: SERVER_INFO,
        protocolVersion: PROTOCOL_VERSION,
        transport: 'http+json-rpc',
        endpoint: '/api/mcp',
        auth: 'better-auth session cookie',
        tools: TOOL_DEFS.map((t) => ({ name: t.name, description: t.description })),
      }, null, 2),
      { headers: { 'content-type': 'application/json' } },
    );
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });
  }

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(err(null, -32700, 'Parse error')), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let db: ReturnType<typeof createDb>;
  let userId: string | null;
  try {
    db = createDb(env);
    userId = await requireUserId(request, env, db);
  } catch (e) {
    // Misconfigured deployment (missing TURSO_* / BETTER_AUTH_*) —
    // return a structured JSON-RPC error instead of a 500 stack trace.
    const message = e instanceof Error ? e.message : 'auth init failed';
    return new Response(JSON.stringify(err(null, -32001, `Server misconfigured: ${message}`)), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!userId) {
    return new Response(JSON.stringify(err(null, -32000, 'Unauthorized')), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const batch = Array.isArray(body);
  const rpcs = batch ? body : [body];
  const responses: Array<JsonRpcSuccess | JsonRpcError> = [];
  for (const rpc of rpcs) {
    if (!rpc || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
      responses.push(err(rpc?.id ?? null, -32600, 'Invalid Request'));
      continue;
    }
    const result = await handleRpc(rpc, db, userId);
    if (result) responses.push(result);
  }

  if (responses.length === 0) {
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify(batch ? responses : responses[0]), {
    headers: { 'content-type': 'application/json' },
  });
};
