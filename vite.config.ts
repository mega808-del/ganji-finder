import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages 처럼 하위 경로(/저장소이름/)에 배포해도 동작하도록 상대 경로 사용
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 새 버전이 배포되면 자동으로 갱신
      registerType: 'autoUpdate',
      // Service Worker 등록은 src/main.tsx 에서 직접 수행
      injectRegister: false,
      // public/manifest.json 을 직접 관리하므로 자동 생성은 끈다
      manifest: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true },
});
