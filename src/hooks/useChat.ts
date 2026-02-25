import { useCallback, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AiConfig {
  provider: 'claude' | 'codex' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}

const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  claude: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
  codex: { baseUrl: 'https://api.openai.com', model: 'gpt-4o' },
};

const CONFIG_KEY = 'chatbot-ai-config';

export function getAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as AiConfig;
  } catch {
    // fall through to default
  }
  return {
    provider: 'claude',
    apiKey: '',
    baseUrl: PRESETS.claude.baseUrl,
    model: PRESETS.claude.model,
  };
}

export function saveAiConfig(config: AiConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function resolveConfig(config: AiConfig): AiConfig {
  if (config.provider === 'custom') return config;

  const preset = PRESETS[config.provider];
  if (!preset) return config;

  return {
    ...config,
    baseUrl: preset.baseUrl,
    model: config.model || preset.model,
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (content: string, pageContext: string) => {
    const resolved = resolveConfig(getAiConfig());
    if (!resolved.apiKey) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    const systemPrompt = `You are a helpful assistant for Significant Hobbies, a personal productivity app. The user is currently viewing:\n\n${pageContext}\n\nHelp them with their tasks, habits, journal entries, schedule, and life rules. Be concise and actionable.`;

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: resolved.baseUrl,
          apiKey: resolved.apiKey,
          model: resolved.model,
          messages: [...history, { role: 'user', content }],
          systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      const updateAssistantMessage = (updatedContent: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: updatedContent }
              : m
          )
        );
      };

      const processSseLine = (line: string) => {
        if (!line.startsWith('data: ')) return;

        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') return;

        let parsed: { text?: unknown; error?: unknown };
        try {
          parsed = JSON.parse(payload) as { text?: unknown; error?: unknown };
        } catch {
          // Skip malformed JSON event lines.
          return;
        }

        if (typeof parsed.error === 'string' && parsed.error) {
          throw new Error(parsed.error);
        }

        if (typeof parsed.text === 'string' && parsed.text) {
          accumulated += parsed.text;
          updateAssistantMessage(accumulated);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processSseLine(line.trim());
        }
      }

      if (buffer.trim()) {
        processSseLine(buffer.trim());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const errorContent = `Error: ${message}`;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: errorContent }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
