import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ChatRequestBody {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
}

function isAnthropic(baseUrl: string): boolean {
  return baseUrl.includes("anthropic.com");
}

function validateBody(
  body: unknown
): body is ChatRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.baseUrl === "string" &&
    typeof b.apiKey === "string" &&
    typeof b.model === "string" &&
    Array.isArray(b.messages) &&
    typeof b.systemPrompt === "string"
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body;

  if (!validateBody(body)) {
    return res.status(400).json({
      error:
        "Missing required fields: baseUrl, apiKey, model, messages, systemPrompt",
    });
  }

  const { baseUrl, apiKey, model, messages, systemPrompt } = body;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let upstream: Response;

    if (isAnthropic(baseUrl)) {
      // --- Anthropic Messages API ---
      const anthropicMessages = messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      upstream = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: anthropicMessages,
          stream: true,
        }),
      });
    } else {
      // --- OpenAI-compatible API ---
      const openaiMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
      ];

      upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: openaiMessages,
          stream: true,
        }),
      });
    }

    if (!upstream.ok) {
      const errorText = await upstream.text();
      res.write(
        `data: ${JSON.stringify({ error: `Upstream error ${upstream.status}: ${errorText}` })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    if (!upstream.body) {
      res.write(
        `data: ${JSON.stringify({ error: "No response body from upstream" })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines from buffer
      const lines = buffer.split("\n");
      // Keep the last potentially-incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const payload = trimmed.slice(6); // strip "data: "

        if (payload === "[DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }

        try {
          const parsed = JSON.parse(payload);
          let text = "";

          if (isAnthropic(baseUrl)) {
            // Anthropic: look for content_block_delta events
            if (
              parsed.type === "content_block_delta" &&
              parsed.delta?.text
            ) {
              text = parsed.delta.text;
            }
          } else {
            // OpenAI-compatible: extract delta content
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              text = delta.content;
            }
          }

          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch {
          // Skip malformed JSON lines (e.g. Anthropic event: lines)
        }
      }
    }

    // Flush any remaining buffer content
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data: ") && trimmed.slice(6) !== "[DONE]") {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          let text = "";
          if (isAnthropic(baseUrl)) {
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              text = parsed.delta.text;
            }
          } else {
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              text = delta.content;
            }
          }
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch {
          // ignore
        }
      }
    }

    // Always end with [DONE]
    res.write("data: [DONE]\n\n");
    return res.end();
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    // If headers already sent (streaming started), send error as SSE
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    return res.status(500).json({ error: message });
  }
}
