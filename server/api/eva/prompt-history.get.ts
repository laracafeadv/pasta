import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { PromptHistoryDTO } from '../../../shared/types/EvaSystemPromptDTO'
import { assertActorRole, normalizeEvaAgentName } from '../../utils/security'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })
    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode acessar a assistente de IA.', 'eva/prompt-history')

    const client = await serverSupabaseClient(event)
    const query = getQuery(event)
    const agentName = normalizeEvaAgentName(query.agent)

    const { data, error } = await client
        .from('eva_prompt_history')
        .select(`
            history_id,
            prompt_id,
            agent_name,
            content,
            version,
            updated_at,
            updated_by
        `)
        .eq('agent_name', agentName)
        .order('version', { ascending: false })

    if (error) {
        console.error('[eva/prompt-history] Erro ao buscar histórico:', error)
        throw createError({ statusCode: 500, message: 'Erro interno ao buscar histórico.' })
    }

    // Map to ensure the user_email field exists for the UI without breaking
    return data.map((item: any) => ({
        ...item,
        user_email: item.updated_by ? `Admin (${item.updated_by.substring(0,8)})` : 'Sistema'
    })) as PromptHistoryDTO[]
})
