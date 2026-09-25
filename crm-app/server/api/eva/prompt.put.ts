import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { EvaSystemPrompt } from '../../../shared/types/EvaSystemPromptDTO'
import { assertActorRole, normalizeEvaAgentName } from '../../utils/security'

const PROMPT_SELECT = 'id, agent_name, content, version, updated_at, updated_by'

export default defineEventHandler(async (event) => {
    const body = await readBody<{ content: string; agent_name?: string }>(event)

    if (!body || typeof body.content !== 'string') {
        throw createError({ statusCode: 400, message: 'Campo "content" é obrigatório.' })
    }

    const user = await serverSupabaseUser(event)
    if (!user?.sub) {
        throw createError({
            statusCode: 401,
            message: 'Usuário não autenticado. Faça login novamente.'
        })
    }

    const agentName = normalizeEvaAgentName(body.agent_name)

    // Use service role to bypass RLS and guarantee the update succeeds
    const adminClient = serverSupabaseServiceRole(event)
    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode configurar a assistente de IA.', 'eva/prompt')

    // Get the existing row for this agent
    const { data: existing } = await adminClient
        .from('eva_system_prompt')
        .select(PROMPT_SELECT)
        .eq('agent_name', agentName)
        .limit(1)
        .maybeSingle()

    let result: EvaSystemPrompt

    if (!existing) {
        // Create first version
        const { data, error } = await adminClient
            .from('eva_system_prompt')
            .insert({
                agent_name: agentName,
                content: body.content,
                version: 1,
                updated_at: new Date().toISOString(),
                updated_by: user.sub,
            })
            .select()
            .single()

        if (error) { console.error('[eva/prompt] Erro ao criar prompt:', error); throw createError({ statusCode: 500, message: 'Erro interno ao criar prompt.' }) }
        result = data as EvaSystemPrompt
    } else {
        // Save history before updating
        const { error: historyError } = await adminClient
            .from('eva_prompt_history')
            .insert({
                prompt_id: existing.id,
                agent_name: existing.agent_name,
                content: existing.content,
                version: existing.version,
                updated_at: existing.updated_at,
                updated_by: existing.updated_by
            })

        if (historyError) { console.error('[eva/prompt] Erro ao salvar histórico:', historyError); throw createError({ statusCode: 500, message: 'Falha ao salvar histórico do prompt.' }) }

        // Update to next version
        const { data, error } = await adminClient
            .from('eva_system_prompt')
            .update({
                content: body.content,
                version: existing.version + 1,
                updated_at: new Date().toISOString(),
                updated_by: user.sub,
            })
            .eq('id', existing.id)
            .select()
            .single()

        if (error) { console.error('[eva/prompt] Erro ao atualizar prompt:', error); throw createError({ statusCode: 500, message: 'Erro interno ao atualizar prompt.' }) }
        result = data as EvaSystemPrompt
    }

    return result
})
