<template>
  <main class="community">
    <section class="hero">
      <div class="hero__content">
        <span class="hero__eyebrow">ANONYMOUS BOARD</span>
        <h1 class="hero__title">커뮤니티</h1>
        <p class="hero__subtitle">
          여행 정보와 후기를 자유롭게 공유하는 익명 게시판입니다.
        </p>
      </div>
      <button
        v-if="mode === 'list'"
        type="button"
        class="write-btn"
        @click="startWrite"
      >
        ✏️ 글쓰기
      </button>
      <button
        v-else
        type="button"
        class="write-btn write-btn--ghost"
        @click="goToList"
      >
        ← 목록으로
      </button>
    </section>

    <!-- 목록 -->
    <section v-if="mode === 'list'" class="board-card">
      <div v-if="posts.length === 0" class="empty-state">
        아직 등록된 글이 없습니다. 첫 글을 남겨보세요!
      </div>
      <ul v-else class="post-list">
        <li
          v-for="post in posts"
          :key="post.id"
          class="post-item"
          @click="openPost(post.id)"
        >
          <div class="post-item__main">
            <div class="post-item__badges">
              <span
                class="badge badge--main"
                :style="{ '--badge-color': mainCategoryColor(post.mainCategory) }"
              >
                {{ mainCategoryLabel(post.mainCategory) }}
              </span>
              <span class="badge badge--sub">{{ subCategoryLabel(post.subCategory) }}</span>
            </div>
            <span class="post-item__title">{{ post.title }}</span>
            <span class="post-item__meta">
              {{ post.nickname }} · {{ formatDate(post.createdAt) }} · 조회 {{ post.views }}
            </span>
          </div>
          <span class="post-item__arrow">›</span>
        </li>
      </ul>
    </section>

    <!-- 글쓰기 / 수정 -->
    <section v-else-if="mode === 'write' || mode === 'edit'" class="board-card">
      <form class="write-form" @submit.prevent="handleSubmit">
        <div class="write-form__row">
          <label class="write-form__label">
            대분류
            <select v-model="mainCategoryInput" class="write-form__select" required>
              <option value="" disabled>카테고리 선택</option>
              <option v-for="cat in BOARD_MAIN_CATEGORIES" :key="cat.key" :value="cat.key">
                {{ cat.label }}
              </option>
            </select>
          </label>

          <div class="write-form__label">
            중분류
            <div class="sub-category-group">
              <button
                v-for="sub in BOARD_SUB_CATEGORIES"
                :key="sub.key"
                type="button"
                class="sub-category-btn"
                :class="{ 'sub-category-btn--active': subCategoryInput === sub.key }"
                @click="subCategoryInput = sub.key"
              >
                {{ sub.label }}
              </button>
            </div>
          </div>
        </div>

        <label class="write-form__label">
          제목
          <input
            v-model="titleInput"
            type="text"
            class="write-form__input"
            placeholder="제목을 입력하세요"
            maxlength="80"
            required
          />
        </label>
        <label class="write-form__label">
          내용
          <textarea
            v-model="contentInput"
            class="write-form__textarea"
            rows="10"
            placeholder="내용을 입력하세요"
            required
          ></textarea>
        </label>

        <label v-if="mode === 'write'" class="write-form__label">
          비밀번호
          <input
            v-model="passwordInput"
            type="password"
            class="write-form__input"
            placeholder="글 수정/삭제 시 사용할 비밀번호 (4자 이상)"
            minlength="4"
            required
          />
        </label>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <div class="write-form__actions">
          <button type="button" class="btn btn--ghost" @click="goToList">취소</button>
          <button type="submit" class="btn btn--primary">
            {{ mode === 'edit' ? '수정 완료' : '등록' }}
          </button>
        </div>
      </form>
    </section>

    <!-- 상세 -->
    <section v-else-if="mode === 'detail' && selectedPost" class="board-card">
      <div class="detail">
        <div class="post-item__badges">
          <span
            class="badge badge--main"
            :style="{ '--badge-color': mainCategoryColor(selectedPost.mainCategory) }"
          >
            {{ mainCategoryLabel(selectedPost.mainCategory) }}
          </span>
          <span class="badge badge--sub">{{ subCategoryLabel(selectedPost.subCategory) }}</span>
        </div>
        <h2 class="detail__title">{{ selectedPost.title }}</h2>
        <div class="detail__meta">
          <span>{{ selectedPost.nickname }}</span>
          <span class="detail__dot">·</span>
          <span>{{ formatDate(selectedPost.createdAt) }}</span>
          <span class="detail__dot">·</span>
          <span>조회 {{ selectedPost.views }}</span>
          <template v-if="selectedPost.updatedAt">
            <span class="detail__dot">·</span>
            <span>(수정됨)</span>
          </template>
        </div>
        <p class="detail__content">{{ selectedPost.content }}</p>

        <div v-if="!showPasswordPrompt" class="detail__actions">
          <button type="button" class="btn btn--ghost" @click="requestAction('edit')">수정</button>
          <button type="button" class="btn btn--danger" @click="requestAction('delete')">삭제</button>
        </div>

        <div v-else class="password-prompt">
          <input
            v-model="passwordCheckInput"
            type="password"
            class="write-form__input"
            placeholder="작성 시 입력한 비밀번호를 입력하세요"
            @keyup.enter="confirmPassword"
          />
          <button type="button" class="btn btn--primary" @click="confirmPassword">확인</button>
          <button type="button" class="btn btn--ghost" @click="cancelPasswordPrompt">취소</button>
          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCommunityPosts } from '../composables/useCommunityPosts'
import { BOARD_MAIN_CATEGORIES, BOARD_SUB_CATEGORIES } from '../config/boardCategories'

const { posts, addPost, getPostById, increaseView, verifyPostPassword, updatePost, deletePost } =
  useCommunityPosts()

const mode = ref('list') // 'list' | 'write' | 'detail' | 'edit'
const titleInput = ref('')
const contentInput = ref('')
const mainCategoryInput = ref('')
const subCategoryInput = ref('')
const passwordInput = ref('')
const formError = ref('')

const selectedId = ref(null)
const showPasswordPrompt = ref(false)
const pendingAction = ref(null) // 'edit' | 'delete'
const passwordCheckInput = ref('')
const passwordError = ref('')

const selectedPost = computed(() => (selectedId.value ? getPostById(selectedId.value) : null))

function mainCategoryLabel(key) {
  return BOARD_MAIN_CATEGORIES.find((cat) => cat.key === key)?.label || '기타'
}
function mainCategoryColor(key) {
  return BOARD_MAIN_CATEGORIES.find((cat) => cat.key === key)?.color || '#9ca3af'
}
function subCategoryLabel(key) {
  return BOARD_SUB_CATEGORIES.find((cat) => cat.key === key)?.label || ''
}

function openPost(id) {
  selectedId.value = id
  increaseView(id)
  mode.value = 'detail'
}

function startWrite() {
  resetForm()
  mode.value = 'write'
}

async function handleSubmit() {
  formError.value = ''
  if (!mainCategoryInput.value) {
    formError.value = '대분류를 선택해주세요.'
    return
  }
  if (!subCategoryInput.value) {
    formError.value = '중분류를 선택해주세요.'
    return
  }
  if (!titleInput.value.trim() || !contentInput.value.trim()) {
    formError.value = '제목과 내용을 입력해주세요.'
    return
  }

  if (mode.value === 'edit') {
    updatePost(selectedId.value, {
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      mainCategory: mainCategoryInput.value,
      subCategory: subCategoryInput.value,
    })
    mode.value = 'detail'
    resetForm()
    return
  }

  if (passwordInput.value.length < 4) {
    formError.value = '비밀번호는 4자 이상 입력해주세요.'
    return
  }

  await addPost({
    title: titleInput.value.trim(),
    content: contentInput.value.trim(),
    mainCategory: mainCategoryInput.value,
    subCategory: subCategoryInput.value,
    password: passwordInput.value,
  })
  goToList()
}

function requestAction(action) {
  pendingAction.value = action
  showPasswordPrompt.value = true
  passwordCheckInput.value = ''
  passwordError.value = ''
}

function cancelPasswordPrompt() {
  showPasswordPrompt.value = false
  pendingAction.value = null
  passwordCheckInput.value = ''
  passwordError.value = ''
}

async function confirmPassword() {
  const ok = await verifyPostPassword(selectedId.value, passwordCheckInput.value)
  if (!ok) {
    passwordError.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  if (pendingAction.value === 'delete') {
    deletePost(selectedId.value)
    goToList()
    return
  }

  if (pendingAction.value === 'edit') {
    const post = selectedPost.value
    titleInput.value = post.title
    contentInput.value = post.content
    mainCategoryInput.value = post.mainCategory
    subCategoryInput.value = post.subCategory
    passwordInput.value = ''
    formError.value = ''
    showPasswordPrompt.value = false
    pendingAction.value = null
    mode.value = 'edit'
  }
}

function goToList() {
  selectedId.value = null
  resetForm()
  showPasswordPrompt.value = false
  pendingAction.value = null
  mode.value = 'list'
}

function resetForm() {
  titleInput.value = ''
  contentInput.value = ''
  mainCategoryInput.value = ''
  subCategoryInput.value = ''
  passwordInput.value = ''
  formError.value = ''
}

function formatDate(isoString) {
  const date = new Date(isoString)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.community {
  max-width: 1500px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 36px 32px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%);
  box-shadow: var(--shadow-lg);
  margin-bottom: 24px;
}

.hero__eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #bfdbfe;
  margin-bottom: 8px;
}

.hero__title {
  margin: 0 0 8px;
  font-size: 30px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.hero__subtitle {
  margin: 0;
  font-size: 14px;
  color: #dbeafe;
  max-width: 480px;
}

.write-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.15s ease, transform 0.15s ease;
}

.write-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.write-btn:active {
  transform: scale(0.96);
}

.write-btn--ghost {
  background: transparent;
}

.board-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 12px 24px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 4px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s ease;
}

.post-item:last-child {
  border-bottom: none;
}

.post-item:hover {
  background: rgba(37, 99, 235, 0.04);
}

.post-item__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.post-item__badges {
  display: flex;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.badge--main {
  background: color-mix(in srgb, var(--badge-color) 15%, white);
  color: var(--badge-color);
}

.badge--sub {
  background: #f3f4f6;
  color: #4b5563;
}

.post-item__title {
  font-size: 14.5px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-item__meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

.post-item__arrow {
  color: var(--color-text-muted);
  font-size: 18px;
}

/* 글쓰기 / 수정 폼 */
.write-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 4px;
}

.write-form__row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.write-form__label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.write-form__input,
.write-form__textarea,
.write-form__select {
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  resize: vertical;
}

.write-form__select {
  min-width: 160px;
}

.write-form__input:focus,
.write-form__textarea:focus,
.write-form__select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.sub-category-group {
  display: flex;
  gap: 6px;
}

.sub-category-btn {
  padding: 9px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sub-category-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.write-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-error {
  margin: 0;
  font-size: 12.5px;
  color: #b91c1c;
}

.btn {
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.btn--danger {
  background: #fee2e2;
  color: #b91c1c;
}

/* 상세 */
.detail {
  padding: 24px 4px 12px;
}

.detail__title {
  margin: 10px 0 8px;
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}

.detail__meta {
  font-size: 12.5px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.detail__dot {
  margin: 0 6px;
}

.detail__content {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--color-text);
  white-space: pre-wrap;
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
  min-height: 120px;
}

.detail__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.password-prompt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.password-prompt .write-form__input {
  flex: 1 1 240px;
}

.password-prompt .form-error {
  flex-basis: 100%;
  text-align: right;
}
</style>