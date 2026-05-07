import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Send, Settings, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { buildChatSystemPrompt } from '@/lib/chatContext';

const STORAGE_KEY = 'chatbot-ai-config';
const HISTORY_KEY = 'chatbot-history';
const MAX_HISTORY = 20;

interface AIConfig {
  endpointUrl: string;
  apiKey: string;
  model: string;
  /** Optional override; auto-detected from URL otherwise. */
  provider?: 'openai' | 'anthropic';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const EMPTY_CONFIG: AIConfig = { endpointUrl: '', apiKey: '', model: '' };

function loadConfig(): AIConfig {
  if (typeof window === 'undefined') return EMPTY_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CONFIG;
    const parsed = JSON.parse(raw) as AIConfig;
    return {
      endpointUrl: (parsed.endpointUrl ?? '').trim().replace(/\/+$/, ''),
      apiKey: (parsed.apiKey ?? '').trim(),
      model: (parsed.model ?? '').trim(),
      provider: parsed.provider,
    };
  } catch {
    return EMPTY_CONFIG;
  }
}

function saveConfig(c: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

function loadHistory(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(m: Message[]) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(m.slice(-MAX_HISTORY)));
  } catch {
    // sessionStorage full; drop silently
  }
}

export function ChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'settings'>('chat');
  const [config, setConfig] = useState<AIConfig>(loadConfig);
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const openWidget = () => {
    setOpen(true);
    setView(configIsComplete(config) ? 'chat' : 'settings');
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!configIsComplete(config)) {
      setView('settings');
      setError('Add your provider URL, key, and model first.');
      return;
    }
    setError(null);

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    saveHistory(next);
    setInput('');
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: config.endpointUrl,
          apiKey: config.apiKey,
          model: config.model,
          provider: config.provider,
          systemPrompt: buildChatSystemPrompt(location.pathname),
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errorBody = await res.json().catch(() => ({})) as { error?: string };
        const msg = errorBody.error ?? `Request failed (${res.status})`;
        setError(msg);
        setMessages(next); // drop empty assistant placeholder
        saveHistory(next);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        assistantMsg = { role: 'assistant', content: assistantMsg.content + chunk };
        setMessages([...next, assistantMsg]);
      }
      saveHistory([...next, assistantMsg]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message ?? 'Network error');
      setMessages(next);
      saveHistory(next);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const clearHistory = () => {
    setMessages([]);
    saveHistory([]);
    setError(null);
  };

  const handleSaveSettings = (next: AIConfig) => {
    saveConfig(next);
    setConfig(next);
    if (configIsComplete(next)) setView('chat');
  };

  return (
    <>
      {!open && (
        <button
          aria-label="Open assistant"
          onClick={openWidget}
          className={cn(
            'fixed z-50 bottom-20 right-4 md:bottom-6 md:right-6',
            'h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg',
            'flex items-center justify-center transition-transform hover:scale-105',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          className={cn(
            'fixed z-50 bg-background border border-border shadow-2xl',
            'flex flex-col',
            // Mobile: bottom sheet with safe area
            'inset-x-0 bottom-0 h-[85vh] rounded-t-2xl',
            // Desktop: floating panel bottom-right
            'md:inset-auto md:bottom-6 md:right-6 md:w-[420px] md:h-[600px] md:rounded-2xl',
          )}
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-semibold">
                {view === 'settings' ? 'Assistant settings' : 'Assistant'}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {view === 'chat' && messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                  title="Clear history"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setView(view === 'chat' ? 'settings' : 'chat')}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                title={view === 'chat' ? 'Settings' : 'Back to chat'}
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {view === 'settings' ? (
            <ChatSettings
              key={`${config.endpointUrl}|${config.apiKey}|${config.model}|${config.provider ?? ''}`}
              initial={config}
              onSave={handleSaveSettings}
            />
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && !error && (
                  <p className="text-xs text-muted-foreground">
                    I can answer questions about what's on this page. Try "summarise my scoreboard" or "what should I focus on?".
                  </p>
                )}
                {messages.map((m, i) => (
                  <MessageBubble key={i} msg={m} />
                ))}
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                )}
              </div>

              <footer className="border-t border-border p-3 space-y-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={configIsComplete(config) ? 'Ask about this page…' : 'Set up your provider in Settings first.'}
                  className="resize-none text-sm"
                />
                <div className="flex justify-end gap-2">
                  {streaming ? (
                    <Button size="sm" variant="outline" onClick={stop}>
                      Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={sendMessage} disabled={!input.trim()}>
                      <Send className="h-3.5 w-3.5" /> Send
                    </Button>
                  )}
                </div>
              </footer>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {msg.content || (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> thinking…
          </span>
        )}
      </div>
    </div>
  );
}

interface ChatSettingsProps {
  initial: AIConfig;
  onSave: (config: AIConfig) => void;
}

function ChatSettings({ initial, onSave }: ChatSettingsProps) {
  const [draft, setDraft] = useState<AIConfig>(initial);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const fetchModels = async () => {
    setModelsError(null);
    if (!draft.endpointUrl || !draft.apiKey) {
      setModelsError('Set the URL and key first.');
      return;
    }
    setLoadingModels(true);
    try {
      const base = draft.endpointUrl.trim().replace(/\/+$/, '');
      const tries = [`${base}/models`, `${base}/v1/models`];
      let result: string[] = [];
      for (const url of tries) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${draft.apiKey}` },
        }).catch(() => null);
        if (!res || !res.ok) continue;
        const data = (await res.json()) as { data?: { id?: string }[] };
        if (Array.isArray(data.data)) {
          result = data.data.map((m) => m.id).filter((x): x is string => !!x).sort();
          break;
        }
      }
      if (result.length === 0) {
        setModelsError('No models returned. Enter the model name manually.');
      } else {
        setModels(result);
      }
    } catch (err) {
      setModelsError((err as Error).message ?? 'Failed to fetch models');
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <p className="text-xs text-muted-foreground">
        Bring your own key. Settings are stored locally in this browser only.
        The /api/chat proxy forwards the call without persisting anything server-side.
      </p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Provider
        </label>
        <select
          value={draft.provider ?? 'auto'}
          onChange={(e) => {
            const v = e.target.value;
            setDraft({ ...draft, provider: v === 'auto' ? undefined : (v as 'openai' | 'anthropic') });
          }}
          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="auto">Auto-detect from URL</option>
          <option value="openai">OpenAI-compatible</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Endpoint URL
        </label>
        <Input
          value={draft.endpointUrl}
          onChange={(e) => setDraft({ ...draft, endpointUrl: e.target.value })}
          placeholder="https://api.openai.com/v1 or https://api.anthropic.com"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          API key
        </label>
        <Input
          type="password"
          value={draft.apiKey}
          onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          placeholder="sk-…"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Model
        </label>
        <div className="flex gap-2">
          <Input
            value={draft.model}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            placeholder="gpt-4o-mini, claude-3-5-haiku-latest, etc."
            list="chat-model-options"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchModels}
            disabled={loadingModels || !draft.endpointUrl || !draft.apiKey}
          >
            {loadingModels ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Fetch'}
          </Button>
        </div>
        {models.length > 0 && (
          <datalist id="chat-model-options">
            {models.map((m) => <option key={m} value={m} />)}
          </datalist>
        )}
        {modelsError && <p className="text-[11px] text-destructive">{modelsError}</p>}
      </div>

      <Button
        size="sm"
        onClick={() => onSave({
          ...draft,
          endpointUrl: draft.endpointUrl.trim().replace(/\/+$/, ''),
          apiKey: draft.apiKey.trim(),
          model: draft.model.trim(),
        })}
        disabled={!configIsComplete(draft)}
      >
        Save
      </Button>
    </div>
  );
}

function configIsComplete(c: AIConfig): boolean {
  return Boolean(c.endpointUrl?.trim() && c.apiKey?.trim() && c.model?.trim());
}
