export interface EvaSystemPrompt {
    id: number
    agent_name: string
    content: string
    version: number
    updated_at: string
    updated_by: string | null
}

export interface PromptHistoryDTO {
    history_id: number
    prompt_id: number
    agent_name: string
    content: string
    version: number
    updated_at: string
    updated_by: string | null
    user_email?: string
}
