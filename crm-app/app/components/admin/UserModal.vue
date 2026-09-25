<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      
      <!-- Overlay -->
      <div 
        class="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity" 
        @click="close"
        aria-hidden="true"
      ></div>

      <!-- Center modal trick -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <!-- Modal Panel -->
      <div 
        class="inline-block align-bottom bg-white dark:bg-slate-900 rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-slate-200 dark:border-white/10"
      >
        <div class="px-6 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h3 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Icon :name="isEditing ? 'ph:user-circle-gear-bold' : 'ph:user-plus-bold'" class="w-6 h-6 text-primary" />
            {{ isEditing ? 'Editar Usuário' : 'Novo Usuário' }}
          </h3>
          <button @click="close" class="text-slate-400 hover:text-slate-500 dark:hover:text-white transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-2 rounded-full">
            <Icon name="ph:x-bold" class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
          <Input 
            v-model="form.name" 
            label="Nome Completo" 
            placeholder="Nome Sobrenome" 
            required
            :disabled="loading"
          />
          
          <Input 
            v-model="form.email" 
            label="E-mail" 
            type="email" 
            placeholder="nome@laracafe.adv.br" 
            required
            :disabled="isEditing || loading"
          />
          
          <div class="grid grid-cols-2 gap-4">
            <Input 
              v-model="form.phone" 
              label="Telefone" 
              placeholder="(11) 99999-9999" 
              :disabled="loading"
            />
            <Input 
              v-model="form.company" 
              label="Empresa" 
              placeholder="Nome da Empresa" 
              :disabled="loading"
            />
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div class="space-y-3 relative group">
              <label class="block text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-slate-500 dark:text-gray-400">Nível de Acesso (Role)</label>
              <select 
                v-model="form.role" 
                class="w-full px-5 py-3.5 rounded-md bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-0 focus:border-primary/50"
                :disabled="loading"
                required
              >
                <option value="user">Sem acesso (aguardando liberação)</option>
                <option value="equipe">Equipe (CRM, conversas e honorários)</option>
                <option value="admin">Administração (tudo, inclusive IA e usuários)</option>
              </select>
            </div>

          </div>

          <!-- Error Alert -->
          <div v-if="errorMsg" class="p-4 rounded-md bg-danger-50 border border-danger-100 text-danger-600 dark:bg-danger-500/10 dark:border-danger-500/20 dark:text-danger-400 text-xs font-bold flex items-start gap-3">
            <Icon name="ph:warning-circle-bold" class="w-4 h-4 shrink-0 mt-0.5" />
            <p>{{ errorMsg }}</p>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-white/5">
            <Button type="button" variant="outline" @click="close" :disabled="loading">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" :disabled="loading">
              <div class="flex items-center gap-2">
                <Icon v-if="loading" name="ph:spinner-gap-bold" class="w-5 h-5 animate-spin" />
                <span>{{ isEditing ? 'Salvar Alterações' : 'Criar Usuário' }}</span>
              </div>
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import Input from '../Input.vue'
import Button from '../Button.vue'
import type { Profile } from '../../../shared/types/profile'

const props = defineProps<{
  isOpen: boolean
  user?: Profile | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: [],
  submit: [data: Partial<Profile>]
}>()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  role: 'equipe' as 'admin' | 'equipe' | 'user',
})

const errorMsg = ref(props.error)
const isEditing = ref(false)

watch(() => props.error, (newVal) => {
  errorMsg.value = newVal
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    errorMsg.value = null
    if (props.user) {
      isEditing.value = true
      form.name = props.user.name || ''
      form.email = props.user.email || ''
      form.phone = props.user.phone || ''
      form.company = props.user.company || ''
      form.role = props.user.role || 'user'
    } else {
      isEditing.value = false
      form.name = ''
      form.email = ''
      form.phone = ''
      form.company = ''
      form.role = 'user'
    }
  }
})

function close() {
  emit('close')
}

function handleSubmit() {
  const payload: Partial<Profile> = {
    name: form.name,
    email: form.email,
    phone: form.phone,
    company: form.company,
    role: form.role
  }
  emit('submit', payload)
}
</script>
