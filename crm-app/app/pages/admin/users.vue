<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 text-slate-900 dark:text-slate-100">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Header Area -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-slate-900 dark:text-white">Gerenciar Usuários</h1>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Quem tem acesso ao CRM do escritório e com qual nível. <NuxtLink to="/admin/auditoria" class="underline underline-offset-2">Ver auditoria</NuxtLink></p>
        </div>
        <Button variant="primary" @click="openModal(null)" class="shrink-0 shadow-glow-primary/20">
          <div class="flex items-center gap-2">
            <Icon name="ph:user-plus-bold" class="w-5 h-5" />
            <span>Novo Usuário</span>
          </div>
        </Button>
      </div>

      <!-- Stats / Quick Info -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card variant="light" class="p-6">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-2">Total de Usuários</p>
          <p class="text-3xl font-black text-slate-900 dark:text-white">{{ users.length }}</p>
        </Card>
        <Card variant="light" class="p-6">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-2">Admins / Staff</p>
          <p class="text-3xl font-black text-primary">{{ staffCount }}</p>
        </Card>
        <Card variant="light" class="p-6">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-2">Clientes Externos</p>
          <p class="text-3xl font-black text-emerald-500">{{ externalCount }}</p>
        </Card>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !users.length" class="flex justify-center py-20">
        <Icon name="ph:spinner-gap-bold" class="w-10 h-10 text-primary animate-spin" />
      </div>

      <!-- Users Table -->
      <Card v-else variant="light" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">Usuário</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">Nível</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 text-right">Acesso</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="user in users" 
                :key="user.id"
                class="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm">
                       <img v-if="user.avatar_url" :src="user.avatar_url" class="w-full h-full object-cover" />
                       <span v-else>{{ user.name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div>
                      <p class="text-sm font-bold text-slate-900 dark:text-white">{{ user.name }}</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <Badge 
                    :variant="user.role === 'admin' ? 'danger' : user.role === 'equipe' ? 'warning' : 'primary'"
                    class="capitalize"
                  >
                    {{ user.role === 'admin' ? 'Administração' : user.role === 'equipe' ? 'Equipe' : 'Sem acesso' }}
                  </Badge>
                </td>
                <td class="px-6 py-4 text-right">
                  <p class="text-xs font-medium text-slate-600 dark:text-slate-300">{{ formatDate(user.created_at) }}</p>
                </td>
                <td class="px-6 py-4 text-center">
                  <button 
                    @click="openModal(user)"
                    class="w-8 h-8 rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Editar Usuário"
                  >
                    <Icon name="ph:pencil-simple-bold" class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="users.length === 0 && !loading" class="p-12 text-center text-slate-500 dark:text-slate-400">
            Nenhum usuário encontrado na plataforma.
          </div>
        </div>
      </Card>
    </div>

    <UserModal 
      :is-open="modalOpen"
      :user="selectedUser"
      :loading="loadingAction"
      :error="actionError"
      @close="closeModal"
      @submit="handleModalSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { definePageMeta } from '#imports'
import { useAdminUsersStore } from '../../stores/adminUsers'
import Card from '../../components/Card.vue'
import Button from '../../components/Button.vue'
import Badge from '../../components/Badge.vue'
import UserModal from '../../components/admin/UserModal.vue'
import type { Profile } from '../../../shared/types/profile'

definePageMeta({
  middleware: ['auth', 'admin']
})

const adminStore = useAdminUsersStore()
const { users, loading } = storeToRefs(adminStore)

const modalOpen = ref(false)
const selectedUser = ref<Profile | null>(null)
const loadingAction = ref(false)
const actionError = ref<string | null>(null)

const staffCount = computed(() => users.value.filter(u => u.role === 'admin' || u.role === 'equipe').length)
const externalCount = computed(() => users.value.filter(u => u.role === 'user').length)

onMounted(async () => {
  await adminStore.fetchUsers()
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function openModal(user: Profile | null) {
  selectedUser.value = user
  actionError.value = null
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  selectedUser.value = null
  actionError.value = null
}

async function handleModalSubmit(data: Partial<Profile>) {
  loadingAction.value = true
  actionError.value = null
  try {
    if (selectedUser.value && selectedUser.value.id) {
      // Editar
      await adminStore.updateUser(selectedUser.value.id, data)
      alert(`Usuário ${data.name} atualizado com sucesso!`)
    } else {
      // Criar Novo
      const res = await adminStore.createUser(data)
      if ((res as any).emailSent) {
        alert(`Usuário criado com sucesso!\nUm email com as credenciais de acesso foi enviado para ${data.email}.`)
      } else {
        alert(`Usuário criado com sucesso!\nAtenção: não foi possível enviar o email de convite. Verifique a configuração de email do servidor.`)
      }
    }
    closeModal()
  } catch (err: any) {
    actionError.value = err.message || 'Falha na operação.'
  } finally {
    loadingAction.value = false
  }
}
</script>
