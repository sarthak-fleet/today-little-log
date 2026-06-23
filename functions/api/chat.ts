/**
 * /api/chat — BYOK chat proxy.
 *
 * Public (no platform auth): the user supplies their own provider URL,
 * API key, and model in the request body. We forward the call, then
 * stream plain-text deltas back. Two providers supported:
 *
 *  - OpenAI-compatible (default): standard /v1/chat/completions SSE.
 *  - Anthropic-style: /v1/messages with x-api-key + anthropic-version.
 *    Auto-selected when endpoint contains "anthropic.com" or when the
 *    body sets `provider: "anthropic"`.
 *
 * Response body is `text/plain` — each chunk is raw assistant text.
 * Errors are JSON with status >= 400.
 */

import type { Env } from './_helpers';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  endpointUrl?: string;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  messages?: ChatMessage[];
  provider?: 'openai' | 'anthropic';
  maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 2048;

function jsonError(message: string, status: number, code?: string) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function detectProvider(req: ChatRequest): 'openai' | 'anthropic' {
  if (req.provider === 'anthropic') return 'anthropic';
  if (req.provider === 'openai') return 'openai';
  const url = (req.endpointUrl ?? '').toLowerCase();
  if (url.includes('anthropic.com')) return 'anthropic';
  return 'openai';
}

function buildOpenAIUrl(endpointUrl: string): string {
  const base = endpointUrl.trim().replace(/\/+$/, '');
  if (base.endsWith('/chat/completions')) return base;
  if (/\/v\d+$/.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

function buildAnthropicUrl(endpointUrl: string): string {
  const base = endpointUrl.trim().replace(/\/+$/, '');
  if (base.endsWith('/messages')) return base;
  if (/\/v\d+$/.test(base)) return `${base}/messages`;
  return `${base}/v1/messages`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: ChatRequest;
  try {
    body = (await context.request.json()) as ChatRequest;
  } catch {
    return jsonError('Invalid JSON body', 400, 'BAD_JSON');
  }

  const endpointUrl = body.endpointUrl?.trim();
  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim();
  const messages = Array.isArray(body.messages) ? body.messages : null;

  if (!endpointUrl) return jsonError('endpointUrl required', 400, 'MISSING_ENDPOINT');
  if (!apiKey) return jsonError('apiKey required', 400, 'MISSING_KEY');
  if (!model) return jsonError('model required', 400, 'MISSING_MODEL');
  if (!messages || messages.length === 0)
    return jsonError('messages required', 400, 'MISSING_MESSAGES');

  const provider = detectProvider(body);
  const systemPrompt = body.systemPrompt?.trim() || undefined;
  const maxTokens = Number.isFinite(body.maxTokens)
    ? Math.max(64, Math.min(8192, body.maxTokens!))
    : DEFAULT_MAX_TOKENS;

  try {
    if (provider === 'anthropic') {
      return await proxyAnthropic({
        endpointUrl,
        apiKey,
        model,
        systemPrompt,
        messages,
        maxTokens,
      });
    }
    return await proxyOpenAI({ endpointUrl, apiKey, model, systemPrompt, messages, maxTokens });
  } catch (err) {
    return jsonError((err as Error).message ?? 'Upstream error', 502, 'UPSTREAM_ERROR');
  }
};

interface ProxyArgs {
  endpointUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  maxTokens: number;
}

async function proxyOpenAI(args: ProxyArgs): Promise<Response> {
  const url = buildOpenAIUrl(args.endpointUrl);
  const allMessages: ChatMessage[] = [];
  if (args.systemPrompt) allMessages.push({ role: 'system', content: args.systemPrompt });
  allMessages.push(...args.messages);

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      messages: allMessages,
      max_tokens: args.maxTokens,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return jsonError(
      `Provider error: ${upstream.status} ${text.slice(0, 500)}`,
      upstream.status || 502,
      'PROVIDER_ERROR'
    );
  }

  return streamSse(upstream.body, parseOpenAIChunk);
}

async function proxyAnthropic(args: ProxyArgs): Promise<Response> {
  const url = buildAnthropicUrl(args.endpointUrl);

  // Anthropic only allows alternating user/assistant; system goes top-level.
  // We pass messages through, but coerce any 'system' role into the system field.
  let extractedSystem: string | undefined;
  const userMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of args.messages) {
    if (m.role === 'system') {
      extractedSystem = extractedSystem ? `${extractedSystem}\n\n${m.content}` : m.content;
    } else {
      userMessages.push({ role: m.role, content: m.content });
    }
  }
  const system = [args.systemPrompt, extractedSystem].filter(Boolean).join('\n\n') || undefined;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens,
      system,
      messages: userMessages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return jsonError(
      `Provider error: ${upstream.status} ${text.slice(0, 500)}`,
      upstream.status || 502,
      'PROVIDER_ERROR'
    );
  }

  return streamSse(upstream.body, parseAnthropicChunk);
}

/** Re-stream an upstream SSE body as plain text, extracting deltas via `parser`. */
function streamSse(
  upstream: ReadableStream<Uint8Array>,
  parser: (line: string) => string | null
): Response {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const text = parser(line);
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
        if (buffer.length) {
          for (const line of buffer.split('\n')) {
            const text = parser(line);
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new Response(out, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-content-type-options': 'nosniff',
    },
  });
}

function parseOpenAIChunk(line: string): string | null {
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return null;
  try {
    const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

function parseAnthropicChunk(line: string): string | null {
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return null;
  try {
    const json = JSON.parse(payload) as {
      type?: string;
      delta?: { type?: string; text?: string };
    };
    if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
      return json.delta.text ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
