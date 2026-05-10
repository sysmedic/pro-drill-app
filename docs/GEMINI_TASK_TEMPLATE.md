# Gemini Task Template

Gemini에게 작업을 맡길 때 아래 형식을 그대로 복사해 사용한다. 빈칸을 채우기 어렵다면 작업 범위가 아직 너무 넓은 것이다.
웹 세션에 파일을 직접 붙여넣어야 한다면 작업 유형별 컨텍스트를 먼저 만든다.

```bash
npm run context:light
npm run context -- --mode ui
npm run context -- --mode data
npm run context -- --mode e2e
npm run context
```

## 기본 템플릿

```text
이 프로젝트는 볼링 지공 차트 PWA다.
먼저 아래 필수 파일을 읽고 작업 범위를 확인해줘.
- GEMINI.md
- docs/VIBE_CODING_GUIDE.md
- docs/UI_GUIDE.md
- docs/GEMINI_TASK_TEMPLATE.md
- docs/PROJECT_CONTEXT.md
- docs/SESSION_STATE.md
CI/E2E/배포 작업이면 docs/CI_CD.md도 읽어줘.

목표:
- [사용자가 어떤 화면에서 무엇을 할 수 있어야 하는지]

수정 가능 파일:
- [예: src/pages/customerManager/CustomerHeader.jsx]

수정 금지:
- 요청하지 않은 새 버튼/새 화면/새 사용자 흐름 추가 금지
- localStorage 키와 기존 고객/히스토리 데이터 구조 변경 금지
- 관련 없는 리팩터링, 파일 이동, 새 라이브러리 추가 금지
- 새 색상 팔레트, 새 버튼 타입, 새 모달 패턴 추가 금지
- native alert/confirm/prompt 추가 금지
- 저장/삭제/마이그레이션 로직 변경 금지, 단 데이터 작업으로 명시한 경우 제외

디자인 기준:
- docs/UI_GUIDE.md를 따른다.
- 기존 slate/indigo 색상과 카드/버튼 밀도를 유지한다.
- 모바일 390px, 540px에서 텍스트가 넘치지 않아야 한다.

완료 기준:
- 변경 의도와 실제 변경 파일이 일치한다.
- npm run check 통과
- 화면 흐름을 바꿨다면 npm run e2e 또는 npm run check:e2e 통과
- 작업 맥락이 바뀌면 docs/SESSION_STATE.md 갱신

보고 방식:
- 바뀐 파일
- 실행한 검증 명령과 결과
- 남은 리스크
```

## UI 수정 템플릿

```text
[화면/컴포넌트]의 [구체적인 UI 문제]만 고쳐줘.

수정 가능 파일:
- [UI 파일]
- [필요한 하위 컴포넌트]

수정 금지:
- 데이터 저장 로직 변경 금지
- 새 기능 추가 금지
- alert/confirm/prompt 추가 금지

디자인 기준:
- docs/UI_GUIDE.md를 따른다.
- 기존 카드/버튼/입력 스타일과 맞춘다.

검증:
- npm run check
```

## 데이터/저장 로직 템플릿

```text
[저장 로직 문제]를 고쳐줘.

먼저 읽을 파일:
- src/lib/storageKeys.js
- src/lib/chartHistoryStorage.js
- test/chartHistoryStorage.test.js

반드시 유지:
- localStorage["bowling_customers"]
- chart_history_v8_${customer.id}
- chart_history_v7_${customer.name}
- chart_history_${customer.name}

완료 기준:
- 기존 데이터 마이그레이션 테스트 유지 또는 추가
- npm run check 통과
```

## E2E 추가 템플릿

```text
Playwright E2E에 [구체적인 사용자 흐름]을 추가해줘.

수정 가능 파일:
- e2e/app-flow.spec.js
- 필요한 경우 playwright.config.js 또는 scripts/serve-dist.mjs

유지:
- production dist를 대상으로 검증하는 현재 구조
- 기존 고객 생성/차트 저장 테스트

검증:
- npm run check:e2e
```
