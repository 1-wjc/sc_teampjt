<template>
  <div ref="mapEl" class="seoul-map"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import { CATEGORY_CONFIG } from '../config/mapCategories'
import { distanceMeters } from '../utils/geo'

const props = defineProps({
  points: { type: Array, default: () => [] },       // 여행코스(빨간 핀)
  categoryData: { type: Object, default: () => ({}) }, // 나머지 카테고리
})

const mapEl = ref(null)
let map = null
let travelLayer = null
let nearbyLayer = null

const SEOUL_CENTER = [37.5665, 126.978]
const NEARBY_RADIUS_M = 1500 // 주변 표시 반경 (1.5km)
const ZOOM_STEP = 3
const MAX_ZOOM = 18

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

onMounted(() => {
  map = L.map(mapEl.value).setView(SEOUL_CENTER, 11)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  travelLayer = L.layerGroup().addTo(map)
  nearbyLayer = L.layerGroup().addTo(map)
  renderTravelMarkers()
})

watch(() => props.points, renderTravelMarkers)

function renderTravelMarkers() {
  if (!travelLayer || !map) return
  travelLayer.clearLayers()
  if (props.points.length === 0) return

  const latLngs = []

  props.points.forEach((p) => {
    const latLng = [p.lat, p.lng]
    latLngs.push(latLng)

    L.marker(latLng, { icon: redPinIcon })
      .bindPopup(`<strong>${p.title}</strong><br/>${p.addr ?? ''}`)
      .on('click', () => onTravelMarkerClick(p))
      .addTo(travelLayer)
  })

  map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] })
}

function onTravelMarkerClick(point) {
  const targetZoom = Math.min(map.getZoom() + ZOOM_STEP, MAX_ZOOM)
  map.setView([point.lat, point.lng], targetZoom, { animate: true })
  renderNearby(point)
}

function renderNearby(center) {
  if (!nearbyLayer) return
  nearbyLayer.clearLayers()

  CATEGORY_CONFIG.forEach((cat) => {
    const points = props.categoryData[cat.key] || []

    points
      .filter((p) => distanceMeters([center.lat, center.lng], [p.lat, p.lng]) <= NEARBY_RADIUS_M)
      .forEach((p) => {
        L.circleMarker([p.lat, p.lng], {
          radius: 6,
          color: cat.color,
          fillColor: cat.color,
          fillOpacity: 0.9,
          weight: 1,
        })
          .bindPopup(`<strong>${p.title}</strong><br/>[${cat.label}]<br/>${p.addr ?? ''}`)
          .addTo(nearbyLayer)
      })
  })
}

onBeforeUnmount(() => {
  map?.remove()
})
</script>

<style scoped>
.seoul-map {
  width: 100%;
  height: 600px;
}
</style>

<style>
.red-pin-icon {
  background: transparent;
  border: none;
}
</style>