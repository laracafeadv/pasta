import OpenAI, { toFile } from 'openai'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { randomUUID } from 'node:crypto'
import { createJob, completeJob, failJob } from '../../utils/ragJobStore'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertActorRole, throwSanitizedInternalError } from '../../utils/security'

interface RagBody {
    source: string      // Nome do arquivo ou descrição
    base64?: string     // Conteúdo binário do arquivo em base64
    conteudo?: string   // Texto manual (fallback para compatibilidade)
    tipo: string        // Extensão/tipo do arquivo
}

const METADATA_CONTENT_LIMIT = 8000
const METADATA_PREVIEW_LIMIT = 280

// ─── Tipos de arquivo suportados ───────────────────────────────────────────────
const FILE_TIPOS = ['PDF', 'XLSX', 'XLS', 'CSV', 'TXT', 'DOCX', 'DOC', 'JPG', 'JPEG', 'PNG', 'WEBP', 'GIF']

// Mapeamento de extensão → MIME type para upload
const MIME_MAP: Record<string, string> = {
    PDF: 'application/pdf',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel',
    CSV: 'text/csv',
    TXT: 'text/plain',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    DOC: 'application/msword',
    JPG: 'image/jpeg',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    WEBP: 'image/webp',
    GIF: 'image/gif',
}

// Tipos que são imagens (usam análise visual direta via base64)
const IMAGE_TIPOS = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF']

// Tipos que suportam upload direto para OpenAI Files API
const UPLOADABLE_TIPOS = ['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'CSV', 'TXT']

// ─── Prompt de Análise Completa ────────────────────────────────────────────────
const ANALYSIS_PROMPT = `Você é um especialista em extração e transcrição de conteúdo de documentos.

Sua única tarefa é converter o conteúdo do documento fornecido em Markdown limpo e estruturado.

## Regras absolutas:

1. Transcreva TODO o texto do documento fielmente, preservando a estrutura original.
2. Reproduza TODAS as tabelas em formato Markdown com os dados corretos.
3. Preserve a hierarquia: use ## e ### para títulos, listas para itens, blockquotes para citações.
4. Transcreva números, datas e valores com precisão absoluta.
5. Se houver imagens com conteúdo informacional relevante (gráficos, dados, texto embutido), descreva apenas a informação contida nelas, no local onde aparecem no documento.
6. NÃO adicione informações que não existam no documento.
7. NÃO resuma — transcreva o documento COMPLETO.
8. É TERMINANTEMENTE PROIBIDO incluir qualquer observação, nota, análise ou comentário sobre o próprio documento — como "Não há imagens", "O documento usa negrito", "Observações visuais", "Não há cabeçalhos", "Nota:", "Formatação:", ou qualquer variação disso. Se um elemento não existe no documento, simplesmente não mencione.
9. Responda SOMENTE com o Markdown transcrito. Nada mais.`

// ─── Text Splitter ─────────────────────────────────────────────────────────────
function splitText(text: string, chunkSize = 1200, chunkOverlap = 100): string[] {
    const separators = ['\n\n', '\n', ' ', '']

    function split(text: string, separatorIndex: number): string[] {
        if (separatorIndex >= separators.length) return [text]
        const separator = separators[separatorIndex] || ''

        let parts: string[]
        if (separator === '') {
            parts = text.split('')
        } else {
            parts = text.split(separator)
        }

        const chunks: string[] = []
        let currentChunk = ''

        for (const part of parts) {
            const potentialChunk = currentChunk ? currentChunk + separator + part : part

            if (potentialChunk.length <= chunkSize) {
                currentChunk = potentialChunk
            } else {
                if (currentChunk) chunks.push(currentChunk)
                currentChunk = part

                if (currentChunk.length > chunkSize) {
                    const subChunks = splitText(currentChunk, chunkSize, chunkOverlap)
                    chunks.push(...subChunks)
                    currentChunk = ''
                }
            }
        }
        if (currentChunk) chunks.push(currentChunk)
        return chunks
    }

    const initialChunks = split(text, 0)

    if (chunkOverlap === 0) return initialChunks

    const overlappedChunks: string[] = []
    for (let i = 0; i < initialChunks.length; i++) {
        let chunk = initialChunks[i] || ''
        if (i < initialChunks.length - 1 && chunk.length < chunkSize) {
            const nextChunk = initialChunks[i + 1] || ''
            const spaceLeft = chunkSize - chunk.length
            const overlapAmount = Math.min(chunkOverlap, spaceLeft)
            chunk += '\n' + nextChunk.slice(0, overlapAmount)
        }
        if (chunk.trim()) {
            overlappedChunks.push(chunk.trim())
        }
    }

    return overlappedChunks.filter(Boolean)
}

// ─── Analisar imagem via Chat Completions (base64 direto) ──────────────────────
async function analyzeImageWithVision(
    openai: OpenAI,
    base64: string,
    tipo: string,
): Promise<string> {
    const mimeType = MIME_MAP[tipo] || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64}`

    const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
            {
                role: 'system',
                content: ANALYSIS_PROMPT,
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Transcreva e analise completamente esta imagem. Inclua todo texto visível, descrição detalhada de elementos visuais, tabelas, gráficos e qualquer informação presente.',
                    },
                    {
                        type: 'image_url',
                        image_url: { url: dataUrl, detail: 'high' },
                    },
                ],
            },
        ],
        temperature: 0.1,
        max_tokens: 16000,
    })

    return response.choices[0]?.message?.content ?? ''
}

// ─── Analisar documento via Files API + Responses API ──────────────────────────
async function analyzeDocumentWithAI(
    openai: OpenAI,
    base64: string,
    fileName: string,
    tipo: string,
): Promise<string> {
    const mimeType = MIME_MAP[tipo] || 'application/octet-stream'
    const buffer = Buffer.from(base64, 'base64')

    // Step 1: Upload file to OpenAI
    const uploadedFile = await openai.files.create({
        file: await toFile(buffer, fileName, { type: mimeType }),
        purpose: 'assistants',
    })

    try {
        // Step 2: Use Responses API to analyze the file
        const response = await openai.responses.create({
            model: 'gpt-4.1',
            instructions: ANALYSIS_PROMPT,
            input: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: `Transcreva e analise completamente este documento "${fileName}". Inclua todo o conteúdo: textos, tabelas, imagens descritas, cabeçalhos, rodapés, e qualquer informação visual ou textual presente.`,
                        },
                        {
                            type: 'input_file',
                            file_id: uploadedFile.id,
                        },
                    ],
                },
            ],
            temperature: 0.1,
        })

        return response.output_text ?? ''
    } finally {
        // Cleanup: delete file from OpenAI after processing
        openai.files.delete(uploadedFile.id).catch(() => {})
    }
}

// ─── Background Processing ────────────────────────────────────────────────────
async function processInBackground(
    openai: OpenAI,
    supabase: SupabaseClient,
    source: string,
    tipo: string,
    documentGroupId: string,
    base64: string | undefined,
    rawTextInput: string | undefined,
): Promise<void> {
    try {
        let markdownContent = ''
        let originalContent = ''

        if (IMAGE_TIPOS.includes(tipo) && base64) {
            // ─── Imagens: análise visual direta via Chat Completions ───────
            console.log(`[eva/rag] Analisando imagem "${source}" com GPT-4.1 Vision...`)
            markdownContent = await analyzeImageWithVision(openai, base64, tipo)
            originalContent = `[Imagem: ${source}]`
        } else if (base64 && UPLOADABLE_TIPOS.includes(tipo)) {
            // ─── Documentos: upload + Responses API ────────────────────────
            console.log(`[eva/rag] Enviando "${source}" para OpenAI Files API + análise com GPT-4.1...`)
            markdownContent = await analyzeDocumentWithAI(openai, base64, source, tipo)
            originalContent = `[Documento: ${source}]`
        } else if (rawTextInput) {
            // ─── Texto manual: análise direta ──────────────────────────────
            console.log(`[eva/rag] Processando texto manual com GPT-4.1...`)
            originalContent = rawTextInput

            const response = await openai.responses.create({
                model: 'gpt-4.1',
                instructions: ANALYSIS_PROMPT,
                input: rawTextInput.slice(0, 100_000),
                temperature: 0.1,
            })

            markdownContent = response.output_text ?? rawTextInput
        } else {
            failJob(documentGroupId, 'Nenhum conteúdo fornecido para análise.')
            return
        }

        if (!markdownContent.trim()) {
            failJob(documentGroupId, 'A IA não conseguiu extrair conteúdo do documento.')
            return
        }

        const originalContentPreview = originalContent.slice(0, METADATA_CONTENT_LIMIT)
        const originalSearchPreview = originalContent.slice(0, METADATA_PREVIEW_LIMIT)
        const markdownContentPreview = markdownContent.slice(0, METADATA_CONTENT_LIMIT)
        const markdownSearchPreview = markdownContent.slice(0, METADATA_PREVIEW_LIMIT)

        // ─── Save to informacoes_adicional_rag ───────────────────────────
        const { data: ragRow, error: ragError } = await supabase
            .from('informacoes_adicional_rag')
            .insert({
                content: markdownContent,
                source: source.slice(0, 100),
                tipo,
            })
            .select('id')
            .single()

        if (ragError) {
            console.error('[eva/rag] Erro ao salvar em informacoes_adicional_rag:', ragError)
            failJob(documentGroupId, 'Erro ao salvar documento no RAG.')
            return
        }

        // ─── Chunk + Embeddings ──────────────────────────────────────────
        const chunks = splitText(markdownContent, 1200, 100)

        if (chunks.length === 0) {
            completeJob(documentGroupId, { chunks: 0, markdownPreview: 'Nenhum texto contínuo extraído.' })
            return
        }

        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunks,
        })

        const inserts = chunks.map((chunk, i) => ({
            content: chunk,
            embedding: embeddingResponse.data[i]?.embedding ?? [],
            metadata: {
                source: source.slice(0, 50),
                tipo,
                chunk_index: i + 1,
                total_chunks: chunks.length,
                document_group_id: documentGroupId,
                originalPreview: originalSearchPreview,
                markdownPreview: markdownSearchPreview,
                ...(i === 0 ? { originalContent: originalContentPreview, markdownContent: markdownContentPreview } : {}),
            },
        }))

        const { error: vecError } = await supabase.from('documents').insert(inserts)

        if (vecError) {
            console.error('[eva/rag] Erro ao salvar no vector store, revertendo registro RAG:', vecError)
            await supabase.from('informacoes_adicional_rag').delete().eq('id', ragRow.id)
            failJob(documentGroupId, 'Erro ao salvar embeddings.')
            return
        }

        completeJob(documentGroupId, { chunks: chunks.length, markdownPreview: markdownContent.slice(0, 300) })
        console.log(`[eva/rag] ✅ "${source}" processado com sucesso: ${chunks.length} chunks salvos.`)
    } catch (err: any) {
        console.error('[eva/rag] Erro inesperado no processamento em background:', err)
        failJob(documentGroupId, err.message || 'Erro inesperado no processamento.')
    }
}

// ─── Request Handler ──────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })

    await assertActorRole(event, user.sub, ['admin'], 'Apenas a administração pode configurar a assistente de IA.', 'eva/rag:create')

    const config = useRuntimeConfig()
    const apiKey = config.openaiApiKey as string

    if (!apiKey) {
        throw createError({ statusCode: 500, message: 'Serviço de IA indisponível no momento.' })
    }

    const body = await readBody<RagBody>(event)

    if (!body?.tipo) {
        throw createError({ statusCode: 400, message: 'Campo "tipo" é obrigatório.' })
    }

    const tipo = body.tipo.toUpperCase()

    if (!FILE_TIPOS.includes(tipo)) {
        throw createError({ statusCode: 400, message: `Tipo "${body.tipo}" não suportado. Use: ${FILE_TIPOS.join(', ')}.` })
    }

    // Para arquivos binários, base64 é obrigatório
    if (tipo !== 'TXT' && !body.base64) {
        throw createError({ statusCode: 400, message: 'Campo "base64" é obrigatório para arquivos.' })
    }

    const source = body.source || body.conteudo || `upload-${tipo}`
    const documentGroupId = randomUUID()

    // ─── Kick off background processing ──────────────────────────────────
    const openai = new OpenAI({ apiKey })
    const supabase = serverSupabaseServiceRole(event)

    createJob(documentGroupId, user.sub)

    // Fire-and-forget: AI analysis + embeddings + DB inserts run after response
    processInBackground(
        openai,
        supabase,
        source,
        tipo,
        documentGroupId,
        body.base64,
        tipo === 'TXT' ? (body.conteudo || body.source) : undefined,
    ).catch(() => {})

    setResponseStatus(event, 202)
    return { success: true, jobId: documentGroupId, status: 'processing' }
})
