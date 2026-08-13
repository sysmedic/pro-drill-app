import fs from "node:fs";

const getBuildDateString = () => {
  // Vercel 빌드 서버는 UTC 기준 - 한국 시간(KST = UTC+9) 변환
  const now = new Date();
  const kstOffset = 9 * 60; // 분 단위
  const kst = new Date(now.getTime() + (kstOffset * 60 * 1000));
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, "0")}.${String(kst.getUTCDate()).padStart(2, "0")} ${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")} (KST)`;
};

const currentBuildDate = getBuildDateString();

const versionPlugin = () => ({
  name: "generate-version-json",
  buildStart() {
    try {
      if (!fs.existsSync("public")) {
        fs.mkdirSync("public", { recursive: true });
      }
      fs.writeFileSync("public/version.json", JSON.stringify({
        buildDate: currentBuildDate,
        timestamp: Date.now()
      }, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to generate version.json", e);
    }
  }
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  define: {
    __APP_BUILD_DATE__: JSON.stringify(currentBuildDate),
  },
  base: process.env.VITE_BASE_PATH || '/',
  
  // 빌드 시 크롬 개발자 도구에 원본 소스코드가 노출되는 것을 차단합니다.
  build: {
    sourcemap: false,
  },
  
  server: {
    host: true,
    /* 🎯 [보안 벽 해제]: localtunnel, ngrok 등 외부 포워딩 주소의 호스트 차단 오류 원천 해결 */
    allowedHosts: true, 
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  
  plugins: [
    versionPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'ProDrill',
        short_name: 'ProDrill',
        description: '프로페셔널 지공 매니저 ProDrill',
        lang: 'ko',
        orientation: 'portrait-primary',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})