import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { assertActorRole } from '../../utils/security'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })
    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode acessar a assistente de IA.', 'eva/prompt-agents')

    const client = await serverSupabaseClient(event)

    const { data, error } = await client
        .from('eva_system_prompt')
        .select('agent_name')
        .order('agent_name', { ascending: true })

    if (error) {
        console.error('[eva/prompt-agents] Erro ao buscar agentes:', error)
        throw createError({ statusCode: 500, message: 'Erro interno ao buscar agentes.' })
    }

    // Retorna uma array de strings com os nomes dos agentes
    return data.map((row: any) => row.agent_name) as string[]
})
