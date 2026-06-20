const STORAGE_KEY = 'chatbot-ai-config';

interface AIConfig {
  endpointUrl: string;
  apiKey: string;
  model: string;
}

// Read the BYOK AI config from localStorage (formerly @saas-maker/ai's
// getAIConfig). The chatbot settings UI writes the same `chatbot-ai-config` key.
function getAIConfig(storageKey: string): AIConfig {
  const empty: AIConfig = { endpointUrl: '', apiKey: '', model: '' };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AIConfig>;
      return {
        endpointUrl: (parsed.endpointUrl ?? '').trim().replace(/\/+$/, ''),
        apiKey: (parsed.apiKey ?? '').trim(),
        model: (parsed.model ?? '').trim(),
      };
    }
  } catch {
    // ignore malformed config
  }
  return empty;
}

const PSI_SYSTEM_PROMPT = `You score "brain pressure" (PSI) from a morning journal entry.
0 = completely calm, 100 = about to explode from pressure.
Respond with ONLY the integer 0-100, nothing else. No punctuation, no words.
Consider: stated stressors, urgency language, ruminating patterns, fatigue, overwhelm, excitement.`;

interface Ok { score: number; error?: never }
interface Err { score?: never; error: string }

/**
 * Client-side PSI scorer. Uses the same BYOK chat config as the
 * in-app assistant. Returns an integer 0-100, or an error string if
 * the config is missing or the model does not respond with a number.
 */
export async function scorePsi(entry: string): Promise<Ok | Err> {
  const trimmed = entry.trim();
  if (trimmed.length < 5) return { error: 'Entry is too short to score.' };

  const config = getAIConfig(STORAGE_KEY);
  if (!config?.apiKey || !config?.endpointUrl || !config?.model) {
    return { error: 'Set up your AI key in the chatbot settings first.' };
  }

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointUrl: config.endpointUrl,
        apiKey: config.apiKey,
        model: config.model,
        systemPrompt: PSI_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: trimmed }],
      }),
    });

    if (!res.ok) return { error: `LLM request failed (${res.status}).` };

    // The chat endpoint streams plain text. Collect all chunks.
    const text = await res.text();
    // Strip everything except leading digit(s).
    const match = /(-?\d{1,3})/.exec(text);
    if (!match) return { error: 'Could not parse a number from the response.' };
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n)) return { error: 'Invalid number.' };
    return { score: Math.max(0, Math.min(100, n)) };
  } catch (e) {
    return { error: (e as Error).message || 'Network error.' };
  }
}
