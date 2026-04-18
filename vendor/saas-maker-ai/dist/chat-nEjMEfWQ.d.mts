interface AIConfig {
    endpointUrl: string;
    apiKey: string;
    model: string;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
interface ChatCompletionOptions {
    config: AIConfig;
    messages: ChatMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    stream?: boolean;
    headers?: Record<string, string>;
}
/**
 * Build the full chat completions URL from a base endpoint.
 * Handles: /v1, /v1/chat/completions, bare URLs.
 */
declare function buildChatUrl(endpointUrl: string): string;
/**
 * Raw fetch to an OpenAI-compatible chat completions endpoint.
 * Works in any runtime (Node, Workers, browser). Returns the raw Response
 * so callers can handle streaming or JSON parsing as needed.
 */
declare function fetchChatCompletion(options: ChatCompletionOptions): Promise<Response>;
/**
 * Parse an SSE stream from an OpenAI-compatible endpoint.
 * Yields content delta strings. Works with any ReadableStream.
 */
declare function parseSSEStream(response: Response): AsyncGenerator<string>;

export { type AIConfig as A, type ChatCompletionOptions as C, type ChatMessage as a, buildChatUrl as b, fetchChatCompletion as f, parseSSEStream as p };
