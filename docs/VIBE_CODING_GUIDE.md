# 바이브코딩 에이전트 요청 가이드

이 파일은 Gemini 웹, Codex, 다른 AI 에이전트에게 이 프로젝트 작업을 맡길 때 쓰는 요청서 기준이다. 새 세션에서 컨텍스트가 끊겼다면 이 파일과 `npm run context` 출력을 먼저 전달한다.

## 프로젝트 요약

이 앱은 볼링 지공사가 모바일/PWA 환경에서 고객별 지공 차트, 작업 기록, 메모를 로컬 데이터베이스(IndexedDB / LocalStorage) 및 구글 드라이브 백업으로 관리하는 React 앱이다.

## 현재 구조

- `src/useAppSession.js`: 로컬 가상 지공사 세션 정보(`LOCAL_USER`)를 생성하고, 라이선스 상태에 따른 차트 한도 등을 판정한다.
- `src/App.jsx`: 고객 목록 화면과 차트 상세 화면 사이의 최상위 전환 및 인증 상태에 따른 로그인/차단 레이어를 조율한다.
- `src/AppLocker.jsx`: 핀 코드 입력을 통한 화면 잠금 기능을 제공한다.
- `src/pages/CustomerManager.jsx`: 고객 목록, 검색, 고객 생성/수정/삭제 흐름을 처리하며 로컬 DB(IndexedDB / LocalStorage)와 데이터를 싱크한다.
- `src/pages/customerManager/`: 고객 목록 화면의 헤더, 리스트, 고객 폼 모달 컴포넌트가 있다.
- `src/pages/ChartDetail.jsx`: 차트 상세 화면의 상태, 저장, 메모 핀 배치, 히스토리, 나가기 확인 흐름을 조율하는 화면 컨테이너다.
- `src/pages/chartDetail/`: 차트 상단바, 볼러 스펙, 작업내용, 도면, 입력폼, 모달, 유틸 바텀시트 컴포넌트가 있다.
- `src/lib/`: 고객 스키마 유효성 검증 및 장치 식별(`device.js`), ID 생성(`ids.js`), 로컬 스토리지 규약, 구글 드라이브 백업(`googleDriveBackup.js`), 자동 동기화 허브(`syncService.js`) 코드가 있다.
- `test/`: Node 내장 테스트 기반 단위/계약 테스트가 있다.
- `e2e/`: Playwright 기반 실제 브라우저 플로우 테스트가 있다.
- `docs/`: AI 작업 컨텍스트, UI 가이드, 요청 템플릿, CI/CD, 세션 상태, 바이브코딩 요청 가이드가 있다.
- `.github/workflows/`: CI와 GitHub Pages 배포 워크플로가 있다.

## 에이전트에게 먼저 시킬 일

새 세션을 시작할 때는 아래처럼 요청한다.

Gemini 웹처럼 파일을 직접 읽지 못하는 도구라면, 작업 범위에 따라 먼저 아래 중 하나를 붙여넣는다.

```bash
npm run context:light
npm run context -- --mode ui
npm run context -- --mode data
npm run context -- --mode e2e
npm run context
```

일상적인 UI/버그/E2E/저장 로직 작업 요청은 아래 명령으로 짧은 프롬프트를 만든 뒤 빈칸만 채운다.

```bash
npm run prompt:ui
npm run prompt:fix
npm run prompt:e2e
npm run prompt:data
```

```text
이 프로젝트는 볼링 지공 차트 PWA다.
먼저 GEMINI.md, docs/VIBE_CODING_GUIDE.md, docs/UI_GUIDE.md, docs/GEMINI_TASK_TEMPLATE.md, docs/PROJECT_CONTEXT.md, docs/SESSION_STATE.md를 읽고 현재 구조와 우선순위를 요약해줘.
CI/E2E/배포 작업이면 docs/CI_CD.md도 읽어줘.
작업 전에는 git status --short --branch로 변경분을 확인하고, 변경 범위를 짧게 말해줘.
작업 후에는 npm run check 결과, 필요한 경우 npm run e2e 또는 npm run check:e2e 결과, docs/SESSION_STATE.md 갱신 내용을 알려줘.
로컬 데이터베이스(IndexedDB/LocalStorage)의 스키마 계약을 깨지 않게 작업해줘.
```

## 좋은 요청 형식

에이전트에게 일을 맡길 때는 아래 7가지를 한 번에 준다.

1. 목표: 사용자가 어떤 화면에서 무엇을 할 수 있어야 하는지 적는다.
2. 범위: 건드려도 되는 파일이나 영역을 적는다.
3. 금지 조건: IndexedDB 및 LocalStorage 데이터 스키마 계약, 모바일 레이아웃처럼 깨지면 안 되는 것을 적는다.
4. 디자인 기준: UI 작업은 `docs/UI_GUIDE.md`를 따르게 한다.
5. 완료 기준: 화면 동작, 테스트, 문서 갱신 조건을 적는다.
6. 검증 명령: 기본은 `npm run check`, 화면 흐름 변경은 `npm run check:e2e`를 요구한다.
7. 보고 방식: 바뀐 파일, 테스트 결과, 남은 리스크를 짧게 보고하게 한다.

요청에 없는 메인 화면 UI, 버튼, 사용자 흐름은 추가하지 말라고 명시한다. 에이전트가 필요하다고 판단한 기능이 있어도 먼저 제안만 하고, 승인 전에는 구현하지 않게 한다.
새 작업을 줄 때는 `docs/GEMINI_TASK_TEMPLATE.md`를 복사해 목표, 수정 가능 파일, 수정 금지, 완료 기준을 채운다.
반복 작업은 문서를 직접 복사하지 말고 `npm run prompt:*` 출력에서 빈칸만 채워 사용한다.
`npm run prompt:*`가 출력하는 필수 읽기 목록과 공통 수정 금지 블록은 삭제하지 않는다.

## 요청 예시

작은 UI 수정:

```text
고객 목록의 검색 입력 영역을 모바일 540px 폭에서 더 읽기 쉽게 정리해줘.
src/pages/CustomerManager.jsx와 src/pages/customerManager/* 범위에서만 작업해줘.
docs/UI_GUIDE.md의 기존 slate/indigo 색상, 카드, 입력 기준을 따라줘.
요청하지 않은 버튼이나 새 흐름은 추가하지 말고, 완료 후 npm run check를 실행해줘.
```

로컬 저장 구조 및 백업 변경:

```text
구글 드라이브 백업 성능을 보강하고 싶어.
먼저 src/lib/syncService.js와 googleDriveBackup.js를 읽고 백업 흐름을 설명해줘.
데이터 구조를 깨지 않고, 네트워크 에러 발생 시 예외 처리를 보강해줘.
변경 후 npm run check와 로컬 단위 테스트 결과를 리포트해줘.
```

실체 브라우저 플로우 추가:

```text
Playwright E2E에 신규 고객 등록 및 로컬 데이터 검증 흐름을 추가해줘.
e2e/app-flow.spec.js와 필요한 테스트 유틸 범위에서 작업하고, production dist를 대상으로 검증하는 현재 구조는 유지해줘.
완료 후 npm run check:e2e를 실행해줘.
```

리팩터링:

```text
ChartDetail.jsx가 다시 커지고 있는지 확인하고, 화면 동작을 바꾸지 않는 선에서 컴포넌트 분리가 필요한 부분만 제안하고 진행해줘.
src/pages/ChartDetail.jsx와 src/pages/chartDetail/* 범위에서 작업해줘.
불필요한 새 추상화는 만들지 말고 기존 컴포넌트 패턴을 따라줘.
완료 후 npm run check를 실행하고 docs/SESSION_STATE.md를 갱신해줘.
```

리뷰:

```text
현재 diff를 코드 리뷰해줘.
버그, 회귀 위험, 테스트 누락을 우선순위대로 파일/라인과 함께 알려줘.
수정이 필요한 부분은 바로 고치고 npm run check까지 실행해줘.
```

## 병렬 에이전트로 나눌 때

동시에 여러 에이전트를 쓴다면 파일 소유권을 먼저 나눈다. 같은 파일을 여러 에이전트가 고치게 하면 충돌과 되돌림이 쉽게 생긴다.

- UI 에이전트: `src/pages/**`, `src/index.css`, `tailwind.config.js`
- 데이터/DB 에이전트: `src/lib/**`, `test/**Storage.test.js`
- E2E/CI 에이전트: `e2e/**`, `playwright.config.js`, `.github/workflows/**`, `scripts/serve-dist.mjs`
- 문서/Git 에이전트: `README.md`, `GEMINI.md`, `docs/**`, `.gitignore`

병렬 작업 후에는 한 에이전트에게 통합 검증만 맡긴다. 통합 검증의 기본 명령은 `git status --short --branch`, `npm run check`, 화면 흐름 변경이 있으면 `npm run check:e2e`다.

## 절대 깨면 안 되는 계약

- 로컬 데이터베이스의 스키마 계약을 깨트려서는 안 된다.
- 요청받지 않은 메인 화면 UI, 버튼, 사용자 흐름을 추가하지 않는다.
- UI 변경은 `docs/UI_GUIDE.md`의 색상, 카드, 버튼, 모달 기준을 따른다.
- 고객의 사용 손은 도면 방향에 반영되어야 한다.
- 덤리스/투핸드 스타일은 엄지 영역 표시 여부에 반영되어야 한다.
- 모바일 폭 `540px` 기준으로 주요 화면이 깨지면 안 된다.
- PWA manifest, 아이콘, service worker build가 깨지면 안 된다.

## 완료 기준

에이전트 작업은 아래가 끝나야 완료로 본다.

- 변경 의도와 실제 변경 파일이 일치한다.
- `npm run check`가 통과한다.
- 실제 화면 흐름을 바꿨다면 `npm run e2e` 또는 `npm run check:e2e`가 통과한다.
- DB 저장 구조를 바꿨다면 이에 상응하는 테스트가 보강되어야 한다.
- AI 작업 맥락이 바뀌었다면 `docs/SESSION_STATE.md`가 갱신되어 있다.
- 새 세션 복구에 필요한 내용이면 `GEMINI.md`, `docs/PROJECT_CONTEXT.md`, `docs/CI_CD.md`, `README.md` 중 필요한 문서에 연결되어 있다.
