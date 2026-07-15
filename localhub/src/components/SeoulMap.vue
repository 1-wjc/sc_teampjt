<template>
  <div ref="mapEl" class="seoul-map"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import { CATEGORY_CONFIG } from '../config/mapCategories'
import { distanceMeters } from '../utils/geo'

// 모든 팝업에 공통 적용: 지도 밖으로 넘치지 않도록 autoPan 여백 + 최대 높이(스크롤) 설정
L.Popup.mergeOptions({
  autoPan: true,
  autoPanPadding: [20, 20],
  maxHeight: 320,
})

const props = defineProps({
  points: { type: Array, default: () => [] },           // 여행코스(빨간 핀)
  categoryData: { type: Object, default: () => ({}) },   // 기타 마커(나머지 카테고리)
  selectedCategories: { type: Array, default: () => [] }, // 지도에 표시할 카테고리 key 목록
  popupCategories: { type: Array, default: () => [] },    // 여행코스 팝업에 "가까운 기타 마커" 표시할 카테고리 key 목록
})

const emit = defineEmits(['update:popupCategories'])

const mapEl = ref(null)
let map = null
let travelLayer = null
let nearbyLayer = null
let travelMarkers = [] // { marker, point } — popupCategories 변경 시 팝업만 갱신하기 위해 보관
let resizeObserver = null // ✅ 반응형 크기 변화 감지용

const SEOUL_CENTER = [37.5665, 126.978]
const ZOOM_STEP = 3
const MAX_ZOOM = 18
const POPUP_NEARBY_COUNT = 3

let baseZoom = null        // 초기 fitBounds 직후의 기준 줌 레벨
let initialBounds = null   // 초기 화면(전체 여행코스가 보이는 범위) - 새로고침 시 복귀용
let isDetailView = false   // 현재 마커 클릭으로 확대되어 기타 마커가 보이는 "상세보기" 상태인지 여부

const redPinIcon = L.divIcon({
  className: 'red-pin-icon',
  html: `
    <svg width="18" height="26" viewBox="0 0 18 26" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 0C4 0 0 4 0 9c0 6.5 9 17 9 17s9-10.5 9-17c0-5-4-9-9-9z" fill="#e74c3c" stroke="#a83226" stroke-width="1"/>
      <circle cx="9" cy="9" r="3.2" fill="#ffffff"/>
    </svg>
  `,
  iconSize: [18, 26],
  iconAnchor: [9, 26],
  popupAnchor: [0, -24],
})

// 카테고리별 핀 아이콘 생성 (색상별로 캐싱)
const pinIconCache = {}
function createCategoryPinIcon(color) {
  if (pinIconCache[color]) return pinIconCache[color]

  const icon = L.divIcon({
    className: 'category-pin-icon',
    html: `
      <svg width="15" height="22" viewBox="0 0 18 26" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 0C4 0 0 4 0 9c0 6.5 9 17 9 17s9-10.5 9-17c0-5-4-9-9-9z" fill="${color}" stroke="#333333" stroke-width="1"/>
        <circle cx="9" cy="9" r="3" fill="#ffffff"/>
      </svg>
    `,
    iconSize: [15, 22],
    iconAnchor: [7.5, 22],
    popupAnchor: [0, -20],
  })

  pinIconCache[color] = icon
  return icon
}

// 여행코스 지점 기준, 선택된 카테고리별 "가장 가까운 기타 마커" 제목 목록 계산
function getNearestTitlesByCategory(point) {
  return CATEGORY_CONFIG.filter((cat) => props.popupCategories.includes(cat.key))
    .map((cat) => {
      const points = props.categoryData[cat.key] || []
      const nearest = points
        .map((p) => ({ title: p.title, dist: distanceMeters([point.lat, point.lng], [p.lat, p.lng]) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, POPUP_NEARBY_COUNT)
      return { label: cat.label, titles: nearest.map((p) => p.title) }
    })
    .filter((group) => group.titles.length > 0)
}

// 여행코스 팝업 HTML 생성 (제목 + 이미지 + 팝업 내부 카테고리 체크박스 + 가까운 제목 목록)
function buildTravelPopupHtml(point) {
  const nearestGroups = getNearestTitlesByCategory(point)

  const nearestHtml = nearestGroups
    .map(
      (group) => `
        <div class="popup-nearby-group">
          <span class="popup-nearby-group__label">${group.label}</span>
          <ul class="popup-nearby-group__list">
            ${group.titles.map((title) => `<li>${title}</li>`).join('')}
          </ul>
        </div>
      `,
    )
    .join('')

  const toggleHtml = CATEGORY_CONFIG.map(
    (cat) => `
      <label class="popup-toggle">
        <input
          type="checkbox"
          class="popup-toggle-checkbox"
          data-cat="${cat.key}"
          ${props.popupCategories.includes(cat.key) ? 'checked' : ''}
        />
        <span class="popup-toggle__dot" style="background:${cat.color}"></span>
        ${cat.label}
      </label>
    `,
  ).join('')

  return `
    <div class="popup-content travel-popup-content">
      <strong>${point.title}</strong>
      ${point.image ? `<img src="${point.image}" class="popup-content__image" />` : ''}
      <div class="popup-toggle-group">
        <div class="popup-toggle-group__title">가까운 장소 표시</div>
        ${toggleHtml}
      </div>
      ${nearestHtml}
    </div>
  `
}

// 기타 마커 팝업 HTML 생성 (여행코스와 동일한 형식: 제목 + 이미지)
function buildCategoryPopupHtml(point, cat) {
  return `
    <div class="popup-content">
      <strong>${point.title}</strong><br/>[${cat.label}]
      ${point.image ? `<img src="${point.image}" class="popup-content__image" />` : ''}
      ${point.addr ? `<br/>${point.addr}` : ''}
    </div>
  `
}

// 팝업 내부 체크박스 클릭 처리 (이벤트 위임 - popupPane에 한 번만 등록)
function handlePopupToggleChange(e) {
  const target = e.target
  if (!target.classList || !target.classList.contains('popup-toggle-checkbox')) return

  const key = target.dataset.cat
  const checked = target.checked
  const next = checked
    ? [...props.popupCategories, key]
    : props.popupCategories.filter((k) => k !== key)

  emit('update:popupCategories', next)
}

onMounted(() => {
  map = L.map(mapEl.value).setView(SEOUL_CENTER, 11)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  travelLayer = L.layerGroup().addTo(map)
  nearbyLayer = L.layerGroup().addTo(map)
  renderTravelMarkers()

  // 팝업 내부 체크박스 변경 감지 (이벤트 위임: 팝업 내용이 재생성돼도 계속 동작)
  map.getPane('popupPane').addEventListener('change', handlePopupToggleChange)

  // 드래그(팬) / 줌이 끝날 때마다 실행
  map.on('moveend', () => {
    if (!isDetailView) return

    if (map.getZoom() < baseZoom + ZOOM_STEP) {
      nearbyLayer.clearLayers()
      isDetailView = false
    } else {
      renderNearby()
    }
  })

  // ✅ 지도 컨테이너 크기가 반응형으로 바뀔 때마다 Leaflet에 알려줌 (타일 깨짐 방지)
  resizeObserver = new ResizeObserver(() => {
    map?.invalidateSize()
  })
  resizeObserver.observe(mapEl.value)
})

watch(() => props.points, renderTravelMarkers)

watch(
  () => props.selectedCategories,
  () => {
    if (isDetailView) renderNearby()
  },
  { deep: true },
)

// popupCategories가 바뀌면(팝업 내부 체크박스 클릭 포함) 지도는 그대로 두고 팝업 내용만 갱신
watch(
  () => props.popupCategories,
  () => {
    travelMarkers.forEach(({ marker, point }) => {
      marker.setPopupContent(buildTravelPopupHtml(point))
    })
  },
  { deep: true },
)

function renderTravelMarkers() {
  if (!travelLayer || !map) return
  travelLayer.clearLayers()
  travelMarkers = []
  if (props.points.length === 0) return

  const latLngs = []

  props.points.forEach((p) => {
    const latLng = [p.lat, p.lng]
    latLngs.push(latLng)

    const marker = L.marker(latLng, { icon: redPinIcon })
      .bindPopup(buildTravelPopupHtml(p), { minWidth: 160, maxWidth: 300 })
      .on('click', () => onTravelMarkerClick(p))
      .addTo(travelLayer)

    travelMarkers.push({ marker, point: p })
  })

  map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] })
  baseZoom = map.getZoom()
  initialBounds = map.getBounds()
}

function onTravelMarkerClick(point) {
  const targetZoom = isDetailView
    ? map.getZoom()
    : Math.min(baseZoom + ZOOM_STEP, MAX_ZOOM)

  isDetailView = true
  map.setView([point.lat, point.lng], targetZoom, { animate: true })
}

function renderNearby() {
  if (!nearbyLayer || !map) return
  nearbyLayer.clearLayers()

  const bounds = map.getBounds()

  CATEGORY_CONFIG.filter((cat) => props.selectedCategories.includes(cat.key)).forEach((cat) => {
    const points = props.categoryData[cat.key] || []
    const icon = createCategoryPinIcon(cat.color)

    points
      .filter((p) => bounds.contains([p.lat, p.lng]))
      .forEach((p) => {
        L.marker([p.lat, p.lng], { icon })
          .bindPopup(buildCategoryPopupHtml(p, cat), { minWidth: 120, maxWidth: 260 })
          .addTo(nearbyLayer)
      })
  })
}

function resetView() {
  nearbyLayer?.clearLayers()
  isDetailView = false

  if (initialBounds) {
    map.fitBounds(initialBounds)
  } else {
    map.setView(SEOUL_CENTER, 11)
  }
}

defineExpose({ resetView })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.getPane('popupPane')?.removeEventListener('change', handlePopupToggleChange)
  map?.remove()
})
</script>

<style scoped>
.seoul-map {
  width: 100%;
  aspect-ratio: 3 / 2; /* ✅ 기본 1500x1000 비율(3:2) 유지하며 반응형 축소/확대 */
  max-height: 1000px;
}
</style>

<style>
.red-pin-icon,
.category-pin-icon {
  background: transparent;
  border: none;
}

.popup-content {
  width: max-content;
  max-width: 260px;
}

.popup-content__image {
  display: block;
  width: 100%;
  margin-top: 6px;
  border-radius: 6px;
}

.popup-nearby-group {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #e5e7eb;
}

.popup-nearby-group__label {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
}

.popup-nearby-group__list {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 12px;
  color: #4b5563;
}

/* 팝업 내부 카테고리 체크박스 영역 */
.popup-toggle-group {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.popup-toggle-group__title {
  width: 100%;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 2px;
}

.popup-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
}

.popup-toggle__dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>