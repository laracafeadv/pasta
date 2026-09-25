<template>
  <div class="relative inline-block text-left" v-click-outside="close">
    <!-- Dropdown Trigger -->
    <div @click="toggle" class="cursor-pointer h-full">
      <slot name="trigger" :is-open="isOpen"></slot>
    </div>

    <!-- Dropdown Content -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-2"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-2"
    >
      <div 
        v-if="isOpen"
        :class="[
          'absolute mt-3 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl z-[110] overflow-hidden py-2',
          align === 'right' ? 'right-0' : 'left-0',
          widthClass
        ]"
      >
        <slot name="content" :close="close"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  align?: 'left' | 'right'
  width?: string // CSS width like 'w-56'
}

const props = withDefaults(defineProps<Props>(), {
  align: 'right',
  width: 'w-56'
})

const isOpen = ref(false)

const widthClass = computed(() => props.width)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

// Custom directive for clicking outside
const vClickOutside = {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      // Check if click was outside the element and its children
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

// Expose internal state if needed
defineExpose({
  isOpen,
  close,
  toggle
})
</script>
