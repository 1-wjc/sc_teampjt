// netlify/functions/_shared/chatCore.js
import fs from 'node:fs'
import path from 'node:path'

// Netlify(esbuild)가 이 파일을 chat.js와 하나로 번들링하면서 원래의 _shared 폴더 구조가 사라진다.
// import.meta.url 기반 상대 경로는 번들링 후 깨지므로, 함수 실행 루트(process.cwd())를 기준으로 찾는다.
// (included_files로 포함된 파일은 base 디렉터리 기준 경로 그대로 함수 루트에 배치된다)
const DATA_DIR = path.join(process.cwd(), 'public/data/서울')

const DATA_FILES = {
  festival: '서울_축제공연행사.json',
  shopping: '서울_쇼핑.json',
  stay: '서울_숙박.json',
  culture: '서울_문화시설.json',
  leisure: '서울_레포츠.json',
  course: '서울_여행코스.json',
  attraction: '서울_관광지.json',
}

let cache = null
function loadAllData() {
  if (cache) return cache
  cache = Object.fromEntries(
    Object.entries(DATA_FILES).map(([key, file]) => {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')
      const json = JSON.parse(raw)
      return [key, json.items || []]
    }),
  )
  return cache
}

function toItem(item) {
  return {
    id: item.contentid,
    title: item.title || '',
    addr1: item.addr1 || '',
    firstimage: item.firstimage || '',
    lat: item.mapy ? parseFloat(item.mapy) : null,
    lng: item.mapx ? parseFloat(item.mapx) : null,
  }
}

// ===== 도구 1: 로컬 데이터에서 장소 검색 =====
function executeSearchPlaces({ category, district, keyword, limit = 10 }) {
  const allData = loadAllData()
  let candidates = allData[category] || []

  if (district) {
    const short = district.replace(/구$/, '')
    candidates = candidates.filter((it) => {
      const addr = it.addr1 || ''
      return addr.includes(district) || addr.includes(short)
    })
  }

  if (keyword) {
    candidates = candidates.filter(
      (it) =>
        (it.title || '').includes(keyword) || (it.addr1 || '').includes(keyword),
    )
  }

  return candidates.slice(0, limit).map(toItem)
}

// ===== 도구 2: 카카오맵 길찾기 링크 생성 =====
async function searchKakaoPlace(query, kakaoApiKey) {
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `KakaoAK ${kakaoApiKey}` } },
  )

  if (!res.ok) return null

  const data = await res.json()
  const first = data.documents?.[0]
  if (!first) return null

  return {
    name: first.place_name,
    lat: first.y,
    lng: first.x,
  }
}

async function executeGetDirectionsLink({ origin, destination }, kakaoApiKey) {
  if (!kakaoApiKey) {
    return { error: '카카오 API 키가 설정되어 있지 않습니다.' }
  }

  const [from, to] = await Promise.all([
    searchKakaoPlace(origin, kakaoApiKey),
    searchKakaoPlace(destination, kakaoApiKey),
  ])

  if (!from || !to) {
    return {
      error: `'${!from ? origin : destination}' 위치를 카카오맵에서 찾을 수 없습니다.`,
    }
  }

  const url = `https://map.kakao.com/link/from/${encodeURIComponent(from.name)},${from.lat},${from.lng}/to/${encodeURIComponent(to.name)},${to.lat},${to.lng}`

  return { url, from: from.name, to: to.name }
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'search_places',
      description:
        '서울 지역 정보를 카테고리(category), 자치구(district), 키워드(keyword)로 검색합니다. 장소 추천/조회가 필요할 때 사용하세요.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: Object.keys(DATA_FILES),
            description: '검색할 데이터 카테고리',
          },
          district: {
            type: 'string',
            description: '서울 자치구 이름 (예: 강남구). 없으면 생략 가능',
          },
          keyword: {
            type: 'string',
            description: '제목/주소에 포함될 키워드 (선택)',
          },
          limit: { type: 'number', description: '반환할 최대 개수 (기본 10)' },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_directions_link',
      description:
        '"A에서 B로 가는 방법", "A에서 B까지 어떻게 가나요" 같은 길찾기 질문에 사용합니다. 카카오맵에서 출발지/도착지를 검색해 길찾기 페이지로 연결되는 링크를 생성합니다.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: '출발지 이름' },
          destination: { type: 'string', description: '도착지 이름' },
        },
        required: ['origin', 'destination'],
      },
    },
  },
]

const SYSTEM_PROMPT = `당신은 서울 지역정보 안내 챗봇입니다.

[도구 사용 규칙]
- 특정 카테고리의 장소를 추천/검색해달라는 요청이면 search_places 도구를 사용해 실제 데이터를 조회한 뒤 그 결과만 근거로 답변하세요.
- "A에서 B로 가는 방법", "A에서 B까지 어떻게 가나요" 같은 길찾기 질문이면 get_directions_link 도구를 사용하세요. 이때 실제 경로/거리/소요시간을 임의로 설명하지 말고, 도구가 반환한 링크를 안내하는 짧은 문장만 답하세요.
- 도구 조회 결과에 없는 장소나 경로를 임의로 지어내지 마세요. 데이터가 없으면 없다고 솔직히 답하세요.

[답변 형식 규칙]
- 장소 검색 결과의 이름/주소 등 세부 정보를 답변 텍스트에 나열하지 마세요. 세부 정보는 화면에 카드 또는 링크(버튼)로 별도 표시됩니다.
- get_directions_link 도구를 사용한 경우, 답변 텍스트에 URL(http로 시작하는 링크 주소)을 절대 직접 적지 마세요. 링크는 화면에 버튼으로 이미 표시되므로 텍스트로는 "카카오맵 길찾기 버튼을 확인해 주세요" 같은 문장만 답하세요.
- 답변 텍스트는 "이 요청이 무엇에 대한 결과인지"만 한두 문장으로 짧게 안내하세요.`

export async function runChat({ message, history = [], apiKey, kakaoApiKey }) {
  if (!apiKey) {
    throw new Error('OPEN_API_KEY가 설정되어 있지 않습니다.')
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ]

  let lastItems = []
  let lastLink = null

  for (let round = 0; round < 3; round += 1) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages,
        tools,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error?.message || 'OpenAI API 요청 실패')
    }

    const choice = data.choices?.[0]
    const toolCalls = choice?.message?.tool_calls

    if (toolCalls && toolCalls.length > 0) {
      messages.push(choice.message)

      for (const call of toolCalls) {
        const args = JSON.parse(call.function?.arguments || '{}')

        if (call.function?.name === 'search_places') {
          const items = executeSearchPlaces(args)
          lastItems = items
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(items),
          })
        } else if (call.function?.name === 'get_directions_link') {
          const result = await executeGetDirectionsLink(args, kakaoApiKey)
          if (result.url) lastLink = result
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          })
        }
      }
      continue // 도구 결과를 반영한 최종 답변을 다음 라운드에서 받음
    }

    const reply = choice?.message?.content ?? '응답을 생성하지 못했어요.'
    return { reply, items: lastItems, link: lastLink }
  }

  return { reply: '응답을 생성하지 못했어요.', items: lastItems, link: lastLink }
}