import { ref } from 'vue'
import { useProfileStore } from '../stores/profile'

export function useAvatar() {
  const isUploading = ref(false)
  const error = ref<string | null>(null)
  const profileStore = useProfileStore()

  async function uploadAvatar(file: File) {
    if (!file) {
      error.value = 'Nenhuma imagem selecionada.'
      return false
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      error.value = 'Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.'
      return false
    }

    if (file.size > 5 * 1024 * 1024) {
      error.value = 'A imagem é muito grande. O limite é 5MB.'
      return false
    }

    try {
      isUploading.value = true
      error.value = null

      const formData = new FormData()
      formData.append('avatar', file)

      const response = await $fetch<{ success: boolean; avatar_url: string }>('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      if (response.success && response.avatar_url) {
        // Update the Pinia store instantly
        if (profileStore.profile) {
            profileStore.profile.avatar_url = response.avatar_url
        } else {
            // Se o perfil não estava carregado, vamos dar fetch novamente
            await profileStore.fetchMe()
        }
        return true
      }
      return false

    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erro desconhecido ao enviar foto.'
      console.error('Upload error:', err)
      return false
    } finally {
      isUploading.value = false
    }
  }

  return {
    isUploading,
    error,
    uploadAvatar
  }
}
