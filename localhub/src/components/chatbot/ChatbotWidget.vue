<template>
  <div class="chatbot-root">
    <button v-if="!isOpen" class="chat-fab" @click="isOpen = true">
      💬
    </button>

    <ChatWindow v-else @close="isOpen = false" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ChatWindow from './ChatWindow.vue'

const isOpen = ref(false)
</script>

<style scoped>
.chat-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background-color: #3b82f6;
  color: white;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}
</style>
