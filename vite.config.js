import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl' // ⭐️ 이 부분이 추가되었습니다!

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    basicSsl(), // ⭐️ 안드로이드 PWA 설치를 위한 HTTPS 가짜 인증서 생성
    VitePWA({
      registerType: 'autoUpdate', // 앱이 업데이트되면 자동으로 새로고침
      devOptions: {
        enabled: true // 개발 환경에서도 PWA 테스트 가능하게 켜기
      },
      manifest: {
        name: 'Bowling Chart', // 앱 전체 이름
        short_name: '지공차트', // 바탕화면 아이콘 아래에 표시될 짧은 이름
        description: '오프라인 볼링 지공 차트 앱',
        lang: 'ko',
        theme_color: '#ffffff', // 상단 상태바 색상
        background_color: '#ffffff',
        display: 'standalone', // 브라우저 주소창을 없애고 진짜 앱처럼 보이게 함
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
