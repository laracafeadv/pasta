<template>
  <Dropdown v-if="canShowNotifications" align="right" width="w-80">
    <template #trigger>
      <button
        type="button"
        @click="refreshNotifications"
        class="relative h-10 w-10 sm:h-11 sm:w-11 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        aria-label="Abrir notificações"
      >
        <Icon name="ph:bell-bold" class="w-5 h-5" />
        <span
          v-if="unreadCount > 0"
          class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-black inline-flex items-center justify-center"
        >
          {{ unreadLabel }}
        </span>
      </button>
    </template>

    <template #content="{ close }">
      <div class="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
        <p class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Notificações</p>
        <button
          v-if="unreadCount > 0"
          @click="markAllAsRead"
          class="text-[11px] font-bold text-primary hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          type="button"
        >
          Marcar todas
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div v-if="loading" class="px-4 py-6 text-xs text-slate-500 dark:text-slate-400 text-center">
          Carregando notificações...
        </div>

        <div v-else-if="notifications.length === 0" class="px-4 py-6 text-xs text-slate-500 dark:text-slate-400 text-center">
          Nenhuma notificação no momento.
        </div>

        <div v-else>
          <div
            v-for="notification in notifications.slice(0, 12)"
            :key="notification.id"
            class="group border-b border-slate-100 dark:border-white/5 last:border-b-0"
          >
            <button
              type="button"
              @click="openNotification(notification.id, notification.metadata, close)"
              class="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ notification.title }}</span>
                    <span v-if="!notification.is_read" class="h-2 w-2 rounded-full bg-primary shrink-0"></span>
                  </div>
                  <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {{ notification.message }}
                  </p>
                  <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {{ formatDate(notification.created_at) }}
                  </p>
                </div>

                <button
                  type="button"
                  @click.stop="deleteNotification(notification.id)"
                  class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-danger transition-all mt-0.5"
                  aria-label="Excluir notificação"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </button>
          </div>
        </div>
      </div>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSupabaseUser, navigateTo } from '#imports'
import type { NotificationDTO } from '../../../shared/types/NotificationDTO'
import { useNotificationsStore } from '../../stores/notifications'
import Dropdown from '../Dropdown.vue'

const user = useSupabaseUser()
const notificationsStore = useNotificationsStore()

const { notifications, loading, unreadCount } = storeToRefs(notificationsStore)

const canShowNotifications = computed(() => {
  return Boolean(user.value)
})

const unreadLabel = computed(() => (unreadCount.value > 99 ? '99+' : String(unreadCount.value)))

watch(
  canShowNotifications,
  async (enabled) => {
    if (enabled) {
      await notificationsStore.fetchNotifications()
      notificationsStore.subscribeToNotifications()
      return
    }

    notificationsStore.unsubscribeFromNotifications()
  },
  { immediate: true }
)

onUnmounted(() => {
  notificationsStore.unsubscribeFromNotifications()
})

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function openNotification(
  id: string,
  metadata: NotificationDTO['metadata'],
  close: () => void
) {
  await notificationsStore.markAsRead(id)

  const vendaId = metadata?.venda_id
  if (vendaId) {
    close()
    await navigateTo('/crm')
  }
}

async function markAllAsRead() {
  await notificationsStore.markAllAsRead()
}

async function deleteNotification(id: string) {
  await notificationsStore.deleteNotification(id)
}

async function refreshNotifications() {
  if (!canShowNotifications.value) return
  await notificationsStore.fetchNotifications()
}
</script>
