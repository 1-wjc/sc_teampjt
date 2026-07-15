<template>
  <div class="chat-window">
    <div class="chat-header">
      <span>LocalHub 챗봇</span>
      <button class="chat-close" @click="$emit('close')">✕</button>
    </div>

    <div class="chat-body" ref="bodyRef">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="chat-message"
        :class="msg.role === 'user' ? 'chat-message--user' : 'chat-message--bot'"
      >
        {{ msg.text }}
      </div>
      <div v-if="isLoading" class="chat-message chat-message--bot">
        답변 작성 중...
      </div>
    </div>

    <div class="chat-input">
      <input
        v-model="inputText"
        type="text"
        placeholder="메시지를 입력하세요"
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">전송</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

defineEmits(['close'])

const messages = ref([
  { id: 1, role: 'bot', text: '안녕하세요! 서울 지역정보 챗봇입니다. 무엇을 도와드릴까요?' },
])
const inputText = ref('')
const isLoading = ref(false)
const bodyRef = ref(null)

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return

  // 사용자 메시지 추가
  messages.value.push({ id: Date.now(), role: 'user', text })
  inputText.value = ''
  await scrollToBottom()

  // 지금은 가짜 응답 (나중에 실제 OpenAI 호출로 교체 예정)
  isLoading.value = true
  await new Promise((resolve) => setTimeout(resolve, 800)) // 로딩 느낌 확인용 딜레이

  const fakeReply = `"${text}"에 대한 답변입니다. (아직 목업 응답이에요)`
  messages.value.push({ id: Date.now() + 1, role: 'bot', text: fakeReply })
  isLoading.value = false
  await scrollToBottom()
}

async function scrollToBottom() {
  await nextTick()
  if (bodyRef.value) {
    bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  }
}
</script>

<style scoped>
.chat-window {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 360px;
  height: 480px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
}

.chat-header {
  background-color: #3b82f6;
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.chat-close {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

.chat-body {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-message {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.chat-message--bot {
  align-self: flex-start;
  background-color: #f1f5f9;
  color: #333;
}

.chat-message--user {
  align-self: flex-end;
  background-color: #3b82f6;
  color: white;
}

.chat-input {
  display: flex;
  border-top: 1px solid #eee;
  padding: 8px;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
}

.chat-input button {
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
}
</style>