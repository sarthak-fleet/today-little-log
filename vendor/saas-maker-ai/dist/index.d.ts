import { A as AIConfig } from './chat-nEjMEfWQ.js';
export { C as ChatCompletionOptions, a as ChatMessage, b as buildChatUrl, f as fetchChatCompletion, p as parseSSEStream } from './chat-nEjMEfWQ.js';
import * as react_jsx_runtime from 'react/jsx-runtime';

interface AISettingsClassNames {
    container?: string;
    field?: string;
    label?: string;
    input?: string;
    button?: string;
    dropdown?: string;
    dropdownItem?: string;
    saveButton?: string;
    error?: string;
    hint?: string;
    modelRow?: string;
}
interface AISettingsProps {
    config: AIConfig;
    onChange: (config: AIConfig) => void;
    onSave?: () => void;
    /** Server-side proxy URL for model discovery. */
    modelsApiUrl?: string;
    labels?: {
        endpointUrl?: string;
        apiKey?: string;
        model?: string;
        save?: string;
        fetchModels?: string;
        title?: string;
        subtitle?: string;
    };
    placeholders?: {
        endpointUrl?: string;
        apiKey?: string;
        model?: string;
    };
    /** Pass Tailwind or CSS classes per element. */
    classNames?: AISettingsClassNames;
    /** Hide the save button (useful when parent handles saving). */
    hideSave?: boolean;
}
declare function AISettings({ config, onChange, onSave, modelsApiUrl, labels, placeholders, classNames: cn, hideSave, }: AISettingsProps): react_jsx_runtime.JSX.Element;

declare function getAIConfig(storageKey?: string): AIConfig;
declare function saveAIConfig(config: AIConfig, storageKey?: string): void;

/**
 * Fetch available models from an OpenAI-compatible endpoint.
 * Tries /models then /v1/models. Works in any runtime (Node, Workers, browser).
 */
declare function fetchModels(endpointUrl: string, apiKey: string): Promise<string[]>;

declare function useAIConfig(storageKey?: string): {
    config: AIConfig;
    setConfig: (next: AIConfig | ((prev: AIConfig) => AIConfig)) => void;
    update: (partial: Partial<AIConfig>) => void;
    save: () => void;
    isReady: boolean;
};

interface UseModelDiscoveryOptions {
    /** Server-side proxy URL for model discovery (avoids CORS issues). */
    modelsApiUrl?: string;
}
declare function useModelDiscovery(options?: UseModelDiscoveryOptions): {
    models: string[];
    loading: boolean;
    error: string | null;
    discover: (endpointUrl: string, apiKey: string) => Promise<void>;
};

export { AIConfig, AISettings, type AISettingsClassNames, type AISettingsProps, fetchModels, getAIConfig, saveAIConfig, useAIConfig, useModelDiscovery };
