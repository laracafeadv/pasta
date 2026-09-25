import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { assertActorRole } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

function parseDocumentId(idParam: string | undefined) {
    const parsedId = Number(idParam)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
        throw createError({ statusCode: 400, message: 'Invalid document ID' })
    }

    return parsedId
}

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })

    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode configurar a assistente de IA.', 'eva/rag:delete')

    const id = parseDocumentId(getRouterParam(event, 'id'))
    const client = serverSupabaseServiceRole(event)

    const { error } = await client
        .from('documents')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[eva/rag] Erro ao deletar documento:', error)
        throw createError({ statusCode: 500, message: 'Erro interno ao deletar documento.' })
    }

    await auditar(event, 'removeu documento da base da Ana', 'assistente', id)
    return { success: true }
})
