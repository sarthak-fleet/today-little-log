# Contextual Chatbot + Remove Time Tracking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a floating AI chatbot with page context awareness and remove time tracking.

**Architecture:** Floating chat widget in AppLayout, Vercel serverless API route as a dumb proxy to any OpenAI-compatible or Anthropic API. Page context provided via structured text builders per route. User-provided API keys stored in localStorage.

**Tech Stack:** React, shadcn/ui, Vercel serverless functions, OpenAI-compatible + Anthropic APIs, streaming via ReadableStream.

---

### Task 1: Merge branch and setup

**Step 1: Merge `ui/tasks-polish` into `main`**

```bash
git checkout main
git merge ui/tasks-polish
git push origin main
```

**Step 2: Create new feature branch**

```bash
git checkout -b feat/chatbot
```

**Step 3: Commit**

```bash
git commit --allow-empty -m "chore: start chatbot feature branch"
```

---

### Task 2: Remove time tracking

**Files:**
- Delete: `src/pages/TimeTracking.tsx`
- Delete: `src/hooks/useTimeSessions.ts`
- Delete: `src/hooks/useProjects.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppSidebar.tsx`
- Modify: `src/components/BottomNav.tsx`

**Step 1: Delete time tracking files**

```bash
rm src/pages/TimeTracking.tsx src/hooks/useTimeSessions.ts src/hooks/useProjects.ts
```

**Step 2: Remove route from `src/App.tsx`**

Remove line 14 (`import TimeTracking`) and line 35 (`<Route path="/time-tracking" ...>`).

**Step 3: Remove nav entry from `src/components/AppSidebar.tsx`**

Remove `{ title: 'Time', url: '/time-tracking', icon: Timer }` from `navItems` array and the `Timer` import from lucide-react.

**Step 4: Remove nav entry from `src/components/BottomNav.tsx`**

Same removal: `Timer` import and the Time nav item.

**Step 5: Verify build**

```bash
pnpm build
```

**Step 6: Commit**

```bash
git add -A && git commit -m "refactor: remove time tracking feature (switched to Dayflow)"
```

---

### Task 3: Create Vercel API route (`api/chat.ts`)

**Files:**
- Create: `api/chat.ts`

This is a Vercel serverless function. It's a dumb proxy — takes baseUrl, apiKey, model, messages from client, calls the provider, streams back.

**Step 1: Create `api/chat.ts`**

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt: string;
}

function isAnthropic(baseUrl: string): boolean {
  return baseUrl.includes("anthropic.com");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { baseUrl, apiKey, model, messages, systemPrompt } =
    req.body as ChatRequestBody;

  if (!baseUrl || !apiKey || !model || !messages?.length) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    if (isAnthropic(baseUrl)) {
      // Anthropic Messages API — streaming
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.filter((m) => m.role !== "system"),
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body?.getReader();
      if (!reader) return res.status(500).json({ error: "No stream" });

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse Anthropic SSE and re-emit as simple text deltas
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (
              parsed.type === "content_block_delta" &&
              parsed.delta?.text
            ) {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
      res.write("data: [DONE]\n\n");
      return res.end();
    } else {
      // OpenAI-compatible API — streaming
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body?.getReader();
      if (!reader) return res.status(500).json({ error: "No stream" });

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) {
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          } catch {
            // skip
          }
        }
      }
      return res.end();
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
```

**Step 2: Update `vercel.json` to allow API routes**

The current `vercel.json` rewrites everything to `index.html`. We need to exclude `/api/` paths:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 3: Verify build**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add api/chat.ts vercel.json
git commit -m "feat: add Vercel API route for AI chat proxy"
```

---

### Task 4: Create chat hook (`src/hooks/useChat.ts`)

**Files:**
- Create: `src/hooks/useChat.ts`

**Step 1: Create the hook**

```ts
import { useCallback, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AiConfig {
  provider: "claude" | "codex" | "custom";
  apiKey: string;
  baseUrl: string;
  model: string;
}

const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  claude: {
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
  },
  codex: {
    baseUrl: "https://api.openai.com",
    model: "gpt-4o",
  },
};

const CONFIG_KEY = "chatbot-ai-config";

export function getAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: "claude", apiKey: "", baseUrl: PRESETS.claude.baseUrl, model: PRESETS.claude.model };
}

export function saveAiConfig(config: AiConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function resolveConfig(config: AiConfig) {
  if (config.provider !== "custom" && PRESETS[config.provider]) {
    return {
      ...config,
      baseUrl: PRESETS[config.provider].baseUrl,
      model: config.model || PRESETS[config.provider].model,
    };
  }
  return config;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (content: string, pageContext: string) => {
      const config = resolveConfig(getAiConfig());

      if (!config.apiKey) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const systemPrompt = `You are a helpful assistant for Significant Hobbies, a personal productivity app. The user is currently viewing:\n\n${pageContext}\n\nHelp them with their tasks, habits, journal entries, schedule, and life rules. Be concise and actionable.`;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            model: config.model,
            messages: apiMessages,
            systemPrompt,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || "API error");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: accumulated }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: add useChat hook with streaming and multi-provider support"
```

---

### Task 5: Create page context builders (`src/lib/pageContext.ts`)

**Files:**
- Create: `src/lib/pageContext.ts`

This provides structured text about what's on each page. It uses a simple map from pathname to a description. The ChatBot component will call `usePageContext()` which reads from the hooks.

**Step 1: Create `src/lib/pageContext.ts`**

```ts
// Static page descriptions — the ChatBot component enriches these
// with live data from hooks when rendering.
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": "Journal page — daily journal entries organized by categories (General, Health, Finance, Relationships, Career, Knowledge, Novelty, Projects). Users write reflections, log emotions, and can view past entries in list or calendar mode.",
  "/habits": "Habits page — habit tracker with targets (things to do more) and limits (things to reduce). Each habit has a daily/weekly target value. Users can log progress and view history.",
  "/tasks": "Tasks page — task list with drag-to-reorder. Tasks have title, optional notes, and time estimates. Tabs for Open/Done/All. Shows progress bar.",
  "/schedule": "Schedule page — drag-to-create time blocks on a daily timeline. Users plan their day visually.",
  "/rules": "Life Rules page — ordered list of personal principles and rules. Users can add, edit, reorder, and delete rules.",
};

export function getPageDescription(pathname: string): string {
  return PAGE_DESCRIPTIONS[pathname] || `Page: ${pathname}`;
}
```

**Step 2: Commit**

```bash
git add src/lib/pageContext.ts
git commit -m "feat: add page context descriptions for chatbot"
```

---

### Task 6: Create ChatBot component (`src/components/ChatBot.tsx`)

**Files:**
- Create: `src/components/ChatBot.tsx`
- Modify: `src/components/AppLayout.tsx`

This is the main UI — floating button + expandable chat panel + settings.

**Step 1: Create `src/components/ChatBot.tsx`**

```tsx
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Settings, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useChat,
  getAiConfig,
  saveAiConfig,
  resolveConfig,
} from "@/hooks/useChat";
import { getPageDescription } from "@/lib/pageContext";

function SettingsView({ onBack }: { onBack: () => void }) {
  const config = getAiConfig();
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [model, setModel] = useState(config.model);

  const handleProviderChange = (value: string) => {
    const p = value as "claude" | "codex" | "custom";
    setProvider(p);
    const resolved = resolveConfig({ provider: p, apiKey, baseUrl, model });
    setBaseUrl(resolved.baseUrl);
    setModel(resolved.model);
  };

  const handleSave = () => {
    saveAiConfig({ provider, apiKey, baseUrl, model });
    onBack();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border/40">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">AI Settings</span>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        <div className="space-y-1.5">
          <Label className="text-xs">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="codex">Codex (OpenAI)</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">API Key</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com"
            className="h-9 text-sm"
            disabled={provider !== "custom"}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Model</Label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o"
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="p-3 border-t border-border/40">
        <Button onClick={handleSave} className="w-full h-9 text-sm">
          Save
        </Button>
      </div>
    </div>
  );
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isStreaming, sendMessage, clearMessages } = useChat();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !showSettings) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showSettings]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const config = getAiConfig();
    if (!config.apiKey) {
      setShowSettings(true);
      return;
    }
    const pageContext = getPageDescription(location.pathname);
    sendMessage(input.trim(), pageContext);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-[350px] max-h-[60vh] bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          {showSettings ? (
            <SettingsView onBack={() => setShowSettings(false)} />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-border/40">
                <span className="text-sm font-medium">Assistant</span>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={clearMessages}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
                <div className="p-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Ask anything about your {location.pathname === "/" ? "journal" : location.pathname.slice(1)}...
                    </p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.content || (
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0.3s]" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border/40">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message..."
                    className="h-9 text-sm rounded-lg"
                    disabled={isStreaming}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
```

**Step 2: Add ChatBot to `src/components/AppLayout.tsx`**

Add import: `import { ChatBot } from './ChatBot';`
Add `<ChatBot />` right before the closing `</SidebarProvider>` tag.

**Step 3: Verify build**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/ChatBot.tsx src/components/AppLayout.tsx
git commit -m "feat: add floating AI chatbot with settings and streaming"
```

---

### Task 7: Test end-to-end and finalize

**Step 1: Run dev server**

```bash
pnpm dev
```

**Step 2: Manual verification checklist**

- [ ] Chat button appears bottom-right on all pages
- [ ] Clicking opens panel with "Ask anything..." placeholder
- [ ] Settings opens, can pick Claude/Codex/Custom
- [ ] Entering API key + sending a message gets a streamed response
- [ ] Messages scroll properly
- [ ] Clear button wipes conversation
- [ ] Close/reopen preserves current conversation
- [ ] Mobile: button is above bottom nav, panel is full-width
- [ ] Time tracking removed from nav (both sidebar and bottom)
- [ ] `/time-tracking` route returns 404

**Step 3: Final commit**

```bash
git add -A && git commit -m "feat: contextual AI chatbot with multi-provider support"
```
