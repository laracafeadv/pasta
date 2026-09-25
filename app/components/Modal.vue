<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="handleClose" class="relative z-[200]">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
            enter-to="opacity-100 scale-100 translate-y-0"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100 translate-y-0"
            leave-to="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
          >
            <DialogPanel 
              class="w-full transform overflow-hidden rounded-lg bg-white dark:bg-zinc-900 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-zinc-800 relative flex flex-col max-h-[90vh]"
              :class="maxWidthClass"
            >
              
              <!-- Header -->
              <div class="flex items-center justify-between p-6 sm:p-8 border-b border-gray-100 dark:border-zinc-800/50 flex-shrink-0" :class="headerClass">
                <div>
                  <DialogTitle as="h3" class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                    <slot name="title">{{ title }}</slot>
                  </DialogTitle>
                  <p v-if="description || $slots.description" class="text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1">
                    <slot name="description">{{ description }}</slot>
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <slot name="header-actions"></slot>
                  <button
                    v-if="showCloseButton"
                    @click="handleClose"
                    :disabled="loading"
                    class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Content Area (Scrollable) -->
              <div class="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar" :class="contentClass">
                <slot></slot>
              </div>

              <!-- Footer -->
              <div v-if="$slots.footer" class="p-6 sm:p-8 border-t border-gray-100 dark:border-zinc-800/50 bg-gray-50/50 dark:bg-zinc-800/30 flex-shrink-0">
                <slot name="footer"></slot>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'

export interface ModalProps {
  isOpen: boolean
  title?: string
  description?: string
  loading?: boolean
  showCloseButton?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  headerClass?: string
  contentClass?: string
}

const props = withDefaults(defineProps<ModalProps>(), {
  title: '',
  description: '',
  loading: false,
  showCloseButton: true,
  maxWidth: 'lg',
  headerClass: '',
  contentClass: ''
})

const emit = defineEmits<{
  close: []
}>()

const headerClass = computed(() => props.headerClass)
const contentClass = computed(() => props.contentClass)

const maxWidthClass = computed(() => {
  const sizes = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  }
  return sizes[props.maxWidth]
})

function handleClose() {
  if (props.loading) return
  emit('close')
}
</script>
