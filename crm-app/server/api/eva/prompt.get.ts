import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { EvaSystemPrompt } from '../../../shared/types/EvaSystemPromptDTO'
import { assertActorRole, normalizeEvaAgentName } from '../../utils/security'

const PROMPT_SELECT = 'id, agent_name, content, version, updated_at, updated_by'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })
    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode acessar a assistente de IA.', 'eva/prompt:get')

    const client = await serverSupabaseClient(event)
    const query = getQuery(event)
    const agentName = normalizeEvaAgentName(query.agent)

    const { data, error } = await client
        .from('eva_system_prompt')
        .select(PROMPT_SELECT)
        .eq('agent_name', agentName)
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error('[eva/prompt] Erro ao buscar prompt:', error)
        throw createError({ statusCode: 500, message: 'Erro interno ao buscar prompt.' })
    }

    if (!data) {
        // Return a mock default if the agent prompt doesn't exist yet
        return {
            id: 0,
            agent_name: agentName,
            content: '',
            version: 1,
            updated_at: new Date().toISOString(),
            updated_by: null
        } as EvaSystemPrompt
    }

    return data as EvaSystemPrompt
})
