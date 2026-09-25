import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { assertActorRole } from '../../../utils/security'

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
    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode acessar a assistente de IA.', 'eva/rag:get')

    const supabase = serverSupabaseServiceRole(event)
    const id = parseDocumentId(getRouterParam(event, 'id'))

    const { data, error } = await supabase
        .from('documents')
        .select('id, content, metadata')
        .eq('id', id)
        .single()

    if (error || !data) {
        if (error) console.error('[eva/rag] Erro ao buscar documento:', error)
        throw createError({ statusCode: 404, message: 'Documento não encontrado.' })
    }

    const metadata = (data.metadata ?? {}) as Record<string, any>
    const documentGroupId = metadata.document_group_id as string | undefined

    if ((!metadata.originalContent || !metadata.markdownContent) && documentGroupId) {
        const { data: sourceChunk } = await supabase
            .from('documents')
            .select('metadata')
            .contains('metadata', { document_group_id: documentGroupId, chunk_index: 1 })
            .limit(1)
            .maybeSingle()

        const sourceMetadata = (sourceChunk?.metadata ?? {}) as Record<string, any>

        return {
            ...data,
            metadata: {
                ...metadata,
                originalContent: metadata.originalContent || sourceMetadata.originalContent,
                markdownContent: metadata.markdownContent || sourceMetadata.markdownContent,
            },
        }
    }

    return data
})