import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRequestFetch } from '#imports'
import type { Profile } from '../../shared/types/profile'

export const useAdminUsersStore = defineStore('adminUsers', () => {
  const users = ref<Profile[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const fetch = useRequestFetch()
      const data = await fetch<Profile[]>('/api/admin/users')
      users.value = data
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Falha ao buscar usuários'
    } finally {
      loading.value = false
    }
  }

  async function createUser(userData: Partial<Profile> & { password?: string }) {
    loading.value = true
    error.value = null
    try {
      const fetch = useRequestFetch()
      const data = await fetch<{ success: boolean; user: Profile; emailSent?: boolean }>('/api/admin/users', {
        method: 'POST',
        body: userData
      })
      if (data.success && data.user) {
        users.value.unshift(data.user)
      }
      return data
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Falha ao criar usuário'
      throw new Error(error.value!)
    } finally {
      loading.value = false
    }
  }

  async function updateUser(userId: string, updates: Partial<Profile>) {
    loading.value = true
    error.value = null
    try {
      const fetch = useRequestFetch()
      const data = await fetch<{ success: boolean; user: Profile }>(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: updates
      })
      if (data.success && data.user) {
        const index = users.value.findIndex(u => u.id === userId)
        if (index !== -1) {
          users.value[index] = data.user
        }
      }
      return data.user
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Falha ao atualizar usuário'
      throw new Error(error.value!)
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser
  }
})
