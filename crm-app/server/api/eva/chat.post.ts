import OpenAI from 'openai'
import { serverSupabaseUser } from '#supabase/server'
import { OPENAI_MODELS } from '../../../shared/constants/openaiModels'
import type { OpenAIChatPayload, OpenAIChatResponse } from '../../../shared/constants/openaiModels'
import { throwSanitizedInternalError } from '../../utils/security'

const ALLOWED_MODEL_IDS = new Set(OPENAI_MODELS.map(m => m.id))

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })

    const config = useRuntimeConfig()
    const apiKey = config.openaiApiKey

    if (!apiKey) {
        throw createError({
            statusCode: 500,
            message: 'Serviço de IA indisponível no momento.'
        })
    }

    const body = await readBody<OpenAIChatPayload>(event)

    if (!body?.model || !body?.messages?.length) {
        throw createError({
            statusCode: 400,
            message: 'Campos "model" e "messages" são obrigatórios.'
        })
    }

    if (!ALLOWED_MODEL_IDS.has(body.model)) {
        throw createError({ statusCode: 400, message: `Modelo "${body.model}" não é permitido.` })
    }

    const openai = new OpenAI({ apiKey: apiKey as string })

    let completion: OpenAIChatResponse
    try {
        completion = await openai.chat.completions.create({
            model: body.model,
            messages: body.messages,
            temperature: body.temperature ?? 0.7,
            ...(body.max_tokens ? { max_tokens: body.max_tokens } : {}),
        }) as unknown as OpenAIChatResponse
    } catch (error) {
        throwSanitizedInternalError('eva/chat', error, 'Erro interno ao processar solicitação da EVA.')
    }

    return completion
})
