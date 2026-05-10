const mode = process.argv[2] || 'help'

const canonicalReadList = [
  'GEMINI.md',
  'docs/VIBE_CODING_GUIDE.md',
  'docs/UI_GUIDE.md',
  'docs/GEMINI_TASK_TEMPLATE.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/SESSION_STATE.md',
]

const commonForbidden = [
  '요청하지 않은 새 버튼/새 화면/새 사용자 흐름 추가 금지',
  'localStorage 키와 기존 고객/히스토리 데이터 구조 변경 금지',
  '관련 없는 리팩터링, 파일 이동, 새 라이브러리 추가 금지',
  '새 색상 팔레트, 새 버튼 타입, 새 모달 패턴 추가 금지',
  'native alert/confirm/prompt 추가 금지',
]

const formatList = (items) => items.map((item) => `- ${item}`).join('\n')

const commonHeader = (contextCommand) => `이 프로젝트는 볼링 지공 차트 PWA다.
먼저 아래 필수 파일을 읽고 작업해줘.
${formatList(canonicalReadList)}
CI/E2E/배포 작업이면 docs/CI_CD.md도 읽어줘.
Gemini 웹처럼 파일을 직접 못 읽는 세션이면 먼저 ${contextCommand} 출력 전체를 붙여넣고 시작해줘.
작업 전에는 git status --short --branch로 변경분을 확인하고, 변경 범위를 짧게 말해줘.
기존 localStorage 데이터와 저장키를 깨지 않게 작업해줘.`

const forbiddenBlock = `공통 수정 금지:
${formatList(commonForbidden)}`

const prompts = {
  ui: `${commonHeader('npm run context -- --mode ui')}

목표:
- [화면/컴포넌트의 구체적인 UI 문제를 적기]

수정 가능 파일:
- [예: src/pages/customerManager/CustomerHeader.jsx]

${forbiddenBlock}
- 데이터 저장/삭제/마이그레이션 로직 변경 금지

디자인 기준:
- docs/UI_GUIDE.md를 따른다.
- 기존 slate/indigo 색상, 카드, 버튼, 입력 밀도를 유지한다.
- 모바일 390px와 540px에서 텍스트가 넘치지 않아야 한다.

완료 기준:
- npm run check 통과
- docs/SESSION_STATE.md 갱신
- 바뀐 파일과 남은 리스크 짧게 보고`,

  fix: `${commonHeader('npm run context:light')}

목표:
- [현재 에러/버그를 구체적으로 적기]

먼저 할 일:
- 에러 재현 또는 관련 테스트 확인
- 관련 파일만 읽고 원인을 좁힌 뒤 최소 수정

${forbiddenBlock}
- 원인과 무관한 UI 개선 추가 금지
- 저장 구조, 고객 삭제 흐름, 마이그레이션 로직 변경 금지

완료 기준:
- npm run check 통과
- 필요한 경우 실패했던 명령 재실행
- docs/SESSION_STATE.md 갱신
- 원인, 바뀐 파일, 검증 결과 보고`,

  e2e: `${commonHeader('npm run context -- --mode e2e')}

목표:
- Playwright E2E에 [구체적인 사용자 흐름]을 추가해줘.

수정 가능 파일:
- e2e/app-flow.spec.js
- 필요한 경우 playwright.config.js 또는 scripts/serve-dist.mjs

${forbiddenBlock}

유지:
- production dist를 대상으로 검증하는 현재 구조
- 기존 고객 생성/차트 저장 테스트
- localStorage 저장 키 계약

완료 기준:
- npm run check:e2e 통과
- docs/SESSION_STATE.md 갱신
- 추가한 시나리오와 남은 리스크 보고`,

  data: `${commonHeader('npm run context -- --mode data')}

목표:
- [저장/마이그레이션 문제를 구체적으로 적기]

먼저 읽을 파일:
- src/lib/storageKeys.js
- src/lib/chartHistoryStorage.js
- test/chartHistoryStorage.test.js

${forbiddenBlock}

반드시 유지:
- localStorage["bowling_customers"]
- chart_history_v8_\${customer.id}
- chart_history_v7_\${customer.name}
- chart_history_\${customer.name}

완료 기준:
- 기존 데이터 마이그레이션 테스트 유지 또는 추가
- npm run check 통과
- docs/SESSION_STATE.md 갱신
- 데이터 호환성 리스크 보고`,
}

const help = `Usage:
  npm run prompt:ui
  npm run prompt:fix
  npm run prompt:e2e
  npm run prompt:data

Context modes:
  npm run context:light
  npm run context -- --mode ui
  npm run context -- --mode data
  npm run context -- --mode e2e
  npm run context

These commands print a short Gemini prompt. Fill the bracketed blanks before pasting.`

console.log(prompts[mode] || help)
