import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ModelsRequestBody {
  baseUrl: string;
  apiKey: string;
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  return rawBaseUrl.trim().replace(/\/+$/, "");
}

function validateBody(body: unknown): body is ModelsRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.baseUrl === "string" && typeof b.apiKey === "string";
}

async function tryFetchModels(
  url: string,
  apiKey: string
): Promise<string[] | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      data?: Array<{ id?: string }>;
    };

    if (!data?.data || !Array.isArray(data.data)) return null;

    return data.data
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .sort();
  } catch {
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!validateBody(req.body)) {
    return res.status(400).json({ models: [] });
  }

  const baseUrl = normalizeBaseUrl(req.body.baseUrl);
  const apiKey = req.body.apiKey.trim();

  if (!baseUrl || !apiKey) {
    return res.status(200).json({ models: [] });
  }

  // Try {baseUrl}/models first, then {baseUrl}/v1/models
  const models =
    (await tryFetchModels(`${baseUrl}/models`, apiKey)) ??
    (await tryFetchModels(`${baseUrl}/v1/models`, apiKey));

  return res.status(200).json({ models: models ?? [] });
}
