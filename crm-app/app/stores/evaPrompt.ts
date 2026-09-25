import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRequestFetch } from '#imports'
import type { EvaSystemPrompt, PromptHistoryDTO } from '../../shared/types/EvaSystemPromptDTO'

export const useEvaPromptStore = defineStore('evaPrompt', () => {
    // ─── State ────────────────────────────────────────────────────────────────
    const currentAgent = ref<string>('master')
    const content = ref('')
    const version = ref<number>(1)
    const updatedBy = ref<string | null>(null)
    const loading = ref(false)
    const saving = ref(false)
    const error = ref<string | null>(null)
    const lastUpdated = ref<string | null>(null)
    
    // History
    const history = ref<PromptHistoryDTO[]>([])
    const loadingHistory = ref(false)

    // Agents List
    const agents = ref<string[]>([])
    const loadingAgents = ref(false)

    // ─── Actions ──────────────────────────────────────────────────────────────
    async function fetchPrompt(agentName?: string) {
        if (agentName) {
            currentAgent.value = agentName
        }
        
        loading.value = true
        error.value = null
        try {
            const data = await $fetch<EvaSystemPrompt>(`/api/eva/prompt?agent=${currentAgent.value}`)
            content.value = data.content
            version.value = data.version
            updatedBy.value = data.updated_by
            lastUpdated.value = data.updated_at
        } catch (e: any) {
            error.value = e.data?.statusMessage || e.message || 'Erro ao carregar prompt.'
        } finally {
            loading.value = false
        }
    }

    async function savePrompt(newContent: string) {
        saving.value = true
        error.value = null
        try {
            const data = await $fetch<EvaSystemPrompt>('/api/eva/prompt', {
                method: 'PUT',
                body: { 
                    content: newContent,
                    agent_name: currentAgent.value
                },
            })
            content.value = data.content
            version.value = data.version
            updatedBy.value = data.updated_by
            lastUpdated.value = data.updated_at
            
            // Refresh agents list just in case a new one was created
            await fetchAgents()
        } catch (e: any) {
            error.value = e.data?.statusMessage || e.message || 'Erro ao salvar prompt.'
            throw e
        } finally {
            saving.value = false
        }
    }

    async function fetchHistory(agentName?: string) {
        loadingHistory.value = true
        try {
            const agent = agentName ?? currentAgent.value
            const data = await $fetch<PromptHistoryDTO[]>(`/api/eva/prompt-history?agent=${agent}`)
            history.value = data
        } catch (e: any) {
            console.error('Failed to fetch history:', e)
        } finally {
            loadingHistory.value = false
        }
    }

    async function fetchAgents() {
        loadingAgents.value = true
        try {
            const data = await $fetch<string[]>('/api/eva/prompt-agents')
            agents.value = data
            
            // Ensure 'master' is always available even if empty DB
            if (!agents.value.includes('master')) {
                agents.value.unshift('master')
            }
        } catch (e: any) {
            console.error('Failed to fetch agents list:', e)
        } finally {
            loadingAgents.value = false
        }
    }

    return {
        currentAgent,
        content,
        version,
        updatedBy,
        loading,
        saving,
        error,
        lastUpdated,
        history,
        loadingHistory,
        agents,
        loadingAgents,
        fetchPrompt,
        savePrompt,
        fetchHistory,
        fetchAgents
    }
})
