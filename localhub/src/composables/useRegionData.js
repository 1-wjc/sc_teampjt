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
          }))
        return [cat.key, points]
      }),
    )
    categoryData.value = Object.fromEntries(results)
  })

  return { categoryData }
}