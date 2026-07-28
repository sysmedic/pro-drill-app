# Drilling Chart Project Context

## 한 줄 요약

볼링 지공 차트를 고객별로 작성하고, 작업 이력과 메모를 로컬 데이터베이스(IndexedDB / LocalStorage) 및 구글 드라이브 백업으로 관리하는 모바일 우선 PWA 앱이다.

## 기술 스택

- Vite
- React 19
- Tailwind CSS
- vite-plugin-pwa (PWA Manifest, Service Worker)
- **IndexedDB / LocalStorage** (로컬 데이터 영속화 및 다중 탭 동기화 지원)
- **Google Drive Backup & Restore** (사용자 라이선스 연동 및 백업 데이터 동기화)

## 주요 파일

- `src/useAppSession.js`: 로컬 가상 지공사 세션 정보(`LOCAL_USER`)를 생성하고, 라이선스 상태에 따른 차트 한도 등을 판정한다.
- `src/AppLocker.jsx`: 동시 기기 접속 한도 초과 시, 메인 화면을 가리고 접속을 차단하는 락 스크린 화면 컴포넌트다.
- `src/App.jsx`: 고객 목록 화면과 차트 상세 화면 전환 및 인증 상태에 따른 로그인/차단 레이어를 조율한다.
- `src/components/layout/`: 페이지 폭/패딩과 고정 상단바 같은 레이아웃 primitive를 담당한다.
- `src/components/ui/`: 버튼, 아이콘, 카드, 배지, 필드, 모달, 확인/입력/토스트 dialog, disclosure/select/keypad field 같은 공용 UI primitive를 담당한다.
- `src/pages/CustomerManager.jsx`: 고객 목록 화면의 상태와 저장/삭제 흐름을 조율하며, 로컬 DB(IndexedDB / LocalStorage)와 데이터를 싱크한다.
- `src/pages/customerManager/`: 고객 헤더, 고객 리스트, 고객 폼 모달을 분리해 둔 폴더다.
- `src/pages/ChartDetail.jsx`: 차트 상세 화면의 데이터 로드, 저장 트리거, 화면 조립을 조율한다.
- `src/pages/chartDetail/`: 상단바, 스펙 카드, 작업내용, 도면 뷰어, 입력폼, 모달, 유틸 바텀시트, 차트 상세 전용 hook을 분리해 둔 폴더다.
- `src/services/authService.js` / `src/services/chartService.js`: 로그인/로그아웃 및 차트 저장을 제어하는 공용 비즈니스 서비스 레이어다.
- `src/lib/device.js`: 기기 고유 식별자(`getDeviceId`) 생성을 담당한다.
- `src/lib/ids.js`: 고객/차트/메모 고유 ID 생성을 `createLocalId()`로 통일한다.
- `src/lib/customerSchema.js` / `customerStorage.js`: 스키마 데이터 형식 검증 및 로컬 테스트/폴백 저장소를 담당한다.
- `vite.config.js`: React, HTTPS dev server, PWA manifest 설정을 담당한다.
- `playwright.config.js`: production build를 정적 서버로 띄우고 Chromium/Mobile E2E를 실행한다.
- `eslint.config.js`: CI에서 사용하는 lint 기준이다.
- `e2e/visual-layout.spec.js`: 390px, 540px, desktop에서 상단바/본문/하단 시트의 좌우 기준선이 어긋나지 않는지 확인하고 QA screenshot을 첨부한다.
- `e2e/korean-ime.spec.js`: 모달 한글 조합 입력이 조각나지 않는지 확인한다.
- `e2e/storage-failure.spec.js`: DB 저장 실패 시 실패 토스트가 뜨고 화면 상태가 dirty로 유지되는지 검증한다.
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

### 1. 사용자 등급 및 라이선스
* **라이선스 체크**: 구글 드라이브 백업 연동 및 정식 지공사 이메일 인증을 통해 라이선스를 검증하며, 유예 기간(90일) 초과 시 라이선스 게이트가 가동됩니다.

### 2. 고객 명단
* **구조**: `{ id, name, phone, club, gender, hand, style, styleExtra, createdAt, updatedAt }`
* **저장**: IndexedDB `customers` 객체 스토어 및 localStorage에 교차 적재 및 정규화(Normalize) 검증을 수행합니다.

### 3. 지공 차트 및 히스토리
* **구조**: 지공 레이아웃 데이터(피치, 스팬, 홀 정보, 사용 손 등), 작성 일자(`createdAt`, `updatedAt`) 정보를 갖습니다.
* **저장**: IndexedDB `chartHistories` 객체 스토어에서 고객 고유 `customerId`를 기준으로 배열 형태로 적재합니다.

## 핵심 사용자 흐름

1. **라이선스 확인**: 로컬 최초 구동 일자로부터 유예 기간을 판정하며, 필요 시 구글 드라이브 API를 통한 이메일 인증으로 라이선스를 갱신합니다.
2. **고객 관리**: 고객 목록에서 고객을 검색/정렬하거나 새로운 고객을 생성 및 기존 정보를 수정/삭제합니다. (IndexedDB 및 LocalStorage 로컬 싱크)
3. **차트 상세 입력**: 쓰리핑거/덤리스, 사용 손(좌/우), 피치, 스팬, 엄지 상세, 볼러 스펙, 작업 내용을 입력합니다.
4. **차트 저장**: 로컬 IndexedDB에 최신 기록으로 적재되며, 구글 드라이브 백업 설정 시 3초 후 백그라운드 자동 백업이 실행됩니다.
5. **유틸리티 바텀시트**: 히스토리 조회, 메모 핀 배치 및 드래그 보드를 통해 보강 작업을 수행합니다.

## 유지해야 할 불변조건

- 로컬 데이터베이스의 스키마 계약을 깨트리지 않으며, 마이그레이션 및 정규화 필터를 손상시키지 않는다.
- 새 화면/카드/버튼은 `src/components/layout/`과 `src/components/ui/` primitive를 우선 사용한다.
- raw emoji를 화면 JSX에 직접 넣지 않는다. 필요한 경우 `src/components/ui/Icon.jsx`에 아이콘을 정의하여 주입한다.
- 고객의 사용 손은 도면 표시 방향과 연결되어야 한다.
- 덤리스/투핸드 스타일은 엄지 영역 표시 여부와 연결되어야 한다.
- 모바일 폭 `540px` 기준 도면 레이아웃 및 뷰포트 밀도를 준수해야 한다.
- PWA 빌드(manifest, service worker)가 깨지지 않아야 한다.

## 알려진 개선 과제

- 구글 드라이브 API 및 백업 로직의 Mocking 테스트를 보강하여 격리 검증 수준을 높인다.
- 네이티브 브라우저 다이얼로그(`alert`/`confirm`/`prompt`)를 사용하는 컴포넌트들을 제거하고, 공용 컴포넌트(`ConfirmModal`, `TextInputModal`, `FeedbackToast`)로의 이전을 전면 완료한다.
- 주요 화면의 Playwright screenshot baseline을 추가하여 디자인 회귀를 잡는다.
- 모달 접근성과 키보드 탭 인덱스 및 포커스 랩(Focus Trap) 조작성을 보강한다.

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
