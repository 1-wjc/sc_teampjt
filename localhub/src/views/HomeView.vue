<template>
  <main class="home">
    <section class="home__intro">
      <div class="home__intro-row">
        <div>
          <h1 class="home__title">서울 여행코스 지도</h1>
          <p class="home__subtitle">
            원하는 여행코스를 선택하고, 주변의 관광지·맛집·숙소 정보를 함께 확인해보세요.
          </p>
        </div>
        <button type="button" class="refresh-btn" @click="handleReset">
          ↻ 새로고침
        </button>
      </div>
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
        >
          <input type="checkbox" :value="cat.key" v-model="selectedCategories" />
          <span class="category-chip__dot" :style="{ backgroundColor: cat.color }"></span>
          {{ cat.label }}
        </label>
      </div>
    </section>

    <section class="map-card">
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.home__intro {
  margin-bottom: 24px;
}

.home__intro-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.home__title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.home__subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.refresh-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.refresh-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.filter-card,
.map-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  padding: 20px;
  margin-bottom: 20px;
}

.filter-card__title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #374151;
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  background: #f9fafb;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.category-chip:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.category-chip--fixed {
  opacity: 0.7;
  cursor: not-allowed;
}

.category-chip__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.map-card {
  padding: 0;
  overflow: hidden;
}
</style>