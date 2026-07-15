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
        <!-- 일반 텍스트 메시지 -->
        <div v-if="msg.type === 'text'">{{ msg.text }}</div>

        <!-- 결과 카드 목록 -->
        <div v-else-if="msg.type === 'results'" class="result-list">
          <div class="result-intro">{{ msg.text }}</div>
          <div
            v-for="(item, idx) in msg.items"
            :key="idx"
            class="result-card"
          >
            <img
              v-if="item.image"
              :src="item.image"
              class="result-image"
              alt=""
            />
            <div v-else class="result-image result-image--empty">
              이미지 없음
            </div>
            <div class="result-info">
              <div class="result-title">{{ item.name }}</div>
              <div class="result-addr">{{ item.addr || '주소 정보 없음' }}</div>
            </div>
          </div>
        </div>
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
import { buildContext } from '../../utils/chatbotContext.js'

defineEmits(['close'])

const messages = ref([
  {
    id: 1,
    role: 'bot',
    type: 'text',
    text: '안녕하세요! 서울 지역정보 챗봇입니다. 무엇을 도와드릴까요?',
  },
])
const inputText = ref('')
const isLoading = ref(false)
const bodyRef = ref(null)

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return

  messages.value.push({
    id: Date.now(),
    role: 'user',
    type: 'text',
    text,
  })
  inputText.value = ''
  await scrollToBottom()

  isLoading.value = true

  const context = await buildContext(text)
  console.log('분류된 의도:', context.intent)
  console.log('추출된 지역:', context.district)
  console.log('필터링된 데이터:', context.items)

  if (context.items.length === 0) {
    messages.value.push({
      id: Date.now() + 1,
      role: 'bot',
      type: 'text',
      text: '관련된 정보를 찾지 못했어요. 다른 키워드로 질문해보세요.',
    })
  } else {
    messages.value.push({
      id: Date.now() + 1,
      role: 'bot',
      type: 'results',
      text: `[${context.intent}] 관련해서 이런 곳들을 찾았어요.`,
      items: context.items.slice(0, 5),
    })
  }

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
  flex-shrink: 0;
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
  max-width: 90%;
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

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-intro {
  font-size: 13px;
  color: #555;
  margin-bottom: 2px;
}

.result-card {
  display: flex;
  gap: 8px;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px;
}

.result-image {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background-color: #eee;
}

.result-image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #999;
  text-align: center;
}

.result-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.result-title {
  font-size: 13px;
  font-weight: bold;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-addr {
  font-size: 12px;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-input {
  display: flex;
  border-top: 1px solid #eee;
  padding: 8px;
  gap: 8px;
  flex-shrink: 0;
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

/* ===== 모바일 대응: 화면 너비 768px 이하일 때 전체화면으로 전환 ===== */
@media (max-width: 768px) {
  .chat-window {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .result-image {
    width: 64px;
    height: 64px;
  }
}
</style>
