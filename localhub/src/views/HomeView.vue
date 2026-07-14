<template>
  <main class="home">
    <h1>서울 여행코스 지도</h1>
    <SeoulMap :points="travelCourses" :category-data="categoryData" />
  </main>
</template>

<script setup>
import SeoulMap from '../components/SeoulMap.vue'
import { useTravelCourses } from '../composables/useTravelCourses'
import { useRegionData } from '../composables/useRegionData'

const { travelCourses } = useTravelCourses()
const { categoryData } = useRegionData()
</script>