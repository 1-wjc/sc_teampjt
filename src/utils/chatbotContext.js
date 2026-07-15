// src/utils/chatbotContext.js

// 1. JSON 데이터 불러오기 (Vite는 JSON을 바로 import 가능)
import attractionData from '../data/서울/서울_관광지.json'
import cultureData from '../data/서울/서울_문화시설.json'
import festivalData from '../data/서울/서울_축제공연행사.json'
import courseData from '../data/서울/서울_여행코스.json'
import leisureData from '../data/서울/서울_레포츠.json'
import stayData from '../data/서울/서울_숙박.json'
import shoppingData from '../data/서울/서울_쇼핑.json'

// 2. 의도(intent) 분류 규칙
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

// 3. 주소에서 "OO구" 추출
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

// 4. intent별로 어떤 데이터를 쓸지 매핑
const sourceMap = {
  festival: festivalData.items,
  shopping: shoppingData.items,
  stay: stayData.items,
  culture: cultureData.items,
  leisure: leisureData.items,
  course: courseData.items,
  attraction: attractionData.items,
  general: [
    ...attractionData.items.slice(0, 10),
    ...festivalData.items.slice(0, 10),
  ],
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

// 6. 최종: 질문 → 관련 데이터 목록 반환
export function buildContext(message) {
  const intent = classifyIntent(message)
  const district = extractDistrict(message)

  let candidates = sourceMap[intent] || sourceMap.general

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