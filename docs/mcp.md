# MCP Server

Today Little Log exposes a Model Context Protocol (MCP) server at
`/api/mcp` so external agents can query the historical context this
app collects.

## Transport

JSON-RPC 2.0 over HTTP. POST a JSON-RPC request (or batch) to
`/api/mcp`; the response body is the JSON-RPC reply.

GET on the same path returns a small discovery payload listing the
server name, protocol version, and tool list.

## Authentication

The server reuses the better-auth session cookie. In-browser agents
authenticate automatically. External CLI agents need to supply the
cookie explicitly (`Cookie: better-auth.session_token=<token>`).
Unauthenticated requests get `401` with a JSON-RPC `-32000` error.

There is no API-token system today. If you need one (likely for
shipping a desktop MCP client), that is a follow-up.

## Scope

Read-only. Every tool returns the caller's own data. No writes, no
cross-user access, no mutation tools.

## Tools

| Tool                     | Purpose                                                                  |
|--------------------------|--------------------------------------------------------------------------|
| `list_habits`            | All defined habits with target type, value, frequency, time vs count.    |
| `list_habit_logs`        | Daily habit values. Filter by date range and/or habit id.                |
| `list_journal_entries`   | Journal rows. Filter by date range and entry type.                       |
| `list_daily_checkins`    | AM/PM ritual rows: intents, regret, sleep, wins, wastes, day score.      |
| `list_timer_sessions`    | Completed focus/timer sessions.                                          |
| `list_scoreboard_items`  | Scoreboard matrix rows with score bounds.                                |
| `list_scoreboard_logs`   | Daily scoreboard score entries.                                          |

All tools return `{ content: [...text...], structuredContent: <typed
JSON> }` per the MCP `tools/call` spec.

## Quickstart

```sh
# GET — discovery
curl -s https://today-little-log.pages.dev/api/mcp | jq

# tools/list (browser session, cookie auth)
curl -s https://today-little-log.pages.dev/api/mcp \
  -H 'content-type: application/json' \
  --cookie "$YOUR_BETTER_AUTH_COOKIE" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq

# tools/call — last 7 days of habit logs
curl -s https://today-little-log.pages.dev/api/mcp \
  -H 'content-type: application/json' \
  --cookie "$YOUR_BETTER_AUTH_COOKIE" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_habit_logs","arguments":{"date_from":"2026-06-05","date_to":"2026-06-12"}}}' | jq
```

## Why MCP

The four kinds of data this app captures — habits, journal, timer
sessions, daily scoreboard — are the historical context for an AI
layer that lives outside the app. Exposing them as MCP tools means
any compliant agent (Claude desktop, Cursor, etc.) can read the same
history the in-app chat assistant already does, without needing a
bespoke export.
