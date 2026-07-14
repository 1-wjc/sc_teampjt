import { ref, onMounted } from 'vue'

export function useTravelCourses() {
  const travelCourses = ref([])

  onMounted(async () => {
    const res = await fetch('/data/서울/서울_여행코스.json')
    const json = await res.json()

    travelCourses.value = json.items
      .filter((item) => item.mapx && item.mapy)
      .map((item) => ({
        id: item.contentid,
        title: item.title,
        lat: Number(item.mapy),
        lng: Number(item.mapx),
        addr: item.addr1,
        image: item.firstimage,
      }))
  })

  return { travelCourses }
}