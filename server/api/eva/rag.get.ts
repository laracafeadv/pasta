import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { assertActorRole } from '../../utils/security'

function summarizeMetadata(metadata: Record<string, any> | null | undefined) {
    if (!metadata) {
        return null
    }

    const {
        originalContent: _originalContent,
        markdownContent: _markdownContent,
        ...summary
    } = metadata

    return summary
}

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })
    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode acessar a assistente de IA.', 'eva/rag:list')

    const supabase = serverSupabaseServiceRole(event)

    // Fetch all rows from the documents vector store table
    // Exclude the embedding column (large binary vector — not needed for display)
    const { data, error } = await supabase
        .from('documents')
        .select('id, content, metadata')
        .order('id', { ascending: false })

    if (error) {
        console.error('[eva/rag] Erro ao buscar documentos:', error)
        throw createError({ statusCode: 500, message: 'Erro interno ao buscar documentos.' })
    }

    return (data ?? []).map((item) => ({
        ...item,
        metadata: summarizeMetadata(item.metadata as Record<string, any> | null | undefined),
    }))
})
