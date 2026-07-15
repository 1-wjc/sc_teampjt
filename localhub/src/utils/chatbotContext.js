// src/utils/chatbotContext.js
// LocalHub의 public/data 폴더에 있는 JSON 데이터를 fetch로 불러와 사용한다.

// 1. intent별로 사용할 데이터 파일 매핑
const DATA_FILES = {
  festival: '서울_축제공연행사.json',
  shopping: '서울_쇼핑.json',
  stay: '서울_숙박.json',
  culture: '서울_문화시설.json',
  leisure: '서울_레포츠.json',
  course: '서울_여행코스.json',
  attraction: '서울_관광지.json',
}

// 2. 데이터 캐시 (최초 1회만 fetch)
let dataCachePromise = null

function loadAllData() {
  if (!dataCachePromise) {
    dataCachePromise = Promise.all(
      Object.entries(DATA_FILES).map(async ([intent, file]) => {
        const res = await fetch(`/data/서울/${file}`)
        const json = await res.json()
        return [intent, json.items || []]
      }),
    ).then((entries) => Object.fromEntries(entries))
  }
  return dataCachePromise
}

// 3. 의도(intent) 분류 규칙
const INTENT_RULES = {
  festival: ['축제', '행사', '공연', '페스티벌'],
  shopping: ['쇼핑', '쇼핑몰', '시장', '아울렛'],
  stay: ['숙소', '호텔', '숙박', '게스트하우스'],
  culture: ['문화시설', '박물관', '미술관', '전시'],
  leisure: ['레포츠', '액티비티', '체험'],
  course: ['코스', '여행코스', '동선'],
  attraction: ['관광지', '가볼만한', '명소'],
}

export function classifyIntent(message) {
  for (const [intent, keywords] of Object.entries(INTENT_RULES)) {
    if (keywords.some((kw) => message.includes(kw))) return intent
  }
  return 'general'
}

// 4. 주소에서 "OO구" 추출
// 서울 25개 구 목록
const SEOUL_DISTRICTS = [
  '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구',
  '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구',
  '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
  '서초구', '강남구', '송파구', '강동구',
]

// "용산", "용산구" 둘 다 인식하도록 개선
export function extractDistrict(message) {
  for (const district of SEOUL_DISTRICTS) {
    const shortName = district.replace('구', '') // "용산구" -> "용산"
    if (message.includes(district) || message.includes(shortName)) {
      return district
    }
  }
  return null
}

// 5. 컨텍스트용으로 필드 축소 (토큰 절약)
// -> 반환 필드: id, firstimage, title, addr1 (요구하신 형식)
function toContextItem(item) {
  return {
    id: item.contentid,
    firstimage: item.firstimage || '',
    title: item.title || '',
    addr1: item.addr1 || '',
    // mapy = 위도(lat), mapx = 경도(lng) (문자열일 수 있으니 숫자로 변환)
    lat: item.mapy ? parseFloat(item.mapy) : null,
    lng: item.mapx ? parseFloat(item.mapx) : null,
  }
}
// 6. 최종: 질문 → 관련 데이터 목록 반환 (데이터는 fetch로 비동기 로드)
// - district가 있으면 정확히 그 구(또는 구 이름 단수형)만 필터
// - contentid로 중복 제거
// - 기본 최대 개수는 10 (원하면 조정)
export async function buildContext(message) {
  const intent = classifyIntent(message)
  const district = extractDistrict(message) // e.g. "용산구" 또는 "용산"

  const allData = await loadAllData()

  let candidates = (allData[intent] && Array.isArray(allData[intent]))
    ? allData[intent]
    : [
        ...(allData.attraction || []).slice(0, 10),
        ...(allData.festival || []).slice(0, 10),
      ]

  if (district) {
    const short = district.replace(/구$/, '') // "용산구" -> "용산"
    candidates = candidates.filter((item) => {
      const addr = (item.addr1 || '')
      return addr.includes(district) || addr.includes(short)
    })
  }

  // 중복 제거 (contentid)
  const seen = new Set()
  candidates = candidates.filter((it) => {
    const id = it.contentid || it.title || JSON.stringify(it)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  // 결과 제한 (예: 최대 10개)
  const maxResults = 10
  return {
    intent,
    district,
    items: candidates.slice(0, maxResults).map(toContextItem),
  }
}