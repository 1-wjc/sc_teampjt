import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CommunityView from '../views/Communityview.vue'
import CalendarView from '../views/CalendarView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/community', name: 'community', component: CommunityView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
  ],
})

export default router