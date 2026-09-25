import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRequestFetch, useSupabaseClient, useSupabaseUser } from '#imports'
import type { NotificationDTO } from '../../shared/types/NotificationDTO'
import type { Database } from '../../shared/types/database.types'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<NotificationDTO[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const requestFetch = useRequestFetch()

  const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

  async function fetchNotifications() {
    if (!user.value) return
    
    loading.value = true
    error.value = null

    try {
      const data = await requestFetch<NotificationDTO[]>('/api/notifications')
      notifications.value = data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching notifications:', e)
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id: string) {
    try {
      await requestFetch(`/api/notifications/${id}/read`, {
        method: 'PATCH'
      })
      
      const index = notifications.value.findIndex(n => n.id === id)
      if (index !== -1 && notifications.value[index]) {
        notifications.value[index].is_read = true
      }
    } catch (e: any) {
      console.error('Error marking notification as read:', e)
    }
  }

  async function markAllAsRead() {
    if (!user.value) return

    try {
      await requestFetch('/api/notifications/read-all', {
        method: 'PATCH'
      })
      
      notifications.value.forEach(n => {
        n.is_read = true
      })
    } catch (e: any) {
      console.error('Error marking all notifications as read:', e)
    }
  }

  async function deleteNotification(id: string) {
    try {
      await requestFetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      })
      
      notifications.value = notifications.value.filter(n => n.id !== id)
    } catch (e: any) {
      console.error('Error deleting notification:', e)
    }
  }

  // Real-time subscription
  let channel: any = null

  function subscribeToNotifications() {
    if (!user.value || channel) return

    channel = supabase
      .channel(`public:notifications:user_id=eq.${user.value.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.value.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            notifications.value.unshift(payload.new as NotificationDTO)
          } else if (payload.eventType === 'UPDATE') {
            const index = notifications.value.findIndex(n => n.id === payload.new.id)
            if (index !== -1 && notifications.value[index]) {
              const current = notifications.value[index]
              notifications.value[index] = { ...current, ...(payload.new as Partial<NotificationDTO>) }
            }
          } else if (payload.eventType === 'DELETE') {
            notifications.value = notifications.value.filter(n => n.id !== (payload.old as { id?: string }).id)
          }
        }
      )
      .subscribe()
  }

  function unsubscribeFromNotifications() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    subscribeToNotifications,
    unsubscribeFromNotifications
  }
})
