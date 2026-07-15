<template>
  <div ref="mapEl" class="seoul-map"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import { CATEGORY_CONFIG } from '../config/mapCategories'
import { distanceMeters } from '../utils/geo'

L.Popup.mergeOptions({
  autoPan: true,
  autoPanPadding: [20, 20],
  maxHeight: 320,
})

const props = defineProps({
  points: { type: Array, default: () => [] },
  categoryData: { type: Object, default: () => ({}) },
  selectedCategories: { type: Array, default: () => [] },
  popupCategories: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:popupCategories'])

const mapEl = ref(null)
let map = null
let travelLayer = null
let nearbyLayer = null
let travelMarkers = [] // { marker, point }
let nearbyMarkers = [] // { marker, point, cat }
let resizeObserver = null

const SEOUL_CENTER = [37.5665, 126.978]
const ZOOM_STEP = 3
const MAX_ZOOM = 18
const POPUP_NEARBY_COUNT = 3

let baseZoom = null
let initialBounds = null
let isDetailView = false

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

const pinIconCache = {}
function createCategoryPinIcon(color) {
  if (pinIconCache[color]) return pinIconCache[color]

  const icon = L.divIcon({
    className: 'category-pin-icon',
    html: `
      <svg width="12" height="18" viewBox="0 0 18 26" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 0C4 0 0 4 0 9c0 6.5 9 17 9 17s9-10.5 9-17c0-5-4-9-9-9z" fill="${color}" stroke="#333333" stroke-width="1"/>
        <circle cx="9" cy="9" r="3" fill="#ffffff"/>
      </svg>
    `,
    iconSize: [12, 18],
    iconAnchor: [6, 18],
    popupAnchor: [0, -16],
  })

  pinIconCache[color] = icon
  return icon
}

// ✅ YYYYMMDD 문자열을 YYYY.MM.DD 형식으로 변환
function formatEventDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr || ''
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`
}

// 기준 지점에서, 선택된 카테고리별 "가장 가까운 장소" 목록 계산 (자기 자신 제외)
function getNearestPointsByCategory(point) {
  return CATEGORY_CONFIG.filter((cat) => props.popupCategories.includes(cat.key))
    .map((cat) => {
      const points = props.categoryData[cat.key] || []
      const nearest = points
        .filter((p) => p.id !== point.id)
        .map((p) => ({ ...p, dist: distanceMeters([point.lat, point.lng], [p.lat, p.lng]) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, POPUP_NEARBY_COUNT)
      return { key: cat.key, label: cat.label, items: nearest }
    })
    .filter((group) => group.items.length > 0)
}

function buildMarkerPopupHtml(point, extraLineHtml = '') {
  const nearestGroups = getNearestPointsByCategory(point)

  const nearestHtml = nearestGroups
    .map(
      (group) => `
        <div class="popup-nearby-group">
          <span class="popup-nearby-group__label">${group.label}</span>
          <ul class="popup-nearby-group__list">
            ${group.items
              .map(
                (item) => `
                  <li>
                    <span class="popup-nearby-link" data-cat="${group.key}" data-id="${item.id}">${item.title}</span>
                  </li>
                `,
              )
              .join('')}
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
      ${extraLineHtml}
      ${point.image ? `<img src="${point.image}" class="popup-content__image" />` : ''}
      <div class="popup-toggle-group">
        <div class="popup-toggle-group__title">가까운 장소 표시</div>
        ${toggleHtml}
      </div>
      ${nearestHtml}
    </div>
  `
}

function buildTravelPopupHtml(point) {
  return buildMarkerPopupHtml(point)
}

// ✅ 기타 마커 팝업: 축제공연행사(festival)는 [카테고리] → 행사장소 → 주소 → 행사기간 순으로 추가 표시
function buildCategoryPopupHtml(point, cat) {
  const isFestival = cat.key === 'festival'
  const lines = [`[${cat.label}]`]

  if (isFestival && point.eventPlace) {
    lines.push(point.eventPlace)
  }

  if (point.addr) {
    lines.push(point.addr)
  }

  if (isFestival && (point.eventStartDate || point.eventEndDate)) {
    lines.push(`${formatEventDate(point.eventStartDate)} ~ ${formatEventDate(point.eventEndDate)}`)
  }

  const extraLineHtml = `<br/>${lines.join('<br/>')}`
  return buildMarkerPopupHtml(point, extraLineHtml)
}

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

function handlePopupNearbyClick(e) {
  const target = e.target.closest ? e.target.closest('.popup-nearby-link') : null
  if (!target) return

  const catKey = target.dataset.cat
  const id = target.dataset.id
  const cat = CATEGORY_CONFIG.find((c) => c.key === catKey)
  if (!cat) return

  const points = props.categoryData[catKey] || []
  const point = points.find((p) => String(p.id) === id)
  if (!point) return

  openNearbyDetailPopup(point, cat)
}

function openNearbyDetailPopup(point, cat) {
  const targetZoom = isDetailView ? map.getZoom() : Math.min(baseZoom + ZOOM_STEP, MAX_ZOOM)

  isDetailView = true
  map.setView([point.lat, point.lng], targetZoom, { animate: true })

  L.popup({ minWidth: 160, maxWidth: 320 })
    .setLatLng([point.lat, point.lng])
    .setContent(buildCategoryPopupHtml(point, cat))
    .openOn(map)
}

onMounted(() => {
  map = L.map(mapEl.value).setView(SEOUL_CENTER, 11)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  travelLayer = L.layerGroup().addTo(map)
  nearbyLayer = L.layerGroup().addTo(map)
  renderTravelMarkers()

  map.getPane('popupPane').addEventListener('change', handlePopupToggleChange)
  map.getPane('popupPane').addEventListener('click', handlePopupNearbyClick)

  map.on('moveend', () => {
    if (map.getZoom() >= baseZoom + ZOOM_STEP) {
      isDetailView = true
      renderNearby()
    } else if (isDetailView) {
      nearbyLayer.clearLayers()
      isDetailView = false
    }
  })

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

watch(
  () => props.popupCategories,
  () => {
    travelMarkers.forEach(({ marker, point }) => {
      marker.setPopupContent(buildTravelPopupHtml(point))
    })
    nearbyMarkers.forEach(({ marker, point, cat }) => {
      marker.setPopupContent(buildCategoryPopupHtml(point, cat))
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
      .bindPopup(buildTravelPopupHtml(p), { minWidth: 160, maxWidth: 320 })
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
  nearbyMarkers = []

  const bounds = map.getBounds()

  CATEGORY_CONFIG.filter((cat) => props.selectedCategories.includes(cat.key)).forEach((cat) => {
    const points = props.categoryData[cat.key] || []
    const icon = createCategoryPinIcon(cat.color)

    points
      .filter((p) => bounds.contains([p.lat, p.lng]))
      .forEach((p) => {
        const marker = L.marker([p.lat, p.lng], { icon })
          .bindPopup(buildCategoryPopupHtml(p, cat), { minWidth: 160, maxWidth: 320 })
          .addTo(nearbyLayer)

        nearbyMarkers.push({ marker, point: p, cat })
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

// locateAndOpen: 외부에서 호출해 지도 이동 + 팝업 열기
function locateAndOpen({ id, lat, lng, name }) {
  if (!map) return
  if (lat == null || lng == null) return

  const base = baseZoom ?? 11
  const targetZoom = isDetailView ? map.getZoom() : Math.min(base + ZOOM_STEP, MAX_ZOOM)

  isDetailView = true
  map.setView([lat, lng], targetZoom, { animate: true })

  // 기본 팝업 HTML (이름만)
  let popupHtml = `<div class="popup-content travel-popup-content"><strong>${name || '장소'}</strong></div>`

  // 가능한 경우: props.categoryData에서 id로 원본 포인트 찾기
  let found = null
  const catKeys = Object.keys(props.categoryData || {})
  for (const key of catKeys) {
    const arr = props.categoryData[key] || []
    const p = arr.find((pt) => String(pt.id) === String(id))
    if (p) { found = { point: p, catKey: key }; break }
  }

  // 여행코스 포인트에서도 찾기
  if (!found) {
    const tm = travelMarkers.find((t) => String(t.point.id) === String(id))
    if (tm) found = { point: tm.point, catKey: null }
  }

  // 찾았으면 기존 팝업 생성 로직 재사용
  if (found && found.point) {
    const pt = found.point
    if (found.catKey) {
      const cat = CATEGORY_CONFIG.find((c) => c.key === found.catKey)
      popupHtml = cat ? buildCategoryPopupHtml(pt, cat) : buildTravelPopupHtml(pt)
    } else {
      popupHtml = buildTravelPopupHtml(pt)
    }
  }

  L.popup({ minWidth: 160, maxWidth: 320 })
    .setLatLng([lat, lng])
    .setContent(popupHtml)
    .openOn(map)
}

// expose에 locateAndOpen 추가
defineExpose({ resetView, locateAndOpen })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.getPane('popupPane')?.removeEventListener('change', handlePopupToggleChange)
  map?.getPane('popupPane')?.removeEventListener('click', handlePopupNearbyClick)
  map?.remove()
})
</script>

<style scoped>
.seoul-map {
  width: 100%;
  aspect-ratio: 3 / 2;
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

.leaflet-popup-content {
  overflow-x: hidden !important;
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

.popup-nearby-link {
  cursor: pointer;
  color: #2563eb;
}

.popup-nearby-link:hover {
  text-decoration: underline;
}

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