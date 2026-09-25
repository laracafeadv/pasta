import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRequestFetch } from '#imports'

interface RagJobStatus {
    jobId: string
    status: 'processing' | 'completed' | 'error'
    result?: { chunks: number; markdownPreview: string }
    errorMessage?: string
}

export const useEvaRagStore = defineStore('evaRag', () => {
    const loading = ref(false)
    const error = ref<string | null>(null)
    const lastResult = ref<RagJobStatus | null>(null)

    /**
     * Send a document through the RAG pipeline.
     * Returns immediately with a jobId (202), then polls until done.
     */
    async function sendDocument(payload: {
        source?: string
        conteudo?: string
        base64?: string
        tipo: string
    }): Promise<RagJobStatus> {
        loading.value = true
        error.value = null
        lastResult.value = null

        try {
            const fetch = useRequestFetch()

            // Step 1: submit — returns immediately with jobId
            const job = await fetch<RagJobStatus>('/api/eva/rag', {
                method: 'POST',
                body: payload,
            })

            // Step 2: poll until completed or error
            const result = await pollJobStatus(job.jobId)
            lastResult.value = result

            if (result.status === 'error') {
                error.value = result.errorMessage || 'Erro ao processar documento.'
                throw new Error(error.value)
            }

            return result
        } catch (e: any) {
            if (!error.value) {
                error.value = e.data?.message || e.message || 'Erro ao processar documento.'
            }
            throw e
        } finally {
            loading.value = false
        }
    }

    async function pollJobStatus(jobId: string): Promise<RagJobStatus> {
        const fetch = useRequestFetch()
        const POLL_INTERVAL_MS = 2000
        const MAX_POLLS = 60 // 2 min timeout

        for (let i = 0; i < MAX_POLLS; i++) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
            const job = await fetch<RagJobStatus>(`/api/eva/rag/status/${jobId}`)
            if (job.status !== 'processing') return job
        }

        return { jobId, status: 'error', errorMessage: 'Timeout ao aguardar processamento.' }
    }

    function reset() {
        loading.value = false
        error.value = null
        lastResult.value = null
    }

    return { loading, error, lastResult, sendDocument, reset }
})
