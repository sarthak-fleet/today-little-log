"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server.ts
var server_exports = {};
__export(server_exports, {
  createAIModel: () => createAIModel,
  handleModelsRequest: () => handleModelsRequest
});
module.exports = __toCommonJS(server_exports);
var import_openai_compatible = require("@ai-sdk/openai-compatible");

// src/models.ts
async function fetchModels(endpointUrl, apiKey) {
  const base = endpointUrl.trim().replace(/\/+$/, "");
  if (!base) return [];
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  for (const path of ["/models", "/v1/models"]) {
    try {
      const res = await fetch(`${base}${path}`, { method: "GET", headers });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        return data.data.map((m) => m.id).filter((id) => typeof id === "string" && id.length > 0).sort();
      }
    } catch {
    }
  }
  return [];
}

// src/server.ts
function createAIModel(config, options) {
  const provider = (0, import_openai_compatible.createOpenAICompatible)({
    baseURL: config.endpointUrl.trim().replace(/\/+$/, ""),
    apiKey: config.apiKey,
    name: options?.name ?? "custom",
    headers: options?.headers
  });
  return provider.chatModel(config.model);
}
async function handleModelsRequest(body) {
  const models = await fetchModels(
    body.endpointUrl ?? "",
    body.apiKey ?? ""
  );
  return { models };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createAIModel,
  handleModelsRequest
});
