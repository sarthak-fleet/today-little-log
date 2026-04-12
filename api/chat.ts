import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAIModel } from "@saas-maker/ai/server";
import { streamText } from "ai";

interface ChatRequestBody {
  endpointUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
}

function validateBody(body: unknown): body is ChatRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.endpointUrl === "string" &&
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
        "Missing required fields: endpointUrl, apiKey, model, messages, systemPrompt",
    });
  }

  const endpointUrl = body.endpointUrl.trim();
  const apiKey = body.apiKey.trim();
  const model = body.model.trim();
  const systemPrompt = body.systemPrompt.trim();
  const messages = body.messages
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as
        | "user"
        | "assistant",
      content: typeof m.content === "string" ? m.content.trim() : "",
    }))
    .filter((m) => m.content.length > 0);

  if (!endpointUrl || !apiKey || !model || messages.length === 0 || !systemPrompt) {
    return res.status(400).json({
      error:
        "Missing required fields: endpointUrl, apiKey, model, messages, systemPrompt",
    });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const aiModel = createAIModel(
      { endpointUrl, apiKey, model },
      { headers: { "x-gateway-project-id": "today-little-log" } },
    );

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages,
    });

    for await (const chunk of result.textStream) {
      if (chunk) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    }

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
