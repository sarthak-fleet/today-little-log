import {
  fetchModels
} from "./chunk-35D25BSD.mjs";

// src/config.ts
var DEFAULT_CONFIG = { endpointUrl: "", apiKey: "", model: "" };
function normalize(config) {
  return {
    endpointUrl: config.endpointUrl.trim().replace(/\/+$/, ""),
    apiKey: config.apiKey.trim(),
    model: config.model.trim()
  };
}
function getAIConfig(storageKey = "ai-config") {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
  }
  return DEFAULT_CONFIG;
}
function saveAIConfig(config, storageKey = "ai-config") {
  localStorage.setItem(storageKey, JSON.stringify(normalize(config)));
}

// src/chat.ts
function buildChatUrl(endpointUrl) {
  const base = endpointUrl.trim().replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  if (base.endsWith("/v1")) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}
async function fetchChatCompletion(options) {
  const {
    config,
    messages,
    systemPrompt,
    maxTokens = 4096,
    stream = true,
    headers: extraHeaders = {}
  } = options;
  const url = buildChatUrl(config.endpointUrl);
  const allMessages = [];
  if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
  allMessages.push(...messages);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model: config.model,
      messages: allMessages,
      max_tokens: maxTokens,
      stream
    })
  });
}
async function* parseSSEStream(response) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const json = JSON.parse(line.slice(6));
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
      }
    }
  }
}

// src/hooks/useAIConfig.ts
import { useState, useCallback } from "react";
function useAIConfig(storageKey = "ai-config") {
  const [config, setConfigState] = useState(() => getAIConfig(storageKey));
  const setConfig = useCallback(
    (next) => {
      setConfigState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        return resolved;
      });
    },
    []
  );
  const update = useCallback(
    (partial) => {
      setConfigState((prev) => ({ ...prev, ...partial }));
    },
    []
  );
  const save = useCallback(() => {
    setConfigState((current) => {
      saveAIConfig(current, storageKey);
      return current;
    });
  }, [storageKey]);
  const isReady = !!(config.endpointUrl && config.apiKey);
  return { config, setConfig, update, save, isReady };
}

// src/hooks/useModelDiscovery.ts
import { useState as useState2, useCallback as useCallback2 } from "react";
function useModelDiscovery(options = {}) {
  const { modelsApiUrl } = options;
  const [models, setModels] = useState2([]);
  const [loading, setLoading] = useState2(false);
  const [error, setError] = useState2(null);
  const discover = useCallback2(
    async (endpointUrl, apiKey) => {
      if (!endpointUrl.trim()) return;
      setLoading(true);
      setError(null);
      try {
        let result;
        if (modelsApiUrl) {
          const res = await fetch(modelsApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpointUrl, apiKey })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          result = data.models ?? [];
        } else {
          result = await fetchModels(endpointUrl, apiKey);
        }
        setModels(result);
      } catch {
        setError("Failed to fetch models");
        setModels([]);
      } finally {
        setLoading(false);
      }
    },
    [modelsApiUrl]
  );
  return { models, loading, error, discover };
}

// src/components/AISettings.tsx
import { useState as useState3, useRef, useEffect } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function AISettings({
  config,
  onChange,
  onSave,
  modelsApiUrl,
  labels = {},
  placeholders = {},
  classNames: cn = {},
  hideSave = false
}) {
  const { models, loading, error, discover } = useModelDiscovery({ modelsApiUrl });
  const [dropdownOpen, setDropdownOpen] = useState3(false);
  const [saved, setSaved] = useState3(false);
  const comboboxRef = useRef(null);
  useEffect(() => {
    function handleClick(e) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const filteredModels = config.model ? models.filter((m) => m.toLowerCase().includes(config.model.toLowerCase())) : models;
  const handleSave = () => {
    onSave?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 2e3);
  };
  return /* @__PURE__ */ jsxs("div", { className: cn.container, "data-smw-ai-settings": true, children: [
    /* @__PURE__ */ jsxs("div", { className: cn.field, "data-smw-ai-field": true, children: [
      /* @__PURE__ */ jsx("label", { className: cn.label, "data-smw-ai-label": true, children: labels.endpointUrl ?? "Endpoint URL" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: config.endpointUrl,
          onChange: (e) => onChange({ ...config, endpointUrl: e.target.value }),
          placeholder: placeholders.endpointUrl ?? "https://api.openai.com/v1",
          className: cn.input,
          "data-smw-ai-input": true
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: cn.field, "data-smw-ai-field": true, children: [
      /* @__PURE__ */ jsx("label", { className: cn.label, "data-smw-ai-label": true, children: labels.apiKey ?? "API Key" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "password",
          value: config.apiKey,
          onChange: (e) => onChange({ ...config, apiKey: e.target.value }),
          placeholder: placeholders.apiKey ?? "sk-...",
          className: cn.input,
          "data-smw-ai-input": true
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: cn.field, "data-smw-ai-field": true, children: [
      /* @__PURE__ */ jsx("label", { className: cn.label, "data-smw-ai-label": true, children: labels.model ?? "Model" }),
      /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, ref: comboboxRef, children: [
        /* @__PURE__ */ jsxs("div", { className: cn.modelRow, style: { display: "flex", gap: "0.5rem" }, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: config.model,
              onChange: (e) => {
                onChange({ ...config, model: e.target.value });
                if (models.length > 0) setDropdownOpen(true);
              },
              onFocus: () => {
                if (models.length > 0) setDropdownOpen(true);
              },
              placeholder: placeholders.model ?? "Enter model or fetch available",
              className: cn.input,
              style: { flex: 1 },
              "data-smw-ai-input": true
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => discover(config.endpointUrl, config.apiKey),
              disabled: !config.endpointUrl || loading,
              className: cn.button,
              "data-smw-ai-fetch-btn": true,
              children: loading ? "Loading..." : labels.fetchModels ?? "Fetch Models"
            }
          )
        ] }),
        dropdownOpen && filteredModels.length > 0 && /* @__PURE__ */ jsx(
          "div",
          {
            className: cn.dropdown,
            style: {
              position: "absolute",
              zIndex: 50,
              marginTop: "0.25rem",
              width: "100%",
              maxHeight: "12rem",
              overflowY: "auto"
            },
            "data-smw-ai-dropdown": true,
            children: filteredModels.map((m) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  onChange({ ...config, model: m });
                  setDropdownOpen(false);
                },
                className: cn.dropdownItem,
                style: {
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  border: "none",
                  background: "none",
                  font: "inherit"
                },
                "data-smw-ai-dropdown-item": true,
                children: m
              },
              m
            ))
          }
        )
      ] }),
      error && /* @__PURE__ */ jsx("p", { className: cn.error, style: { fontSize: "0.75rem", marginTop: "0.375rem" }, "data-smw-ai-error": true, children: error }),
      models.length > 0 && !error && /* @__PURE__ */ jsxs("p", { className: cn.hint, style: { fontSize: "0.75rem", marginTop: "0.375rem" }, "data-smw-ai-hint": true, children: [
        models.length,
        " model",
        models.length !== 1 ? "s" : "",
        " available"
      ] })
    ] }),
    !hideSave && onSave && /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: handleSave,
        className: cn.saveButton,
        "data-smw-ai-save-btn": true,
        children: saved ? "Saved" : labels.save ?? "Save Settings"
      }
    )
  ] });
}
export {
  AISettings,
  buildChatUrl,
  fetchChatCompletion,
  fetchModels,
  getAIConfig,
  parseSSEStream,
  saveAIConfig,
  useAIConfig,
  useModelDiscovery
};
