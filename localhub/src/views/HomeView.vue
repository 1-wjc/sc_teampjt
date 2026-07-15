<template>
  <main class="home">
    <section class="hero">
      <div class="hero__content">
        <span class="hero__eyebrow">SEOUL TRAVEL MAP</span>
        <h1 class="hero__title">서울 여행코스 지도</h1>
        <p class="hero__subtitle">
          원하는 여행코스를 선택하고, 주변의 관광지·맛집·숙소 정보를 함께 확인해보세요.
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
          여행코스 (필수)
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
            여행코스
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

      <SeoulMap
        ref="seoulMapRef"
        :points="travelCourses"
        :category-data="categoryData"
        :selected-categories="selectedCategories"
        v-model:popup-categories="popupCategories"
      />
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import SeoulMap from '../components/SeoulMap.vue'
import { useTravelCourses } from '../composables/useTravelCourses'
import { useRegionData } from '../composables/useRegionData'
import { CATEGORY_CONFIG } from '../config/mapCategories'

const { travelCourses } = useTravelCourses()
const { categoryData } = useRegionData()

const selectedCategories = ref(CATEGORY_CONFIG.map((cat) => cat.key))
const popupCategories = ref([]) // 기본값: 아무것도 선택되지 않음 (여행코스 팝업 내부에서 선택)
const seoulMapRef = ref(null)

function handleReset() {
  selectedCategories.value = CATEGORY_CONFIG.map((cat) => cat.key)
  popupCategories.value = []
  seoulMapRef.value?.resetView()
}
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
</style>