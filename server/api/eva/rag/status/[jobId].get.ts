import { serverSupabaseUser } from '#supabase/server'
import { assertActorRole } from '../../../../utils/security'
import { getJobForUser } from '../../../../utils/ragJobStore'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })
    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode acessar a assistente de IA.', 'eva/rag:status')

    const jobId = getRouterParam(event, 'jobId')
    if (!jobId) throw createError({ statusCode: 400, message: 'jobId é obrigatório.' })

    const job = getJobForUser(jobId, user.sub)
    if (!job) throw createError({ statusCode: 404, message: 'Job não encontrado ou expirado.' })

    return job
})
