import {
  fetchModels
} from "./chunk-35D25BSD.mjs";

// src/server.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
function createAIModel(config, options) {
  const provider = createOpenAICompatible({
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
export {
  createAIModel,
  handleModelsRequest
};
