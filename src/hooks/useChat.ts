import { useCallback, useEffect, useState } from 'react';
import { getAIConfig, type AIConfig } from '@saas-maker/ai';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'chatbot-ai-config';
const MESSAGES_KEY = 'chatbot-messages';

// Load persisted messages from localStorage
function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    // fall through
  }
  return [];
}

// Save messages to localStorage (keep last 50 messages to avoid bloat)
function persistMessages(msgs: ChatMessage[]) {
  const toSave = msgs
    .filter(m => m.content.trim().length > 0)
    .slice(-50);
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(toSave));
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [isStreaming, setIsStreaming] = useState(false);

  // Persist whenever messages change (debounced by React batching)
  useEffect(() => {
    if (!isStreaming) {
      persistMessages(messages);
    }
  }, [messages, isStreaming]);

  const sendMessage = useCallback(async (content: string, pageContext: string) => {
    const config = getAIConfig(STORAGE_KEY);
    if (!config.apiKey || !config.endpointUrl) return;

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

    const systemPrompt = [
      `You are a thoughtful personal assistant embedded in "Today Little Log", a daily life dashboard app.`,
      `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
      ``,
      `The user's live data from the app is below. Use it to give specific, personalized answers.`,
      ``,
      pageContext,
      ``,
      `Guidelines:`,
      `- Reference the user's actual data when answering (e.g., mention specific habits, tasks, or journal entries by name)`,
      `- Be concise — 2-3 sentences unless the user asks for detail`,
      `- For journal prompts, ask reflective questions based on what they've written`,
      `- For habits, comment on streaks, progress, or suggest adjustments`,
      `- For tasks, help prioritize based on estimates and what's open`,
      `- For schedule, help optimize time blocks`,
      `- Tone: warm, direct, encouraging — like a thoughtful friend, not a corporate assistant`,
      `- Use markdown sparingly (bold for emphasis, lists when helpful)`,
    ].join('\n');

    try {
      const history = messages
        .filter((m) => m.content.trim().length > 0)
        .filter((m) => !(m.role === 'assistant' && m.content.startsWith('Error:')))
        .slice(-20) // keep last 20 messages for context window
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: config.endpointUrl,
          apiKey: config.apiKey,
          model: config.model,
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
    localStorage.removeItem(MESSAGES_KEY);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
