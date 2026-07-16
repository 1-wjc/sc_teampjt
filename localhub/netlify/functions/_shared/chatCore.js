// netlify/functions/_shared/chatCore.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../../public/data/서울')

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

// OpenAI가 스스로 호출할 도구(함수) 정의
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_places',
      description:
        '서울 지역 정보를 카테고리(category), 자치구(district), 키워드(keyword)로 검색합니다. 장소 추천/조회가 필요할 때 반드시 이 도구를 사용하세요.',
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
]

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

const SYSTEM_PROMPT = `당신은 서울 지역정보 안내 챗봇입니다.
사용자의 질문에서 의도(축제/쇼핑/숙박/문화시설/레포츠/여행코스/관광지 등)와 지역(자치구)을 스스로 판단하세요.
장소 정보가 필요하면 반드시 search_places 도구를 호출해서 실제 데이터를 조회하세요.

[답변 형식 규칙]
- 검색된 장소의 이름/주소/설명 등 세부 정보를 답변 텍스트에 나열하지 마세요. 세부 정보는 화면 하단에 카드 형태로 별도 표시되므로 중복해서 설명할 필요가 없습니다.
- 답변 텍스트는 "이 요청이 무엇에 대한 결과인지"만 한두 문장으로 짧게 안내하세요. (예: "강남구 맛집 추천 결과입니다.", "요청하신 관광지 목록을 아래에서 확인해 보세요.")
- 검색 결과가 없다면 그 사실만 짧게 알리고, 다른 지역이나 카테고리로 다시 시도해볼 것을 간단히 제안하세요.
- 도구 조회 결과에 없는 장소를 임의로 지어내지 마세요.`

export async function runChat({ message, history = [], apiKey }) {
  if (!apiKey) {
    throw new Error('OPEN_API_KEY가 설정되어 있지 않습니다.')
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ]

  let lastItems = []

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
        if (call.function?.name === 'search_places') {
          const args = JSON.parse(call.function.arguments || '{}')
          const items = executeSearchPlaces(args)
          lastItems = items
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(items),
          })
        }
      }
      continue // 도구 결과를 반영한 최종 답변을 다음 라운드에서 받음
    }

    const reply = choice?.message?.content ?? '응답을 생성하지 못했어요.'
    return { reply, items: lastItems }
  }

  return { reply: '응답을 생성하지 못했어요.', items: lastItems }
}