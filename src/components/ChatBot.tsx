import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Trash2,
  Settings,
  Send,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useChat,
  getAiConfig,
  saveAiConfig,
  fetchModels,
} from '@/hooks/useChat';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useHabits } from '@/hooks/useHabits';
import { useTasks } from '@/hooks/useTasks';
import { useSchedule } from '@/hooks/useSchedule';
import { useLifeRules } from '@/hooks/useLifeRules';
import { useEmotions } from '@/hooks/useEmotions';
import { buildLiveContext } from '@/lib/pageContext';

type View = 'closed' | 'chat' | 'settings';

const PAGE_NAMES: Record<string, string> = {
  '/': 'journal',
  '/habits': 'habits',
  '/tasks': 'tasks',
  '/schedule': 'schedule',
  '/rules': 'rules',
};

// Thin wrapper — only renders the floating button when closed.
// ChatPanel (with all data hooks) only mounts when the user opens the chat.
export function ChatBot() {
  const [view, setView] = useState<View>('closed');

  if (view === 'closed') {
    return (
      <Button
        onClick={() => setView('chat')}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    );
  }

  return <ChatPanel view={view} setView={setView} />;
}

// Full chat panel — hooks only run when this component is mounted (chat is open)
function ChatPanel({ view, setView }: { view: 'chat' | 'settings'; setView: (v: View) => void }) {
  const location = useLocation();
  const { messages, isStreaming, sendMessage, clearMessages } = useChat();

  // Live data hooks — only active while chat panel is open
  const { entries } = useJournalEntries();
  const { habits, logs: habitLogs } = useHabits();
  const { tasks } = useTasks();
  const { blocks } = useSchedule();
  const { rules } = useLifeRules();
  const { emotions } = useEmotions();

  const [input, setInput] = useState('');

  // Settings form state
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [settingsBaseUrl, setSettingsBaseUrl] = useState('');
  const [settingsModel, setSettingsModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [view]);

  // Close model dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageName = PAGE_NAMES[location.pathname] || 'page';

  function openSettings() {
    const config = getAiConfig();
    setSettingsApiKey(config.apiKey);
    setSettingsBaseUrl(config.baseUrl);
    setSettingsModel(config.model);
    setAvailableModels([]);
    setView('settings');
  }

  async function handleFetchModels() {
    if (!settingsBaseUrl.trim() || !settingsApiKey.trim()) return;
    setIsLoadingModels(true);
    try {
      const models = await fetchModels(settingsBaseUrl, settingsApiKey);
      setAvailableModels(models);
      if (models.length > 0) {
        setShowModelDropdown(true);
      }
    } finally {
      setIsLoadingModels(false);
    }
  }

  function handleSaveSettings() {
    saveAiConfig({
      apiKey: settingsApiKey,
      baseUrl: settingsBaseUrl,
      model: settingsModel,
    });
    setView('chat');
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const config = getAiConfig();
    if (!config.apiKey) {
      openSettings();
      return;
    }

    const pageContext = buildLiveContext(location.pathname, {
      entries,
      habits,
      habitLogs,
      tasks,
      blocks,
      rules,
      emotions,
    });
    sendMessage(trimmed, pageContext);
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const filteredModels = settingsModel
    ? availableModels.filter((m) =>
        m.toLowerCase().includes(settingsModel.toLowerCase())
      )
    : availableModels;

  // ---- Settings view ----
  if (view === 'settings') {
    return (
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-[350px] max-h-[60vh] bg-background border border-border/60 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setView('chat')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">AI Settings</span>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="chat-base-url" className="text-xs">
              Endpoint URL
            </Label>
            <Input
              id="chat-base-url"
              type="text"
              className="h-9 text-sm"
              value={settingsBaseUrl}
              onChange={(e) => setSettingsBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chat-api-key" className="text-xs">
              API Key
            </Label>
            <Input
              id="chat-api-key"
              type="password"
              className="h-9 text-sm"
              value={settingsApiKey}
              onChange={(e) => setSettingsApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-1.5" ref={modelDropdownRef}>
            <div className="flex items-center justify-between">
              <Label htmlFor="chat-model" className="text-xs">
                Model
              </Label>
              <Button
                variant="ghost"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={handleFetchModels}
                disabled={isLoadingModels || !settingsBaseUrl.trim() || !settingsApiKey.trim()}
              >
                {isLoadingModels ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Fetch models'
                )}
              </Button>
            </div>
            <div className="relative">
              <Input
                id="chat-model"
                type="text"
                className="h-9 text-sm"
                value={settingsModel}
                onChange={(e) => {
                  setSettingsModel(e.target.value);
                  if (availableModels.length > 0) {
                    setShowModelDropdown(true);
                  }
                }}
                onFocus={() => {
                  if (availableModels.length > 0) {
                    setShowModelDropdown(true);
                  }
                }}
                placeholder="gpt-4o, claude-sonnet-4-20250514, etc."
              />
              {showModelDropdown && filteredModels.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-40 overflow-auto bg-popover border border-border rounded-lg shadow-lg">
                  {filteredModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent truncate"
                      onClick={() => {
                        setSettingsModel(m);
                        setShowModelDropdown(false);
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="px-4 py-3 border-t border-border/60">
          <Button className="w-full h-9 text-sm" onClick={handleSaveSettings}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  // ---- Chat view ----
  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-[380px] h-[60vh] max-h-[500px] bg-background border border-border/60 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <span className="text-sm font-medium">Assistant</span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={clearMessages}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={openSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setView('closed')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages — native scroll */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ask anything about your {pageName}...
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.role === 'assistant' && msg.content === '' ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/60 shrink-0">
        <Input
          ref={inputRef}
          className="h-9 text-sm flex-1"
          placeholder="Message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
