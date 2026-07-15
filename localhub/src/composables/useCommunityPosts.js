import { ref, watch } from 'vue'
import { hashPassword, verifyPassword as checkPassword } from '../utils/passwordHash'

const STORAGE_KEY = 'localhub_community_posts'

function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('게시글 데이터를 불러오지 못했습니다.', e)
    return []
  }
}

const posts = ref(loadPosts())

watch(
  posts,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

function randomNickname() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `익명${num}`
}

export function useCommunityPosts() {
  async function addPost({ title, content, mainCategory, subCategory, password }) {
    const passwordHash = await hashPassword(password)
    const newPost = {
      id: Date.now(),
      nickname: randomNickname(),
      title,
      content,
      mainCategory,
      subCategory,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      views: 0,
    }
    posts.value = [newPost, ...posts.value]
    return newPost
  }

  function getPostById(id) {
    return posts.value.find((post) => post.id === Number(id)) || null
  }

  function increaseView(id) {
    const post = getPostById(id)
    if (post) post.views += 1
  }

  async function verifyPostPassword(id, password) {
    const post = getPostById(id)
    if (!post) return false
    return checkPassword(password, post.passwordHash)
  }

  function updatePost(id, { title, content, mainCategory, subCategory }) {
    const post = getPostById(id)
    if (!post) return
    post.title = title
    post.content = content
    post.mainCategory = mainCategory
    post.subCategory = subCategory
    post.updatedAt = new Date().toISOString()
  }

  function deletePost(id) {
    posts.value = posts.value.filter((post) => post.id !== Number(id))
  }

  return {
    posts,
    addPost,
    getPostById,
    increaseView,
    verifyPostPassword,
    updatePost,
    deletePost,
  }
}