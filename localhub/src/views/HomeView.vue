<template>
  <main class="home">
    <section class="hero">
      <div class="hero__content">
        <span class="hero__eyebrow">SEOUL TRAVEL MAP</span>
        <h1 class="hero__title">서울 여행 스팟 지도</h1>
        <p class="hero__subtitle">
          원하는 여행 스팟을 선택하고, 주변의 관광지·맛집·숙소 정보를 함께 확인해보세요.
        </p>
      </div>
      <button type="button" class="refresh-btn" @click="handleReset">
        <span class="refresh-btn__icon">↻</span>
        새로고침
      </button>
    </section>

    <section class="filter-card">
      <h2 class="filter-card__title">표시할 카테고리</h2>
      <div class="category-filter">
        <label class="category-chip category-chip--fixed">
          <input type="checkbox" checked disabled />
          <span class="category-chip__dot" style="background:#e74c3c"></span>
          여행 스팟 (필수)
        </label>

        <label
          v-for="cat in CATEGORY_CONFIG"
          :key="cat.key"
          class="category-chip"
          :class="{ 'category-chip--active': selectedCategories.includes(cat.key) }"
          :style="{ '--chip-color': cat.color }"
        >
          <input type="checkbox" :value="cat.key" v-model="selectedCategories" />
          <span class="category-chip__dot" :style="{ backgroundColor: cat.color }"></span>
          {{ cat.label }}
        </label>
      </div>
    </section>

    <section class="map-card">
      <div class="map-card__header">
        <span class="map-card__title">🗺️ 지도</span>
        <div class="map-card__legend">
          <span class="map-card__legend-item">
            <span class="map-card__legend-dot" style="background:#e74c3c"></span>
            여행 스팟
          </span>
          <span
            v-for="cat in CATEGORY_CONFIG"
            :key="cat.key"
            class="map-card__legend-item"
          >
            <span class="map-card__legend-dot" :style="{ backgroundColor: cat.color }"></span>
            {{ cat.label }}
          </span>
        </div>
      </div>

      <div class="map-card__body">
        <SeoulMap
          ref="seoulMapRef"
          class="map-card__map"
          :points="travelCourses"
          :category-data="categoryData"
          :selected-categories="selectedCategories"
          @select="handleMapSelect"
        />

        <aside class="detail-panel">
          <div v-if="!selectedDetail" class="detail-panel__empty">
            지도에서 마커를 선택하면 상세 정보가 여기에 표시됩니다.
          </div>

          <div v-else class="detail-panel__body">
            <div class="detail-panel__badges">
              <span
                v-if="selectedDetail.cat"
                class="detail-panel__badge"
                :style="{ '--badge-color': selectedDetail.cat.color }"
              >
                {{ selectedDetail.cat.label }}
              </span>
              <span v-else class="detail-panel__badge detail-panel__badge--travel">여행 스팟</span>
            </div>

            <h3 class="detail-panel__title">{{ selectedDetail.point.title }}</h3>

            <button type="button" class="detail-panel__write-btn" @click="goToWritePost">
              ✏️ 이 장소로 커뮤니티 글쓰기
            </button>

            <a
              :href="directionsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-panel__direction-btn"
            >
              🧭 카카오맵으로 길찾기
            </a>

            <template v-if="selectedDetail.cat?.key === 'festival'">
              <p v-if="selectedDetail.point.eventPlace" class="detail-panel__line">
                {{ selectedDetail.point.eventPlace }}
              </p>
              <p v-if="selectedDetail.point.addr" class="detail-panel__line">
                {{ selectedDetail.point.addr }}
              </p>
              <p
                v-if="selectedDetail.point.eventStartDate || selectedDetail.point.eventEndDate"
                class="detail-panel__line"
              >
                {{ formatEventDate(selectedDetail.point.eventStartDate) }} ~
                {{ formatEventDate(selectedDetail.point.eventEndDate) }}
              </p>
            </template>
            <p v-else-if="selectedDetail.point.addr" class="detail-panel__line">
              {{ selectedDetail.point.addr }}
            </p>

            <img
              v-if="selectedDetail.point.image"
              :src="selectedDetail.point.image"
              class="detail-panel__image"
            />

            <div class="detail-panel__toggle-group">
              <div class="detail-panel__toggle-title">가까운 장소 표시</div>
              <label v-for="cat in CATEGORY_CONFIG" :key="cat.key" class="detail-panel__toggle">
                <input type="checkbox" :value="cat.key" v-model="popupCategories" />
                <span class="detail-panel__toggle-dot" :style="{ background: cat.color }"></span>
                {{ cat.label }}
              </label>
            </div>

            <div v-for="group in nearbyGroups" :key="group.key" class="detail-panel__nearby-group">
              <div class="detail-panel__nearby-label">{{ group.label }}</div>
              <ul class="detail-panel__nearby-list">
                <li v-for="item in group.items" :key="item.id">
                  <button
                    type="button"
                    class="detail-panel__nearby-link"
                    @click="selectNearby(item)"
                  >
                    {{ item.title }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import SeoulMap from '../components/SeoulMap.vue'
import { useTravelCourses } from '../composables/useTravelCourses'
import { useRegionData } from '../composables/useRegionData'
import { CATEGORY_CONFIG } from '../config/mapCategories'
import { distanceMeters } from '../utils/geo'

const POPUP_NEARBY_COUNT = 3

const router = useRouter()
const { travelCourses } = useTravelCourses()
const { categoryData } = useRegionData()

const selectedCategories = ref(CATEGORY_CONFIG.map((cat) => cat.key))
const popupCategories = ref([]) // 기본값: 아무것도 선택되지 않음 (상세 패널에서 선택)
const seoulMapRef = ref(null)
const selectedDetail = ref(null) // { point, cat } (cat === null이면 여행코스)
const pendingLocate = ref(null) // categoryData 로딩 전에 들어온 위치 이동 요청 대기열

function handleReset() {
  selectedCategories.value = CATEGORY_CONFIG.map((cat) => cat.key)
  popupCategories.value = []
  selectedDetail.value = null
  seoulMapRef.value?.resetView()
}

function handleMapSelect({ point, cat }) {
  selectedDetail.value = { point, cat }
}

// 상세 패널의 "가까운 장소" 목록에서 클릭 시, 해당 장소를 지도에서 다시 선택
function selectNearby(item) {
  seoulMapRef.value?.locateAndOpen({ id: item.id, lat: item.lat, lng: item.lng, name: item.title })
}

// 상세 패널에서 "커뮤니티 글쓰기"로 이동 (대분류/제목 자동 입력)
function goToWritePost() {
  if (!selectedDetail.value) return

  router.push({
    name: 'community',
    query: {
      write: '1',
      mainCategory: selectedDetail.value.cat ? selectedDetail.value.cat.key : 'travel',
      title: selectedDetail.value.point.title,
    },
  })
}

// 상세 패널에서 선택된 장소를 목적지로 하는 카카오맵 길찾기 링크
// (출발지는 지정하지 않으므로 카카오맵/앱이 사용자의 현재 위치를 출발지로 사용)
const directionsUrl = computed(() => {
  if (!selectedDetail.value) return '#'
  const { title, lat, lng } = selectedDetail.value.point
  if (lat == null || lng == null) return '#'
  return `https://map.kakao.com/link/to/${encodeURIComponent(title || '목적지')},${lat},${lng}`
})

const nearbyGroups = computed(() => {
  if (!selectedDetail.value) return []
  const point = selectedDetail.value.point

  return CATEGORY_CONFIG.filter((cat) => popupCategories.value.includes(cat.key))
    .map((cat) => {
      const points = categoryData.value[cat.key] || []
      const nearest = points
        .filter((p) => p.id !== point.id)
        .map((p) => ({ ...p, dist: distanceMeters([point.lat, point.lng], [p.lat, p.lng]) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, POPUP_NEARBY_COUNT)
      return { key: cat.key, label: cat.label, items: nearest }
    })
    .filter((group) => group.items.length > 0)
})

// YYYYMMDD 문자열을 YYYY.MM.DD 형식으로 변환
function formatEventDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr || ''
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`
}

// categoryData가 아직 로딩 중이면 false를 반환하고, 준비된 경우에만 실제로 지도 이동을 수행한다
function tryLocate(detail) {
  if (!seoulMapRef.value) return false
  if (Object.keys(categoryData.value).length === 0) return false

  seoulMapRef.value.locateAndOpen({
    id: detail.id,
    lat: detail.lat,
    lng: detail.lng,
    name: detail.name,
  })
  return true
}

// 챗봇/캘린더가 보낸 locate-on-map 이벤트 처리기
function onLocateEvent(e) {
  const d = e?.detail || {}
  if (!d || d.lat == null || d.lng == null) return

  if (!tryLocate(d)) {
    // 지도 컴포넌트나 카테고리 데이터가 아직 준비되지 않은 경우, 준비되는 대로 다시 시도
    pendingLocate.value = d
  }
}

// categoryData 로딩이 끝나면(그리고 SeoulMap의 props가 실제로 갱신된 뒤에) 대기 중인 위치 이동 요청을 다시 처리
watch(
  categoryData,
  () => {
    if (pendingLocate.value && tryLocate(pendingLocate.value)) {
      pendingLocate.value = null
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  window.addEventListener('locate-on-map', onLocateEvent)
})

onBeforeUnmount(() => {
  window.removeEventListener('locate-on-map', onLocateEvent)
})
</script>

<style scoped>
.home {
  max-width: 1500px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

/* 히어로 배너 */
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

.refresh-btn {
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

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.refresh-btn:active {
  transform: scale(0.96);
}

.refresh-btn__icon {
  display: inline-block;
  transition: transform 0.3s ease;
}

.refresh-btn:hover .refresh-btn__icon {
  transform: rotate(180deg);
}

/* 카드 공통 */
.filter-card,
.map-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  transition: box-shadow 0.2s ease;
}

.filter-card {
  padding: 22px 24px;
}

.filter-card:hover {
  box-shadow: var(--shadow-md);
}

.filter-card__title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  background: #f9fafb;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.category-chip:hover {
  border-color: #9ca3af;
}

.category-chip--active {
  border-color: var(--chip-color, var(--color-primary));
  background: color-mix(in srgb, var(--chip-color, var(--color-primary)) 14%, white);
  color: #111827;
  font-weight: 700;
}

.category-chip--fixed {
  opacity: 0.8;
  cursor: not-allowed;
  border-color: #e74c3c;
  background: color-mix(in srgb, #e74c3c 12%, white);
  font-weight: 700;
}

.category-chip__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 지도 카드 */
.map-card {
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.map-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
  background: #fafafa;
}

.map-card__title {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}

.map-card__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.map-card__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.map-card__legend-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

/* 지도 + 상세 패널 레이아웃 */
.map-card__body {
  display: grid;
  grid-template-columns: 1fr 320px;
}

@media (max-width: 860px) {
  .map-card__body {
    grid-template-columns: 1fr;
  }
}

.map-card__map {
  min-width: 0;
}

/* 상세 정보 패널 */
.detail-panel {
  border-left: 1px solid var(--color-border);
  background: #fafafa;
  max-height: 1000px;
  overflow-y: auto;
  padding: 20px;
}

@media (max-width: 860px) {
  .detail-panel {
    border-left: none;
    border-top: 1px solid var(--color-border);
    max-height: 420px;
  }
}

.detail-panel__empty {
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.6;
  padding: 12px 0;
}

.detail-panel__badges {
  margin-bottom: 8px;
}

.detail-panel__badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: color-mix(in srgb, var(--badge-color) 15%, white);
  color: var(--badge-color);
}

.detail-panel__badge--travel {
  background: color-mix(in srgb, #e74c3c 15%, white);
  color: #e74c3c;
}

.detail-panel__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 800;
  color: #111827;
  line-height: 1.4;
}

.detail-panel__write-btn {
  display: block;
  width: 100%;
  margin: 4px 0 12px;
  padding: 8px 12px;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-primary) 8%, white);
  color: var(--color-primary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s ease;
}

.detail-panel__write-btn:hover {
  background: color-mix(in srgb, var(--color-primary) 15%, white);
}

.detail-panel__direction-btn {
  display: block;
  width: 100%;
  margin: 0 0 12px;
  padding: 8px 12px;
  border: 1px solid #f4c800;
  border-radius: 8px;
  background: #fee500;
  color: #191919;
  font-size: 12.5px;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.detail-panel__direction-btn:hover {
  background: #fddc00;
}

.detail-panel__line {
  margin: 0 0 4px;
  font-size: 12.5px;
  color: #374151;
  line-height: 1.5;
}

.detail-panel__image {
  display: block;
  width: 100%;
  margin-top: 10px;
  border-radius: 8px;
}

.detail-panel__toggle-group {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-panel__toggle-title {
  width: 100%;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 2px;
}

.detail-panel__toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
}

.detail-panel__toggle-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.detail-panel__nearby-group {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.detail-panel__nearby-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 6px;
}

.detail-panel__nearby-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-panel__nearby-link {
  border: none;
  background: none;
  padding: 0;
  font-size: 12.5px;
  color: var(--color-primary);
  cursor: pointer;
  text-align: left;
}

.detail-panel__nearby-link:hover {
  text-decoration: underline;
}
</style>