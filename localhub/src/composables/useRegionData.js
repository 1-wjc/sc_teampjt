import { ref, onMounted } from 'vue'
import { CATEGORY_CONFIG } from '../config/mapCategories'

export function useRegionData() {
  const categoryData = ref({}) // { attraction: [...], leisure: [...], ... }

  onMounted(async () => {
    const results = await Promise.all(
      CATEGORY_CONFIG.map(async (cat) => {
        const res = await fetch(`/data/서울/${cat.file}`)
        const json = await res.json()
        const points = json.items
          .filter((item) => item.mapx && item.mapy)
          .map((item) => ({
            id: item.contentid,
            title: item.title,
            lat: Number(item.mapy),
            lng: Number(item.mapx),
            addr: item.addr1,
            image: item.firstimage2,
            // ✅ 축제공연행사 전용 필드 (다른 카테고리는 값이 없으므로 무시됨)
            eventPlace: item.eventplace || '',
            eventStartDate: item.eventstartdate || '',
            eventEndDate: item.eventenddate || '',
          }))
        return [cat.key, points]
      }),
    )
    categoryData.value = Object.fromEntries(results)
  })

  return { categoryData }
}