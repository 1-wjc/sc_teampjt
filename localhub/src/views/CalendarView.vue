<template>
  <main class="calendar-view">
    <section class="hero">
      <div class="hero__content">
        <span class="hero__eyebrow">FESTIVAL CALENDAR</span>
        <h1 class="hero__title">행사 캘린더</h1>
        <p class="hero__subtitle">
          서울 축제·공연·행사 일정을 달력으로 한눈에 확인해보세요.
        </p>
      </div>
      <div class="month-nav">
        <button type="button" class="nav-btn" @click="goToPrevMonth">‹</button>
        <span class="month-nav__label">{{ year }}년 {{ month + 1 }}월</span>
        <button type="button" class="nav-btn" @click="goToNextMonth">›</button>
        <button type="button" class="today-btn" @click="goToToday">오늘</button>
      </div>
    </section>

    <div class="calendar-layout">
      <section class="calendar-card">
        <div class="calendar-grid calendar-grid--head">
          <span v-for="label in WEEK_LABELS" :key="label" class="calendar-grid__day-label">
            {{ label }}
          </span>
        </div>

        <div class="calendar-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="calendar-cell"
            :class="{
              'calendar-cell--outside': !cell.inCurrentMonth,
              'calendar-cell--today': cell.isToday,
              'calendar-cell--selected': isSelected(cell.date),
            }"
            @click="selectDate(cell.date)"
          >
            <span class="calendar-cell__date">{{ cell.date.getDate() }}</span>
            <span v-if="cell.events.length > 0" class="calendar-cell__badge">
              {{ cell.events.length }}
            </span>
          </button>
        </div>
      </section>

      <section class="day-panel">
        <h2 class="day-panel__title">
          {{ selectedDate ? formatFullDate(selectedDate) : '날짜를 선택하세요' }}
          <span v-if="selectedDayEvents.length > 0" class="day-panel__count">
            행사 {{ selectedDayEvents.length }}건
          </span>
        </h2>

        <div v-if="!selectedDate" class="empty-state">
          달력에서 날짜를 선택하면 해당 날짜의 행사 목록을 볼 수 있습니다.
        </div>
        <div v-else-if="selectedDayEvents.length === 0" class="empty-state">
          해당 날짜에 예정된 행사가 없습니다.
        </div>
        <ul v-else class="event-list">
          <li v-for="event in selectedDayEvents" :key="event.id" class="event-item">
            <button type="button" class="event-item__title" @click="openActionPopup(event)">
              {{ event.title }}
            </button>
            <span class="event-item__meta">
              {{ formatRange(event.start, event.end) }}
              <template v-if="event.place"> · {{ event.place }}</template>
            </span>
            <span v-if="event.addr" class="event-item__addr">{{ event.addr }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- 행사 선택 시 액션 팝업 -->
    <div v-if="actionPopupEvent" class="popup-overlay" @click.self="closeActionPopup">
      <div class="popup-box">
        <h3 class="popup-box__title">{{ actionPopupEvent.title }}</h3>
        <button type="button" class="popup-box__btn" @click="goToMapLocation(actionPopupEvent)">
          📍 위치 보기
        </button>
        <button
          type="button"
          class="popup-box__btn popup-box__btn--primary"
          @click="goToWritePost(actionPopupEvent)"
        >
          ✏️ 글 쓰기
        </button>
        <button type="button" class="popup-box__close" @click="closeActionPopup">닫기</button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useFestivalEvents } from '../composables/useFestivalEvents'

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const router = useRouter()
const { festivalEvents } = useFestivalEvents()

const today = new Date()
today.setHours(0, 0, 0, 0)

const currentDate = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(null)
const actionPopupEvent = ref(null)

const year = computed(() => currentDate.value.getFullYear())
const month = computed(() => currentDate.value.getMonth())

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function eventsOnDate(date) {
  return festivalEvents.value.filter((event) => date >= event.start && date <= event.end)
}

const calendarCells = computed(() => {
  const firstDayOfMonth = new Date(year.value, month.value, 1)
  const startOffset = firstDayOfMonth.getDay() // 0(일) ~ 6(토)
  const gridStart = new Date(year.value, month.value, 1 - startOffset)

  const cells = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    cells.push({
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date,
      inCurrentMonth: date.getMonth() === month.value,
      isToday: isSameDay(date, today),
      events: eventsOnDate(date),
    })
  }
  return cells
})

const selectedDayEvents = computed(() => {
  if (!selectedDate.value) return []
  return eventsOnDate(selectedDate.value)
})

function isSelected(date) {
  return selectedDate.value ? isSameDay(date, selectedDate.value) : false
}

function selectDate(date) {
  selectedDate.value = date
}

function goToPrevMonth() {
  currentDate.value = new Date(year.value, month.value - 1, 1)
}

function goToNextMonth() {
  currentDate.value = new Date(year.value, month.value + 1, 1)
}

function goToToday() {
  currentDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = today
}

function formatFullDate(date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatRange(start, end) {
  const fmt = (d) =>
    d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\s/g, '')
  return isSameDay(start, end) ? fmt(start) : `${fmt(start)} ~ ${fmt(end)}`
}

function openActionPopup(event) {
  actionPopupEvent.value = event
}

function closeActionPopup() {
  actionPopupEvent.value = null
}

async function goToMapLocation(event) {
  closeActionPopup()
  await router.push({ name: 'home' })
  await nextTick()
  window.dispatchEvent(
    new CustomEvent('locate-on-map', {
      detail: {
        id: event.id,
        name: event.title,
        addr: event.addr,
        lat: event.lat,
        lng: event.lng,
      },
    }),
  )
}

function goToWritePost(event) {
  closeActionPopup()
  router.push({
    name: 'community',
    query: {
      write: '1',
      mainCategory: 'festival',
      title: event.title,
    },
  })
}
</script>

<style scoped>
.calendar-view {
  max-width: 1500px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 36px 32px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%);
  box-shadow: var(--shadow-lg);
  margin-bottom: 24px;
}

.hero__eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #bfdbfe;
  margin-bottom: 8px;
}

.hero__title {
  margin: 0 0 8px;
  font-size: 30px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.hero__subtitle {
  margin: 0;
  font-size: 14px;
  color: #dbeafe;
  max-width: 480px;
}

.month-nav {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(4px);
}

.nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.month-nav__label {
  color: #fff;
  font-size: 14.5px;
  font-weight: 700;
  min-width: 92px;
  text-align: center;
}

.today-btn {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.today-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.calendar-layout {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 860px) {
  .calendar-layout {
    grid-template-columns: 1fr;
  }
}

.calendar-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 20px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-grid--head {
  margin-bottom: 8px;
}

.calendar-grid__day-label {
  text-align: center;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-muted);
  padding: 4px 0;
}

.calendar-cell {
  position: relative;
  aspect-ratio: 1 / 0.8;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  font-family: inherit;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.calendar-cell:hover {
  background: rgba(37, 99, 235, 0.05);
}

.calendar-cell--outside {
  opacity: 0.35;
}

.calendar-cell--today {
  border-color: var(--color-primary);
}

.calendar-cell--selected {
  background: rgba(37, 99, 235, 0.12);
  border-color: var(--color-primary);
}

.calendar-cell__date {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.calendar-cell__badge {
  margin-top: auto;
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #e91e8c;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.day-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 20px 24px;
  max-height: 640px;
  overflow-y: auto;
}

.day-panel__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  font-size: 15.5px;
  font-weight: 700;
  color: #111827;
}

.day-panel__count {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 3px 10px;
  border-radius: 999px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.event-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.event-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border);
}

.event-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.event-item__title {
  align-self: flex-start;
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-primary);
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.15s ease;
}

.event-item__title:hover {
  text-decoration-color: var(--color-primary);
}

.event-item__meta {
  font-size: 12.5px;
  color: #111827;
  font-weight: 600;
}

.event-item__addr {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 액션 팝업 */
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
}

.popup-box {
  width: 280px;
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popup-box__title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  line-height: 1.4;
}

.popup-box__btn {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: #fff;
  font-size: 13.5px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}

.popup-box__btn:hover {
  background: #f9fafb;
}

.popup-box__btn--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.popup-box__btn--primary:hover {
  background: #1d4ed8;
}

.popup-box__close {
  margin-top: 4px;
  padding: 8px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 12.5px;
  cursor: pointer;
}
</style>