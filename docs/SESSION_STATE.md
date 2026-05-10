# Session State

이 파일은 AI 세션이 바뀌어도 프로젝트의 작업 맥락을 회복하기 위한 손잡이다. 작업 후 반드시 갱신한다.

## 현재 우선순위

1. 모달 포커스 복귀와 focus trap을 보강한다.
2. Playwright E2E 범위를 히스토리와 나가기 경고까지 확장한다.
3. GitHub remote 연결, branch protection, GitHub Pages 설정을 마무리한다.
4. 저장소 관련 UI 핸들러를 더 얇게 분리한다.

## 최근 변경

- AI 컨텍스트 하네스 문서와 컨텍스트 팩 생성 스크립트를 추가했다.
- CI에서 사용할 `npm run check` 명령을 추가했다.
- GitHub Actions CI와 GitHub Pages 배포 워크플로를 추가했다.
- ESLint가 생성물(`dist`, `dev-dist`)을 검사하지 않도록 정리했다.
- README를 실제 프로젝트/하네스/CI 안내 문서로 교체했다.
- 서브에이전트 병렬 검토 결과를 반영해 Git 운영 규칙, 한국어 문서 언어, Tailwind 애니메이션, 로컬 PWA 아이콘 참조, 비활성 버튼 상태를 보강했다.
- Node 내장 테스트를 추가하고 저장키/히스토리 마이그레이션/투핸드 판정/PWA 계약을 검증하게 했다.
- Git 저장소를 `main` 브랜치로 초기화했고 `.gitignore`가 `dist`, `dev-dist`, `node_modules`, `.DS_Store`를 제외하는지 확인했다.
- Vite SSR 기반 사이트 스모크 테스트를 추가해 고객 목록 화면과 차트 상세 초기 렌더를 검증한다.
- `ChartDetail.jsx`에서 도면 뷰어, 입력폼, 모달, 옵션/유틸을 `src/pages/chartDetail/`로 1차 분리했다.
- PWA용 `icon-192.png`, `icon-512.png`, `maskable-icon-512.png`를 생성하고 manifest에 반영했다.
- 요청 범위를 벗어난 고객 목록 백업/복원 UI와 관련 로직을 제거했다.
- 메모/히스토리/나가기 확인/고객 편집 모달에 `role="dialog"`, `aria-modal`, Esc 닫기를 보강했다.
- 유틸 바텀시트와 나가기 확인 모달을 차트 상세 하위 컴포넌트로 추가 분리했다.
- `Sandbox.jsx`, 기본 Vite asset, `App.css` 등 미사용 템플릿 파일을 제거했다.
- `ChartDetail.jsx`의 상단바, 스펙 카드, 작업내용 카드를 하위 컴포넌트로 추가 분리했다.
- `CustomerManager.jsx`의 헤더, 고객 리스트, 고객 폼 모달을 하위 컴포넌트로 분리했다.
- UI 분리 파일이 유지되는지 확인하는 프로젝트 계약 테스트를 추가했다.
- Playwright Chromium E2E 하네스를 추가해 고객 생성과 차트 저장 흐름을 실제 브라우저에서 검증한다.
- CI에서 `npm run check` 뒤 Playwright 브라우저를 설치하고 `npm run e2e`를 실행하도록 확장했다.
- `scripts/serve-dist.mjs`를 추가해 E2E가 Vite dev server 대신 production `dist/` 산출물을 검증하게 했다.
- `.npmrc`의 `legacy-peer-deps=true`로 Vite 8과 `vite-plugin-pwa` peer dependency 충돌이 `npm ci`를 막지 않도록 했다.
- `npm audit fix --legacy-peer-deps`로 dev/build transitive audit 이슈를 정리했다.
- 바이브코딩 작업자가 에이전트에게 요청할 때 사용할 `docs/VIBE_CODING_GUIDE.md`를 추가하고 컨텍스트 문서에 연결했다.
- 요청받지 않은 메인 화면 UI/버튼/사용자 흐름을 추가하지 않는 규칙을 `GEMINI.md`와 바이브코딩 가이드에 명시했다.
- 차트 보기 모드의 흰 부모 카드 컨테이너를 제거하고, 차트 wrapper에 `shadow-md`를 추가해 다른 카드들과 시각 밀도를 맞췄다.

## 다음 할 일

- 모달 focus trap과 닫힌 뒤 포커스 복귀를 보강한다.
- Playwright E2E에 히스토리 불러오기와 나가기 경고 흐름을 추가한다.
- GitHub remote를 연결하고 GitHub Actions/Pages 첫 실행을 확인한다.

## 세션 시작 프롬프트

```text
이 프로젝트는 볼링 지공 차트 PWA다. 먼저 GEMINI.md, docs/PROJECT_CONTEXT.md, docs/SESSION_STATE.md, docs/CI_CD.md를 읽고 현재 우선순위와 저장 구조를 요약해줘. 작업 전에는 변경 범위를 짧게 말하고, 작업 후에는 npm run check 결과와 docs/SESSION_STATE.md 갱신 내용을 알려줘.
```
