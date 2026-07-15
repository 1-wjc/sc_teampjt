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
function toContextItem(item) {
  return {
    name: item.title,
    addr: item.addr1,
    tel: item.tel || '정보없음',
    image: item.firstimage || '', // 이미지 없으면 빈 문자열
  }
}

// 6. 최종: 질문 → 관련 데이터 목록 반환 (데이터는 fetch로 비동기 로드)
export async function buildContext(message) {
  const intent = classifyIntent(message)
  const district = extractDistrict(message)

  const allData = await loadAllData()

  let candidates =
    allData[intent] ||
    [...allData.attraction.slice(0, 10), ...allData.festival.slice(0, 10)]

  if (district) {
    candidates = candidates.filter((item) => item.addr1.includes(district))
  }

  // 너무 많으면 상위 15개만
  return {
    intent,
    district,
    items: candidates.slice(0, 15).map(toContextItem),
  }
}
