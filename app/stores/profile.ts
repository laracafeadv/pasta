import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSupabaseClient, useRequestFetch } from '#imports'
import type { Profile } from '../../shared/types/profile'
import type { Database } from '../../shared/types/database.types'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMe() {
    loading.value = true
    error.value = null

    try {
      const fetch = useRequestFetch()
      const data = await fetch<Profile>('/api/me')
      profile.value = data
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch profile'
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile(userId: string) {
    loading.value = true
    error.value = null

    try {
      const supabase = useSupabaseClient()
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      profile.value = data
    } catch (e: any) {
      error.value = e.message
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  // Grava pelo servidor: só nome, telefone e empresa (o nível de acesso nunca vem do cliente).
  async function updateProfile(updates: Pick<Partial<Profile>, 'name' | 'phone' | 'company'>) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<Profile>('/api/profile', { method: 'PUT', body: updates })
      profile.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.message || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearProfile() {
    profile.value = null
    error.value = null
  }

  return {
    profile,
    loading,
    error,
    fetchMe,
    fetchProfile,
    updateProfile,
    clearProfile
  }
})
