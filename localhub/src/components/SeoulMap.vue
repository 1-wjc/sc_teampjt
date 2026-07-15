<template>
  <div ref="mapEl" class="seoul-map"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import { CATEGORY_CONFIG } from '../config/mapCategories'

const props = defineProps({
  points: { type: Array, default: () => [] },
  categoryData: { type: Object, default: () => ({}) },
  selectedCategories: { type: Array, default: () => [] },
})

const emit = defineEmits(['select'])

const mapEl = ref(null)
let map = null
let travelLayer = null
let nearbyLayer = null
let travelMarkers = [] // { marker, point }
let nearbyMarkers = [] // { marker, point, cat }
let resizeObserver = null
let activeMarkerPopup = null // 현재 선택된 마커의 제목만 표시하는 팝업

const SEOUL_CENTER = [37.5665, 126.978]
const ZOOM_STEP = 3
const MAX_ZOOM = 18

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

// 선택된 마커 위치에 제목만 담은 작은 팝업을 표시 (상세정보는 우측 패널에서 별도로 보여줌)
function showTitlePopup(point) {
  if (!map) return

  if (activeMarkerPopup) {
    map.closePopup(activeMarkerPopup)
    activeMarkerPopup = null
  }

  activeMarkerPopup = L.popup({
    closeButton: false,
    autoClose: true,
    closeOnClick: false,
    className: 'marker-title-popup',
    offset: [0, -4],
  })
    .setLatLng([point.lat, point.lng])
    .setContent(point.title || '선택된 장소')
    .openOn(map)
}

// 마커 선택: 지도 이동 + 제목 팝업 표시 + 부모에게 선택된 장소 정보 전달(상세정보는 부모의 사이드 패널에서 표시)
function selectPoint(point, cat) {
  const targetZoom = isDetailView ? map.getZoom() : Math.min(baseZoom + ZOOM_STEP, MAX_ZOOM)

  isDetailView = true
  map.setView([point.lat, point.lng], targetZoom, { animate: true })
  showTitlePopup(point)

  emit('select', { point, cat })
}

onMounted(() => {
  map = L.map(mapEl.value).setView(SEOUL_CENTER, 11)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  travelLayer = L.layerGroup().addTo(map)
  nearbyLayer = L.layerGroup().addTo(map)
  renderTravelMarkers()

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
      .on('click', () => selectPoint(p, null))
      .addTo(travelLayer)

    travelMarkers.push({ marker, point: p })
  })

  map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] })
  baseZoom = map.getZoom()
  initialBounds = map.getBounds()
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
          .on('click', () => selectPoint(p, cat))
          .addTo(nearbyLayer)

        nearbyMarkers.push({ marker, point: p, cat })
      })
  })
}

function resetView() {
  nearbyLayer?.clearLayers()
  isDetailView = false

  if (activeMarkerPopup) {
    map.closePopup(activeMarkerPopup)
    activeMarkerPopup = null
  }

  if (initialBounds) {
    map.fitBounds(initialBounds)
  } else {
    map.setView(SEOUL_CENTER, 11)
  }
}

// locateAndOpen: 외부(챗봇/캘린더)에서 호출해 지도 이동 + 제목 팝업 표시 + 상세정보 패널 갱신(select 이벤트로 부모에 전달)
function locateAndOpen({ id, lat, lng, name }) {
  if (!map) return
  if (lat == null || lng == null) return

  const base = baseZoom ?? 11
  const targetZoom = isDetailView ? map.getZoom() : Math.min(base + ZOOM_STEP, MAX_ZOOM)

  isDetailView = true
  map.setView([lat, lng], targetZoom, { animate: true })

  // categoryData / travelMarkers에서 원본 포인트와 카테고리 정보 찾기
  let point = null
  let cat = null

  const catKeys = Object.keys(props.categoryData || {})
  for (const key of catKeys) {
    const arr = props.categoryData[key] || []
    const p = arr.find((pt) => String(pt.id) === String(id))
    if (p) {
      point = p
      cat = CATEGORY_CONFIG.find((c) => c.key === key) || null
      break
    }
  }

  if (!point) {
    const tm = travelMarkers.find((t) => String(t.point.id) === String(id))
    if (tm) point = tm.point
  }

  const resolvedPoint = point || { id, title: name || '장소', lat, lng }
  showTitlePopup(resolvedPoint)

  emit('select', {
    point: resolvedPoint,
    cat,
  })
}

defineExpose({ resetView, locateAndOpen })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
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

.marker-title-popup .leaflet-popup-content-wrapper {
  padding: 4px 10px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.marker-title-popup .leaflet-popup-content {
  margin: 2px 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
}

.marker-title-popup .leaflet-popup-tip {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
</style>