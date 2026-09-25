import { defineEventHandler, getRequestURL, getRequestHeader, setResponseHeader, createError } from 'h3'

/**
 * In-memory rate limiter for expensive API routes (OpenAI/EVA).
 * Limits each IP to MAX_REQUESTS per WINDOW_MS on protected paths.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITED_PATHS = [
  '/api/eva/simular',
  '/api/eva/rag',
  '/api/email/send',
  '/api/admin/users',
]
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 20

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!RATE_LIMITED_PATHS.some(p => url.pathname.startsWith(p))) return

  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  const ip: string = forwarded
    ? forwarded.split(',')[0].trim()
    : (event.node.req.socket?.remoteAddress ?? 'unknown')

  const key = `${ip}:${url.pathname}`
  const now = Date.now()

  const record = rateLimitStore.get(key)
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  record.count++
  if (record.count > MAX_REQUESTS) {
    setResponseHeader(event, 'Retry-After', Math.ceil((record.resetAt - now) / 1000))
    throw createError({ statusCode: 429, message: 'Too Many Requests. Tente novamente em instantes.' })
  }
})
