/**
 * In-memory job store for RAG processing tasks.
 * Allows rag.post.ts to return immediately while processing runs in background.
 * Jobs are automatically evicted after JOB_TTL_MS to prevent memory leaks.
 */

export interface RagJob {
    jobId: string
    ownerId: string
    status: 'processing' | 'completed' | 'error'
    createdAt: number
    result?: { chunks: number; markdownPreview: string }
    errorMessage?: string
}

const store = new Map<string, RagJob>()
const JOB_TTL_MS = 30 * 60 * 1000 // 30 minutes

function evictExpiredJobs() {
    const cutoff = Date.now() - JOB_TTL_MS
    for (const [id, job] of store.entries()) {
        if (job.createdAt < cutoff) store.delete(id)
    }
}

export function createJob(jobId: string, ownerId: string): void {
    evictExpiredJobs()
    store.set(jobId, { jobId, ownerId, status: 'processing', createdAt: Date.now() })
}

export function completeJob(jobId: string, result: { chunks: number; markdownPreview: string }): void {
    const job = store.get(jobId)
    if (job) store.set(jobId, { ...job, status: 'completed', result })
}

export function failJob(jobId: string, errorMessage: string): void {
    const job = store.get(jobId)
    if (job) store.set(jobId, { ...job, status: 'error', errorMessage })
}

export function getJob(jobId: string): RagJob | undefined {
    return store.get(jobId)
}

export function getJobForUser(jobId: string, ownerId: string): RagJob | undefined {
    const job = store.get(jobId)
    if (!job || job.ownerId !== ownerId) return undefined
    return job
}
