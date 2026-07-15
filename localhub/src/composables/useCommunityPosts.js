import { ref, watch } from 'vue'
import { hashPassword, verifyPassword as checkPassword } from '../utils/passwordHash'

const STORAGE_KEY = 'localhub_community_posts'
const LIKED_STORAGE_KEY = 'localhub_liked_post_ids'
const DUMMY_PASSWORD = '1234'

function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    // 기존에 저장된 글에 likes/comments 필드가 없을 수 있으므로 기본값으로 보정
    return parsed.map((post) => ({
      likes: 0,
      comments: [],
      ...post,
    }))
  } catch (e) {
    console.error('게시글 데이터를 불러오지 못했습니다.', e)
    return []
  }
}

function loadLikedIds() {
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch (e) {
    console.error('좋아요 정보를 불러오지 못했습니다.', e)
    return new Set()
  }
}

const posts = ref(loadPosts())
const likedPostIds = ref(loadLikedIds())

watch(
  posts,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

watch(
  likedPostIds,
  (value) => {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...value]))
  },
  { deep: true },
)

function randomNickname() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `익명${num}`
}

const DUMMY_POSTS_SEED = [
  { mainCategory: 'travel', subCategory: 'review', title: '경복궁~북촌 여행코스 다녀왔어요 (사진有)', content: '경복궁부터 북촌한옥마을까지 걸어서 도는 코스로 다녀왔는데 반나절 코스로 딱 좋았어요. 한복 대여하면 경복궁 무료 입장도 되니 참고하세요!', hoursAgo: 2, views: 128 },
  { mainCategory: 'attraction', subCategory: 'question', title: '남산타워 야경 몇시가 제일 예쁜가요?', content: '이번 주말에 남산타워 가려고 하는데 야경 보기 가장 좋은 시간대 아시는 분 계신가요? 일몰 직후가 좋다는 얘기는 들었는데 정확히 몇 시쯤인지 궁금합니다.', hoursAgo: 5, views: 64 },
  { mainCategory: 'leisure', subCategory: 'info', title: '한강공원 자전거 대여소 위치 정리', content: '여의도, 뚝섬, 반포 한강공원 자전거 대여소 위치와 요금 정리해봤습니다. 1시간 기준 3천원대이고 주말엔 대기가 좀 있는 편이에요.', hoursAgo: 8, views: 210 },
  { mainCategory: 'culture', subCategory: 'review', title: '국립중앙박물관 특별전 후기', content: '이번 특별전 정말 볼만했습니다. 평일 오후에 갔더니 사람도 적당하고 오디오 가이드 대여하니 이해하기 훨씬 편했어요.', hoursAgo: 12, views: 95 },
  { mainCategory: 'shopping', subCategory: 'free', title: '명동에서 쇼핑하고 왔어요 (잡담)', content: '오랜만에 명동 갔는데 관광객이 정말 많더라구요. 화장품 사려고 갔다가 길거리 음식만 잔뜩 먹고 왔습니다 ㅋㅋ', hoursAgo: 15, views: 40 },
  { mainCategory: 'lodging', subCategory: 'question', title: '홍대 근처 가성비 숙소 추천 부탁드려요', content: '다음 달에 친구랑 2박 예정인데 홍대입구역 도보 10분 이내 가성비 좋은 숙소 추천해주실 분 계신가요?', hoursAgo: 18, views: 180 },
  { mainCategory: 'festival', subCategory: 'info', title: '이번 주말 여의도 불꽃축제 일정 안내', content: '이번 주말 여의도 한강공원에서 불꽃축제가 열립니다. 오후 7시부터 자리 잡는 분들이 많으니 일찍 가시는 걸 추천드려요.', hoursAgo: 20, views: 320 },
  { mainCategory: 'travel', subCategory: 'question', title: '하루코스로 종로~인사동 어떤가요?', content: '하루만 서울에 머무는데 종로에서 인사동까지 도보로 묶어서 도는 코스 괜찮을까요? 다른 추천 코스 있으면 알려주세요.', hoursAgo: 24, views: 55 },
  { mainCategory: 'attraction', subCategory: 'review', title: '창덕궁 후원 예약 후기 (꿀팁 포함)', content: '창덕궁 후원은 사전 예약 필수인데 홈페이지에서 오전 9시에 오픈되니 미리 대기하시는 걸 추천합니다. 가이드 투어라 사진 찍을 시간이 조금 짧아요.', hoursAgo: 28, views: 142 },
  { mainCategory: 'leisure', subCategory: 'question', title: '서울숲 러닝코스 아시는 분?', content: '서울숲에서 5km 정도 러닝하기 좋은 코스 있을까요? 그늘이 있는 코스면 더 좋을 것 같아요.', hoursAgo: 30, views: 33 },
  { mainCategory: 'culture', subCategory: 'free', title: '미술관 도장깨기 하는 중 ㅎㅎ', content: '요즘 주말마다 서울 시내 미술관 하나씩 도장깨기 하고 있는데 다음 주엔 어디 갈지 고민 중입니다.', hoursAgo: 34, views: 22 },
  { mainCategory: 'shopping', subCategory: 'info', title: '동대문 도매시장 이용 꿀팁 정리', content: '동대문 도매시장은 새벽 시간대가 가장 물건이 많다고 해요. 주차는 근처 공영주차장 이용하시는 게 편합니다.', hoursAgo: 36, views: 265 },
  { mainCategory: 'lodging', subCategory: 'review', title: '강남 게스트하우스 숙박 후기', content: '가격 대비 시설이 깔끔했고 직원분들도 친절하셨어요. 다만 방음이 조금 아쉬웠습니다.', hoursAgo: 40, views: 88 },
  { mainCategory: 'festival', subCategory: 'question', title: '서울 벚꽃축제 언제쯤 절정일까요?', content: '내년 봄에 맞춰서 여행 계획 중인데 여의도 벚꽃축제 절정 시기가 보통 언제쯤인가요?', hoursAgo: 44, views: 190 },
  { mainCategory: 'travel', subCategory: 'info', title: '서울 무료 여행코스 5가지 정리', content: '입장료 없이 즐길 수 있는 서울 여행코스 5곳 정리했습니다. 청계천, 서울숲, 북촌한옥마을 등이 포함되어 있어요.', hoursAgo: 48, views: 410 },
  { mainCategory: 'attraction', subCategory: 'free', title: '오늘 광화문 걷다가 든 생각', content: '오늘 광화문 광장을 걷는데 날씨가 너무 좋아서 그냥 잡담 남겨봅니다. 서울도 걷기 좋은 도시인 것 같아요.', hoursAgo: 52, views: 18 },
  { mainCategory: 'leisure', subCategory: 'review', title: '잠실 롯데월드 후기 (놀이기구 대기시간)', content: '평일 오전에 갔는데도 인기 놀이기구는 대기시간이 꽤 있었어요. 매직패스 구매하니 훨씬 여유롭게 즐길 수 있었습니다.', hoursAgo: 56, views: 120 },
  { mainCategory: 'culture', subCategory: 'question', title: '예술의전당 공연 예매 어디서 하나요?', content: '예술의전당에서 하는 공연 예매하려고 하는데 공식 사이트 말고 다른 예매처도 있나요?', hoursAgo: 60, views: 70 },
  { mainCategory: 'shopping', subCategory: 'review', title: '성수동 팝업스토어 다녀온 후기', content: '요즘 핫하다는 성수동 팝업스토어 다녀왔는데 대기줄이 정말 길었어요. 그래도 볼거리는 확실했습니다.', hoursAgo: 64, views: 155 },
  { mainCategory: 'lodging', subCategory: 'info', title: '서울 시티뷰 좋은 호텔 리스트', content: '한강뷰, 남산뷰가 보이는 호텔들 가격대별로 정리해봤습니다. 기념일 여행 준비하시는 분들께 도움 되면 좋겠어요.', hoursAgo: 68, views: 230 },
  { mainCategory: 'festival', subCategory: 'review', title: '한강 불빛축제 다녀왔습니다', content: '조명 설치물이 정말 예뻤어요. 다만 사람이 너무 많아서 사진 찍기가 조금 힘들었습니다.', hoursAgo: 72, views: 99 },
  { mainCategory: 'travel', subCategory: 'free', title: '혼자 서울 여행 며칠째 중', content: '나홀로 여행 3일차인데 생각보다 심심하지 않고 재밌네요. 내일은 어디로 갈지 추천 받습니다.', hoursAgo: 76, views: 45 },
  { mainCategory: 'attraction', subCategory: 'info', title: '서울 전망 좋은 곳 모음.zip', content: '남산타워 외에도 전망 좋은 무료 스팟들 정리했습니다. 낙산공원, 하늘공원 등이 대표적이에요.', hoursAgo: 80, views: 301 },
  { mainCategory: 'leisure', subCategory: 'free', title: '주말에 뭐 타러 갈지 고민중', content: '이번 주말에 액티비티 하나 하고 싶은데 아직 정하지 못했어요. 다들 요즘 뭐 하시나요?', hoursAgo: 84, views: 12 },
  { mainCategory: 'culture', subCategory: 'info', title: '서울 무료 전시회 정리 (이번 달)', content: '이번 달에 무료로 볼 수 있는 전시회 목록 정리했습니다. 평일에는 사람도 적어서 여유롭게 관람 가능해요.', hoursAgo: 88, views: 180 },
  { mainCategory: 'shopping', subCategory: 'question', title: '홍대 편집샵 어디가 유명한가요?', content: '홍대 근처에서 옷 구경하기 좋은 편집샵 추천 부탁드립니다. 캐주얼한 스타일 위주로 찾고 있어요.', hoursAgo: 92, views: 60 },
  { mainCategory: 'lodging', subCategory: 'free', title: '숙소 체크인 시간 기다리는 중', content: '체크인까지 시간이 좀 남아서 근처 카페에서 시간 때우는 중입니다. 다들 여행 잘 다니고 계신가요?', hoursAgo: 96, views: 9 },
  { mainCategory: 'festival', subCategory: 'free', title: '축제 인파 실화냐;;', content: '축제 구경 갔다가 사람에 치여서 힘들었네요. 그래도 분위기는 정말 좋았습니다.', hoursAgo: 100, views: 25 },
  { mainCategory: 'travel', subCategory: 'review', title: '2박3일 서울 여행코스 후기 총정리', content: '2박3일 동안 다녀온 코스 총정리했습니다. 첫날은 고궁 위주, 둘째날은 쇼핑, 셋째날은 한강으로 마무리했어요.', hoursAgo: 104, views: 512 },
  { mainCategory: 'attraction', subCategory: 'question', title: '비오는 날 가기 좋은 실내 관광지 있나요?', content: '이번 주 내내 비 소식이 있는데 실내에서 즐길 수 있는 관광지 추천 부탁드립니다.', hoursAgo: 108, views: 77 },
]

async function seedDummyPostsIfEmpty() {
  if (posts.value.length > 0) return

  const passwordHash = await hashPassword(DUMMY_PASSWORD)
  const now = Date.now()

  posts.value = DUMMY_POSTS_SEED.map((item, index) => ({
    id: now - index,
    nickname: randomNickname(),
    title: item.title,
    content: item.content,
    mainCategory: item.mainCategory,
    subCategory: item.subCategory,
    passwordHash,
    createdAt: new Date(now - item.hoursAgo * 60 * 60 * 1000).toISOString(),
    updatedAt: null,
    views: item.views,
    likes: Math.floor(item.views / 8),
    comments: [],
  }))
}

seedDummyPostsIfEmpty()

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
      likes: 0,
      comments: [],
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

  function isLiked(id) {
    return likedPostIds.value.has(Number(id))
  }

  function toggleLike(id) {
    const post = getPostById(id)
    if (!post) return

    const numId = Number(id)
    const nextLiked = new Set(likedPostIds.value)

    if (nextLiked.has(numId)) {
      nextLiked.delete(numId)
      post.likes = Math.max(0, (post.likes || 0) - 1)
    } else {
      nextLiked.add(numId)
      post.likes = (post.likes || 0) + 1
    }

    likedPostIds.value = nextLiked
  }

  function getComment(postId, commentId) {
    const post = getPostById(postId)
    if (!post || !post.comments) return null
    return post.comments.find((c) => c.id === Number(commentId)) || null
  }

  async function addComment(postId, content, password) {
    const post = getPostById(postId)
    if (!post) return
    if (!post.comments) post.comments = []

    const passwordHash = await hashPassword(password)

    post.comments.push({
      id: Date.now(),
      nickname: randomNickname(),
      content,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
  }

  async function verifyCommentPassword(postId, commentId, password) {
    const comment = getComment(postId, commentId)
    if (!comment || !comment.passwordHash) return false
    return checkPassword(password, comment.passwordHash)
  }

  function updateComment(postId, commentId, content) {
    const comment = getComment(postId, commentId)
    if (!comment) return
    comment.content = content
    comment.updatedAt = new Date().toISOString()
  }

  function deleteComment(postId, commentId) {
    const post = getPostById(postId)
    if (!post || !post.comments) return
    post.comments = post.comments.filter((c) => c.id !== Number(commentId))
  }

  return {
    posts,
    addPost,
    getPostById,
    increaseView,
    verifyPostPassword,
    updatePost,
    deletePost,
    isLiked,
    toggleLike,
    addComment,
    verifyCommentPassword,
    updateComment,
    deleteComment,
  }
}