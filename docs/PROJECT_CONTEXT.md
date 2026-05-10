# Drilling Chart Project Context

## 한 줄 요약

볼링 지공 차트를 고객별로 작성하고, 작업 이력과 메모를 브라우저 `localStorage`에 저장하는 모바일 우선 PWA 앱이다.

## 기술 스택

- Vite
- React 19
- Tailwind CSS
- vite-plugin-pwa
- 브라우저 `localStorage` 기반 오프라인 저장

## 주요 파일

- `src/App.jsx`: 고객 목록 화면과 차트 상세 화면 전환을 담당한다.
- `src/pages/CustomerManager.jsx`: 고객 목록 화면의 상태와 저장/삭제 흐름을 조율한다.
- `src/pages/customerManager/`: 고객 헤더, 고객 리스트, 고객 폼 모달을 분리해 둔 폴더다.
- `src/pages/ChartDetail.jsx`: 차트 상세 화면의 상태, 저장, 메모 좌표 흐름을 조율한다.
- `src/pages/chartDetail/`: 상단바, 스펙 카드, 작업내용, 도면 뷰어, 입력폼, 모달, 유틸 바텀시트를 분리해 둔 차트 상세 하위 컴포넌트 폴더다.
- `src/lib/chartHistoryStorage.js`: 고객별 차트 히스토리 저장/마이그레이션/삭제 계약을 담당한다.
- `vite.config.js`: React, HTTPS dev server, PWA manifest 설정을 담당한다.
- `playwright.config.js`: production build를 정적 서버로 띄우고 Chromium E2E를 실행한다.
- `eslint.config.js`: CI에서 사용하는 lint 기준이다.
- `test/siteSmoke.test.js`: Vite SSR 로딩으로 앱 쉘과 차트 상세 초기 렌더가 깨지지 않는지 확인한다.
- `e2e/app-flow.spec.js`: 실제 브라우저에서 고객 생성과 차트 저장 흐름을 확인한다.
- `scripts/generate-icons.mjs`: PWA PNG/maskable 아이콘을 재생성한다.
- `scripts/serve-dist.mjs`: Playwright가 `dist/` 산출물을 HTTP로 검증할 때 사용하는 정적 서버다.
- `docs/VIBE_CODING_GUIDE.md`: 바이브코딩 작업자가 에이전트에게 요청할 때 쓰는 구조/요청 가이드다.

## 현재 데이터 모델

고객 목록:

```text
localStorage["bowling_customers"]
```

차트 히스토리:

```text
localStorage[`chart_history_v8_${customer.id}`]
```

기존 사용자를 위해 `chart_history_v7_${customer.name}`와 `chart_history_${customer.name}`는 읽기 시 v8 키로 복사된다. 새 저장은 id 기반 v8 키만 사용한다.

## 핵심 사용자 흐름

1. 고객 목록에서 고객을 생성하거나 선택한다.
2. 선택한 고객의 차트 상세로 이동한다.
3. 쓰리핑거/덤리스, 손 방향, 피치, 스팬, 엄지 상세, 볼러 스펙, 작업 내용을 입력한다.
4. 저장하면 해당 고객의 히스토리에 최신 기록으로 쌓인다.
5. 유틸리티 바텀시트에서 메모와 저장 기록을 다룬다.

## 유지해야 할 불변조건

- 기존 `localStorage` 데이터를 삭제하거나 읽을 수 없게 만들지 않는다.
- 고객의 사용 손은 도면 표시 방향과 연결된다.
- 덤리스/투핸드 스타일은 엄지 영역 표시 여부와 연결된다.
- 모바일 폭 `540px` 기준 도면 레이아웃을 유지한다.
- PWA 빌드가 깨지지 않아야 한다.

## 알려진 개선 과제

- Playwright E2E 범위를 히스토리와 나가기 경고까지 확장한다.
- 저장소 관련 UI 핸들러를 `src/lib/chartHistoryStorage.js` 쪽으로 더 얇게 분리한다.
- 모달 접근성과 키보드 조작성을 보강한다.

## 품질 기준

기본 검증은 아래 하나로 통일한다.

```bash
npm run check
```

이 명령은 `test`, `lint`, production `build`를 함께 실행한다.

브라우저 플로우를 포함한 전체 검증은 아래를 사용한다.

```bash
npm run check:e2e
```
