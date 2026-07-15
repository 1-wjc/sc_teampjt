import { ref, onMounted } from 'vue'

function parseDate(str) {
  if (!str || str.length !== 8) return null
  const year = Number(str.slice(0, 4))
  const month = Number(str.slice(4, 6)) - 1
  const day = Number(str.slice(6, 8))
  return new Date(year, month, day)
}

export function useFestivalEvents() {
  const festivalEvents = ref([])

  onMounted(async () => {
    const res = await fetch('/data/서울/서울_축제공연행사.json')
    const json = await res.json()

    festivalEvents.value = json.items
      .filter((item) => item.mapx && item.mapy)
      .map((item) => {
        const start = parseDate(item.eventstartdate)
        const end = parseDate(item.eventenddate) || start
        if (!start) return null
        return {
          id: item.contentid,
          title: item.title,
          place: item.eventplace,
          addr: item.addr1,
          lat: Number(item.mapy),
          lng: Number(item.mapx),
          start,
          end,
        }
      })
      .filter(Boolean)
  })

  return { festivalEvents }
}