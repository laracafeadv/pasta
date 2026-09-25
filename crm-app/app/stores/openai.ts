import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRequestFetch } from '#imports'
import { OPENAI_MODELS } from '../../shared/constants/openaiModels'
import type { OpenAIChatMessage, OpenAIChatResponse, OpenAIModelId } from '../../shared/constants/openaiModels'

export const useOpenAIStore = defineStore('openai', () => {
    const loading = ref(false)
    const error = ref<string | null>(null)
    const selectedModel = ref<OpenAIModelId>('gpt-4o')
    const lastResponse = ref<OpenAIChatResponse | null>(null)

    /** All available models */
    const models = OPENAI_MODELS

    /**
     * Send a chat completion request.
     * The conversation history (messages) is built by the caller.
     */
    async function chat(messages: OpenAIChatMessage[], options?: {
        temperature?: number
        max_tokens?: number
    }): Promise<string> {
        loading.value = true
        error.value = null

        try {
            const fetch = useRequestFetch()
            const response = await fetch<OpenAIChatResponse>('/api/eva/chat', {
                method: 'POST',
                body: {
                    model: selectedModel.value,
                    messages,
                    temperature: options?.temperature ?? 0.7,
                    ...(options?.max_tokens ? { max_tokens: options.max_tokens } : {}),
                },
            })
            lastResponse.value = response
            return response.choices[0]?.message?.content ?? ''
        } catch (e: any) {
            error.value = e.data?.statusMessage || e.message || 'Erro ao comunicar com a OpenAI.'
            throw e
        } finally {
            loading.value = false
        }
    }

    function setModel(model: OpenAIModelId) {
        selectedModel.value = model
    }

    function reset() {
        loading.value = false
        error.value = null
        lastResponse.value = null
    }

    return {
        loading,
        error,
        models,
        selectedModel,
        lastResponse,
        chat,
        setModel,
        reset,
    }
})
