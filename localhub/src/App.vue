<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__inner">
        <router-link to="/" class="app-header__logo">
          <span class="app-header__logo-icon">📍</span>
          LocalHub
        </router-link>
        <span class="app-header__tagline">서울 여행코스 & 주변 정보 지도</span>
      </div>
    </header>

    <main class="app-content">
      <router-view />
    </main>

    <footer class="app-footer">
      <div class="app-footer__inner">
        © 2026 LocalHub. Data by TourAPI 4.0 (한국관광공사)
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header__inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-header__logo {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.app-header__logo-icon {
  font-size: 18px;
}

.app-header__tagline {
  font-size: 13px;
  color: #6b7280;
}

.app-content {
  flex: 1;
  background: #f7f8fa;
}

.app-footer {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
}

.app-footer__inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 20px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}
</style>