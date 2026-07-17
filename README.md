# 📍 LocalHub

> **서울 여행 스팟 & 주변 정보 지도** — [SSAFY] 스타트캠프 3일차 팀 프로젝트

한국관광공사 **TourAPI 4.0** 데이터(서울, 약 6,500건)를 기반으로 서울의 여행 코스와 주변 관광 정보를 지도에서 탐색하고, 커뮤니티에서 정보를 나누고, **AI 챗봇**에게 장소 추천과 길찾기를 요청할 수 있는 웹 서비스입니다.

| 라우트 | 페이지 | 핵심 기능 |
|---|---|---|
| `/` | 🗺️ 지도 | 여행 코스 + 6개 카테고리 마커, 상세 패널, 주변 장소 추천 |
| `/community` | 💬 커뮤니티 | 익명 게시판 (글/댓글 CRUD, 좋아요, 비밀번호 검증) |
| `/calendar` | 📅 캘린더 | 축제·공연·행사 월별 일정 조회 |
| 전 페이지 | 🤖 챗봇 | OpenAI Function Calling 기반 장소 검색 · 길찾기 |

---

## ✨ 주요 기능

### 🗺️ 1. 여행 스팟 지도 (`/`)

- **Leaflet** 지도에 여행 코스 51곳을 빨간 핀으로 기본 표시
- 관광지 · 레포츠 · 문화시설 · 쇼핑 · 숙박 · 축제공연행사 **6개 카테고리를 색상 칩으로 온/오프** (범례 자동 연동)
- 마커 클릭 시 **상세 패널** 표시:
  - 이미지 · 주소 · (축제인 경우) 행사 장소/기간
  - **가까운 장소 추천**: 하버사인 공식(`utils/geo.js`)으로 거리를 계산해 선택한 카테고리별 **최근접 3곳** 표시, 클릭 시 해당 위치로 지도 이동
  - **카카오맵 길찾기** 버튼: 목적지만 지정한 `map.kakao.com/link/to/...` 링크 (출발지는 사용자 현재 위치)
  - **커뮤니티 글쓰기** 버튼: 대분류·제목(`[장소명] `)이 자동 입력된 글쓰기 폼으로 이동
- 지도 UX: 마커 선택 시 **상세 모드**로 줌 +3단계 확대, 상세 모드에서만 주변 카테고리 마커 렌더링, 새로고침 버튼으로 초기 뷰 복원

### 💬 2. 커뮤니티 (`/community`)

- 로그인 없이 **익명 닉네임**(`익명1234` 형식 자동 생성)으로 참여, 데이터는 `localStorage`에 저장
- **대분류**(여행 스팟 + 지도 6개 카테고리) × **중분류**(자유/질문/정보/후기) 2단 카테고리
- 게시글: 작성 · 조회수 · 수정 · 삭제 — 수정/삭제 시 **비밀번호 검증 모달**
- 댓글: 작성 · 수정 · 삭제 — 댓글별로 **개별 비밀번호** 관리
- 좋아요: 좋아요한 글 ID를 별도 저장해 **중복 좋아요 방지** (토글 방식)
- 비밀번호는 평문 저장 대신 **SHA-256 해시**(Web Crypto API)로 저장·검증 (최소 4자)
- 최초 방문 시 더미 게시글 **31개 자동 시드**로 빈 게시판 방지

### 📅 3. 행사 캘린더 (`/calendar`)

- 6주(42셀) 고정 그리드 달력, 이전/다음 달 이동 + "오늘" 버튼
- `eventstartdate ~ eventenddate` **기간에 걸친 행사를 날짜별로 매칭**해 셀에 행사 개수 배지 표시
- 날짜 클릭 → 사이드 패널에 해당 일자의 행사 목록(제목/장소/기간)
- 행사 클릭 → 액션 팝업에서 **"지도에서 보기"** 또는 **"커뮤니티 글쓰기"** 로 바로 이동

### 🤖 4. AI 챗봇 (플로팅 위젯)

**OpenAI Chat Completions API + Function Calling** 기반. 최대 3라운드의 도구 호출 루프를 돌며 답변을 생성합니다.

```
사용자 질문 → POST /api/chat { message, history }
             → OpenAI (도구 정의 포함)
             → [tool_calls?] → search_places / get_directions_link 실행
             → 도구 결과를 대화에 추가 후 재호출 (최대 3라운드)
             → { reply, items, link } 응답
```

| 도구 | 파라미터 | 동작 |
|---|---|---|
| `search_places` | `category`(필수) · `district` · `keyword` · `limit` | 로컬 JSON 7종에서 카테고리/자치구/키워드 필터링 검색 |
| `get_directions_link` | `origin` · `destination` (필수) | **카카오 로컬 API**로 두 장소를 검색해 카카오맵 길찾기 URL 생성 |

- **응답 렌더링 분기**: 장소 검색 결과는 이미지 **카드 목록**(최대 5개), 길찾기는 **버튼 링크**, 그 외엔 일반 텍스트
- **카드 클릭 → 지도 연동**: 카드를 클릭하면 지도 페이지의 해당 좌표로 이동해 상세 패널까지 자동 오픈
- **할루시네이션 방지 시스템 프롬프트**: 도구 결과에 없는 장소/경로 생성 금지, 답변 텍스트에 URL·장소 세부정보 직접 나열 금지(UI 카드/버튼으로만 표시) 등 역할 규칙 명시
- 대화 이력(`history`)은 클라이언트가 보관해 매 요청에 전달, system 메시지는 서버에서만 관리

---

## 🔗 페이지 간 연동 설계

컴포넌트가 라우트를 넘나들며 통신해야 하는 지점을 두 가지 방식으로 해결했습니다.

**1) `locate-on-map` 커스텀 이벤트** — 챗봇 카드 / 캘린더 행사 → 지도 이동

```js
// 발신 (ChatWindow.vue, CalendarView.vue)
window.dispatchEvent(new CustomEvent('locate-on-map', { detail: { id, name, lat, lng } }))

// 수신 (HomeView.vue) → SeoulMap이 defineExpose한 locateAndOpen() 호출
```

지도 데이터가 아직 로딩 중일 때 이벤트가 도착하면 `pendingLocate` 대기열에 넣어두고, `watch(categoryData, ..., { flush: 'post' })`로 **데이터 로딩 완료 후 재시도**합니다. (캘린더 → 지도처럼 라우트 전환 직후 이벤트가 발생하는 경쟁 상태 대응)

**2) 라우트 쿼리** — 지도 상세 패널 / 캘린더 → 커뮤니티 글쓰기

`/community?write=1&mainCategory=attraction&title=경복궁` 형태로 진입하면 글쓰기 폼이 미리 채워진 상태로 열리고, `router.replace`로 쿼리를 정리합니다.

---

## 🛠 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | Vue 3 (Composition API, `<script setup>`), Vue Router 4 |
| 지도 | Leaflet 1.9 (커스텀 SVG divIcon 마커, 카테고리별 아이콘 캐싱) |
| 빌드 | Vite 5 |
| AI / 외부 API | OpenAI Chat Completions(Function Calling) · Kakao Local API · TourAPI 4.0 수집 데이터 |
| 배포 | Netlify — 정적 호스팅 + **Netlify Functions**(서버리스) |
| 상태/저장 | Vue Composables(전역 모듈 상태) + `localStorage` |

### 챗봇 백엔드: 개발/배포 이중 구조

API 키를 클라이언트에 노출하지 않기 위해 챗봇 호출은 서버 측에서 프록시하며, 두 환경이 **핵심 로직 파일 하나를 공유**합니다.

```
                        netlify/functions/_shared/chatCore.js  (공유 핵심 로직)
                        ├─ 데이터 로드/캐싱, 도구 2종 구현
                        └─ OpenAI 호출 루프(runChat)
                       ↗                                  ↖
개발: vite.config.js 커스텀 미들웨어          배포: netlify/functions/chat.js
     (POST /api/chat 처리)                        (/api/* → Functions 리다이렉트)
```

**`POST /api/chat` 스펙**

```jsonc
// Request
{ "message": "강남구 맛집 근처 숙소 추천해줘", "history": [ { "role": "...", "content": "..." } ] }

// Response
{
  "reply": "강남구의 숙박 시설을 찾아봤어요.",
  "items": [ { "id", "title", "addr1", "firstimage", "lat", "lng" } ],
  "link":  { "url": "https://map.kakao.com/link/from/...", "from": "...", "to": "..." }  // 길찾기 시에만
}
```

---

## 📄 데이터

`public/data/서울/` 아래 TourAPI 4.0에서 수집한 카테고리별 JSON 7종 (총 6,518건):

| 파일 | 건수 | 파일 | 건수 |
|---|---:|---|---:|
| 서울_관광지.json | 783 | 서울_숙박.json | 423 |
| 서울_레포츠.json | 126 | 서울_여행코스.json | 51 |
| 서울_문화시설.json | 566 | 서울_축제공연행사.json | 201 |
| 서울_쇼핑.json | 4,368 | | |

주요 필드 (TourAPI 표준 스키마):

| 필드 | 의미 | 비고 |
|---|---|---|
| `contentid` | 콘텐츠 고유 ID | 중복 제거 키로 사용 |
| `title` / `addr1` | 이름 / 주소 | 자치구 필터는 주소 문자열 매칭 |
| `mapx` / `mapy` | **경도(lng) / 위도(lat)** | 문자열 → `Number` 변환 필요 (혼동 주의!) |
| `firstimage` / `firstimage2` | 대표 이미지 (원본/썸네일) | |
| `eventstartdate` / `eventenddate` / `eventplace` | 행사 기간(YYYYMMDD)·장소 | 축제공연행사 전용 |

---

## 📁 프로젝트 구조

```
sc_teampjt/
├── 02_3일차_팀프로젝트_개발 의뢰서.pdf        # 프로젝트 요구사항 문서
├── 04_3일차_팀프로젝트_실습기획서_템플렛.xlsx  # 기획서 템플릿
└── localhub/                                # 메인 프로젝트
    ├── vite.config.js                       # dev용 /api/chat 미들웨어 (chatCore 재사용)
    ├── netlify.toml                         # 빌드 설정, /api/* → Functions 리다이렉트, SPA fallback
    ├── netlify/functions/
    │   ├── chat.js                          # 배포용 서버리스 핸들러 (얇은 래퍼)
    │   └── _shared/chatCore.js              # ★ 챗봇 핵심: 데이터 캐시, 도구 2종, OpenAI 루프
    ├── public/data/서울/                     # TourAPI 수집 JSON 7종
    └── src/
        ├── main.js / App.vue                # 엔트리, 공통 레이아웃(헤더 내비/푸터/챗봇 위젯)
        ├── router/index.js                  # / , /community , /calendar
        ├── views/
        │   ├── HomeView.vue                 # 지도 + 카테고리 필터 + 상세 패널(주변 3곳/길찾기/글쓰기)
        │   ├── Communityview.vue            # 게시판 4모드(list/write/detail/edit) + 댓글 + 비번 모달
        │   └── CalendarView.vue             # 42셀 달력 + 일자별 행사 패널 + 액션 팝업
        ├── components/
        │   ├── SeoulMap.vue                 # Leaflet 래퍼: 마커 레이어 2종, 상세모드 줌, expose API
        │   └── chatbot/
        │       ├── ChatbotWidget.vue        # 플로팅 버튼 (열림/닫힘)
        │       └── ChatWindow.vue           # 대화 UI: 텍스트/카드/링크 3종 메시지, history 관리
        ├── composables/
        │   ├── useRegionData.js             # 6개 카테고리 JSON 병렬 로드 → 마커 포인트 변환
        │   ├── useTravelCourses.js          # 여행코스 로드
        │   ├── useFestivalEvents.js         # YYYYMMDD 파싱 → 캘린더 이벤트 변환
        │   └── useCommunityPosts.js         # 게시글/댓글/좋아요 CRUD + localStorage 자동 동기화
        ├── config/
        │   ├── mapCategories.js             # 카테고리 단일 정의(키/라벨/파일/색) → 지도·게시판 공유
        │   └── boardCategories.js           # 게시판 대분류(지도 카테고리 재사용) + 중분류
        └── utils/
            ├── geo.js                       # 하버사인 거리(m)
            ├── passwordHash.js              # SHA-256 해시/검증 (Web Crypto)
            └── chatbotContext.js            # (레거시) 규칙 기반 의도 분류 — 현재 미사용, 아래 참고
```

---

## 🚀 시작하기

```bash
cd localhub
npm install
npm run dev        # http://localhost:5173
```

챗봇 기능을 쓰려면 `localhub/.env` 생성:

| 변수 | 용도 |
|---|---|
| `OPEN_API_KEY` | OpenAI API 키 (챗봇 응답 생성) |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 (길찾기 장소 검색) |

> 환경 변수 없이도 지도 · 커뮤니티 · 캘린더는 정상 동작합니다 (챗봇만 비활성화).

```bash
npm run build      # 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기
```

**Netlify 배포**: 저장소 연결만으로 `netlify.toml` 설정에 따라 자동 배포됩니다. 대시보드에서 위 환경 변수 2개를 등록하세요.

---

## 🔧 구현 노트 & 트러블슈팅

- **Netlify 번들링 경로 문제**: Functions는 esbuild로 `chat.js`와 `_shared/chatCore.js`를 하나로 번들링하기 때문에 `import.meta.url` 기반 상대 경로가 배포 후 깨집니다. → 데이터 경로를 `process.cwd()` 기준으로 해석하고, `netlify.toml`의 `included_files = ["public/data/**"]`로 JSON을 함수 번들에 포함시켜 해결했습니다.
- **빌드 권한 이슈**: Netlify 빌드에서 vite 실행 권한 오류가 발생해 빌드 커맨드를 `chmod +x ./node_modules/.bin/vite && npm run build`로 우회했습니다.
- **라우트 전환 경쟁 상태**: 캘린더/챗봇에서 지도 이동을 요청할 때 지도 데이터가 아직 없으면 실패하므로, `pendingLocate` 대기열 + `watch(flush: 'post')` 재시도로 처리했습니다.
- **챗봇 UX 제어**: LLM이 답변 텍스트에 장소 목록이나 URL을 그대로 쏟아내지 않도록 시스템 프롬프트에서 금지하고, 구조화된 `items`/`link` 필드를 통해 카드·버튼 UI로만 노출합니다.
- **챗봇 v1의 흔적**: `utils/chatbotContext.js`는 키워드 매칭으로 의도(7종)와 서울 25개 자치구를 분류하던 초기 규칙 기반 구현입니다. 현재는 서버 측 Function Calling 방식으로 대체되어 import되는 곳이 없습니다.
- **캐싱**: 서버(chatCore)와 클라이언트(useRegionData 등) 모두 JSON을 최초 1회만 로드해 메모리에 캐싱합니다.

---

## 👥 프로젝트 배경

SSAFY 스타트캠프 3일차 팀 프로젝트로, 제공된 개발 의뢰서(`02_...pdf`)의 요구사항을 바탕으로 기획서 작성부터 구현·배포까지 진행했습니다.

- 데이터 출처: 한국관광공사 TourAPI 4.0
- 길찾기: Kakao Local API / 카카오맵 링크
