import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler((event) => {
  return sendRedirect(event, '/llms.txt', 302)
})
