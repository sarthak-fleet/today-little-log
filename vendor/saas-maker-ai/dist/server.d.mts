import { LanguageModel } from 'ai';
import { A as AIConfig } from './chat-nEjMEfWQ.mjs';
export { a as ChatMessage } from './chat-nEjMEfWQ.mjs';

/**
 * Create a language model from an AIConfig.
 * Wraps @ai-sdk/openai-compatible for use with AI SDK's streamText/generateText.
 */
declare function createAIModel(config: AIConfig, options?: {
    headers?: Record<string, string>;
    name?: string;
}): LanguageModel;
/**
 * Framework-agnostic handler for model discovery requests.
 * Use in any server route — just pass the parsed body and return the result.
 *
 * Next.js:  return Response.json(await handleModelsRequest(await req.json()));
 * Vercel:   res.json(await handleModelsRequest(req.body));
 */
declare function handleModelsRequest(body: {
    endpointUrl: string;
    apiKey: string;
}): Promise<{
    models: string[];
}>;

export { AIConfig, createAIModel, handleModelsRequest };
