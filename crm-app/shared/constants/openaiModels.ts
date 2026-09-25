/**
 * Lista completa de modelos disponíveis na OpenAI API.
 * Referência: https://platform.openai.com/docs/models
 */
export const OPENAI_MODELS = [
    // === GPT-4o ===
    { id: 'gpt-4o', name: 'GPT-4o', group: 'GPT-4o' },
    { id: 'gpt-4o-2024-11-20', name: 'GPT-4o (Nov 2024)', group: 'GPT-4o' },
    { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (Ago 2024)', group: 'GPT-4o' },
    { id: 'gpt-4o-2024-05-13', name: 'GPT-4o (Mai 2024)', group: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', group: 'GPT-4o' },
    { id: 'gpt-4o-mini-2024-07-18', name: 'GPT-4o Mini (Jul 2024)', group: 'GPT-4o' },

    // === o1 / o3 ===
    { id: 'o1', name: 'o1', group: 'Reasoning' },
    { id: 'o1-2024-12-17', name: 'o1 (Dez 2024)', group: 'Reasoning' },
    { id: 'o1-mini', name: 'o1 Mini', group: 'Reasoning' },
    { id: 'o1-mini-2024-09-12', name: 'o1 Mini (Set 2024)', group: 'Reasoning' },
    { id: 'o1-preview', name: 'o1 Preview', group: 'Reasoning' },
    { id: 'o3-mini', name: 'o3 Mini', group: 'Reasoning' },
    { id: 'o3-mini-2025-01-31', name: 'o3 Mini (Jan 2025)', group: 'Reasoning' },

    // === GPT-4 Turbo ===
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', group: 'GPT-4' },
    { id: 'gpt-4-turbo-2024-04-09', name: 'GPT-4 Turbo (Abr 2024)', group: 'GPT-4' },
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview', group: 'GPT-4' },
    { id: 'gpt-4', name: 'GPT-4', group: 'GPT-4' },
    { id: 'gpt-4-0613', name: 'GPT-4 (Jun 2023)', group: 'GPT-4' },
    { id: 'gpt-4-32k', name: 'GPT-4 32k', group: 'GPT-4' },

    // === GPT-3.5 ===
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', group: 'GPT-3.5' },
    { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo (Jan 2024)', group: 'GPT-3.5' },
    { id: 'gpt-3.5-turbo-1106', name: 'GPT-3.5 Turbo (Nov 2023)', group: 'GPT-3.5' },
    { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', group: 'GPT-3.5' },
] as const

export type OpenAIModelId = typeof OPENAI_MODELS[number]['id']

export interface OpenAIChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface OpenAIChatPayload {
    model: OpenAIModelId
    messages: OpenAIChatMessage[]
    temperature?: number
    max_tokens?: number
}

export interface OpenAIChatResponse {
    id: string
    model: string
    choices: {
        message: OpenAIChatMessage
        finish_reason: string
    }[]
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}
