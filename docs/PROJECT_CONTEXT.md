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
- `src/components/layout/`: 페이지 폭/패딩과 고정 상단바 같은 레이아웃 primitive를 담당한다.
- `src/components/ui/`: 버튼, 아이콘, 카드, 배지, 필드, 모달, disclosure/select/keypad field 같은 공용 UI primitive를 담당한다.
- `src/pages/CustomerManager.jsx`: 고객 목록 화면의 상태와 저장/삭제 흐름을 조율한다.
- `src/pages/customerManager/`: 고객 헤더, 고객 리스트, 고객 폼 모달을 분리해 둔 폴더다.
- `src/pages/ChartDetail.jsx`: 차트 상세 화면의 데이터 로드, 저장 트리거, 화면 조립을 조율한다.
- `src/pages/chartDetail/`: 상단바, 스펙 카드, 작업내용, 도면 뷰어, 입력폼, 모달, 유틸 바텀시트, 차트 상세 전용 hook을 분리해 둔 폴더다.
- `src/pages/chartDetail/useHistoryRecords.js`: 차트 히스토리 목록, 저장, 삭제, 이름 변경 흐름을 `localStorage` 저장소 계약 위에 얇게 감싼다.
- `src/pages/chartDetail/useMemoOverlay.jsx`: 메모 배치, 드래그, 활성 메모 편집 상태와 오버레이 렌더링을 담당한다.
- `src/lib/customerStorage.js`: 고객 목록 저장소 읽기/쓰기 계약을 담당하며, malformed JSON이나 배열이 아닌 값은 읽기 fallback만 하고 즉시 덮어쓰지 않는다.
- `src/lib/chartHistoryStorage.js`: 고객별 차트 히스토리 저장/마이그레이션/삭제 계약을 담당한다.
- `vite.config.js`: React, HTTPS dev server, PWA manifest 설정을 담당한다.
- `playwright.config.js`: production build를 정적 서버로 띄우고 Chromium E2E를 실행한다.
- `eslint.config.js`: CI에서 사용하는 lint 기준이다.
- `docs/UI_GUIDE.md`: UI 색상, 카드, 버튼, 모달 기준을 고정한다.
- `docs/GEMINI_TASK_TEMPLATE.md`: Gemini에게 작업을 줄 때 쓰는 요청 템플릿이다.
- `test/siteSmoke.test.js`: Vite SSR 로딩으로 앱 쉘과 차트 상세 초기 렌더가 깨지지 않는지 확인한다.
- `e2e/app-flow.spec.js`: 실제 브라우저에서 고객 생성과 차트 저장 흐름을 확인한다.
- `scripts/generate-icons.mjs`: PWA PNG/maskable 아이콘을 재생성한다.
- `scripts/serve-dist.mjs`: Playwright가 `dist/` 산출물을 HTTP로 검증할 때 사용하는 정적 서버다.
- `scripts/context-pack.mjs`: Gemini 웹에 붙여넣을 full/light 컨텍스트를 생성한다.
- `scripts/gemini-prompt.mjs`: UI/버그/E2E/데이터 작업용 짧은 Gemini 프롬프트를 생성한다.
- `docs/VIBE_CODING_GUIDE.md`: 바이브코딩 작업자가 에이전트에게 요청할 때 쓰는 구조/요청 가이드다.

## 현재 데이터 모델

고객 목록:

```text
localStorage["bowling_customers"]
```

읽기 실패, malformed JSON, 배열이 아닌 값은 화면 상태에서 빈 목록으로만 fallback하고, 고객 추가/수정/삭제 같은 명시적 변경이 있을 때만 다시 저장한다.

차트 히스토리:

```text
localStorage[`chart_history_v8_${customer.id}`]
```

기존 사용자를 위해 `chart_history_v7_${customer.name}`와 `chart_history_${customer.name}`는 읽기 시 v8 키로 복사된다. v8 키가 빈 배열이고 legacy 키에 기록이 남아 있으면 legacy 기록을 우선 복구한다. 새 저장은 id 기반 v8 키만 사용한다.

## 핵심 사용자 흐름

1. 고객 목록에서 고객을 생성하거나 선택한다.
2. 선택한 고객의 차트 상세로 이동한다.
3. 쓰리핑거/덤리스, 손 방향, 피치, 스팬, 엄지 상세, 볼러 스펙, 작업 내용을 입력한다.
4. 저장하면 해당 고객의 히스토리에 최신 기록으로 쌓인다.
5. 유틸리티 바텀시트에서 메모와 저장 기록을 다룬다.

## 유지해야 할 불변조건

- 기존 `localStorage` 데이터를 삭제하거나 읽을 수 없게 만들지 않는다.
- 새 화면/카드/버튼은 `src/components/layout/`과 `src/components/ui/` primitive를 먼저 사용한다.
- raw emoji를 화면 JSX에 직접 넣지 않는다. 필요한 경우 `src/components/ui/Icon.jsx`에 아이콘을 추가한다.
- 고객의 사용 손은 도면 표시 방향과 연결된다.
- 덤리스/투핸드 스타일은 엄지 영역 표시 여부와 연결된다.
- 모바일 폭 `540px` 기준 도면 레이아웃을 유지한다.
- PWA 빌드가 깨지지 않아야 한다.

## 알려진 개선 과제

- Playwright E2E 범위를 히스토리와 나가기 경고까지 확장한다.
- 차트 입력 primitive를 다른 입력 화면까지 무리하게 확장하기 전 모바일 회귀를 확인한다.
- 주요 화면 Playwright screenshot smoke를 추가해 디자인 회귀를 잡는다.
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
