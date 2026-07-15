<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__inner">
        <router-link to="/" class="app-header__logo">
          <span class="app-header__logo-badge">📍</span>
          <span class="app-header__logo-text">LocalHub</span>
        </router-link>
        <span class="app-header__tagline">서울 여행코스 & 주변 정보 지도</span>
      </div>
    </header>

    <main class="app-content">
      <router-view />
    </main>

    <footer class="app-footer">
      <div class="app-footer__inner">
        <span>© 2026 LocalHub</span>
        <span class="app-footer__dot">·</span>
        <span>Data by TourAPI 4.0 (한국관광공사)</span>
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
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header__inner {
  max-width: 1500px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header__logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #111827;
}

.app-header__logo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb, #1e3a8a);
  font-size: 14px;
}

.app-header__logo-text {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.app-header__tagline {
  font-size: 12.5px;
  color: var(--color-text-muted);
  padding-left: 12px;
  border-left: 1px solid var(--color-border);
}

.app-content {
  flex: 1;
  background: var(--color-bg);
}

.app-footer {
  background: #ffffff;
  border-top: 1px solid var(--color-border);
}

.app-footer__inner {
  max-width: 1500px;
  margin: 0 auto;
  padding: 18px 24px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

.app-footer__dot {
  margin: 0 6px;
}
</style>