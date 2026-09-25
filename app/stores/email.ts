import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRequestFetch } from '#imports'

export interface SendEmailPayload {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}

export const useEmailStore = defineStore('email', () => {
  const isSending = ref(false)
  const error = ref<string | null>(null)

  async function sendEmail(payload: SendEmailPayload) {
    isSending.value = true
    error.value = null

    try {
      const fetch = useRequestFetch()
      const response = await fetch('/api/email/send', {
        method: 'POST',
        body: JSON.stringify(payload)
      }) as any

      return response.success
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Falha ao enviar e-mail'
      return false
    } finally {
      isSending.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    isSending,
    error,
    sendEmail,
    clearError
  }
})
