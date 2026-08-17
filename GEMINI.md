# Gemini / AI 작업 하네스

이 파일을 Gemini 웹 세션 시작 시 먼저 붙여넣거나, 작업 유형에 맞는 `npm run context -- --mode <mode>` 출력 전체를 붙여넣고 시작한다.
일상적인 방향 확인은 `npm run context:light`, UI는 `npm run context -- --mode ui`, 저장 로직은 `npm run context -- --mode data`, E2E는 `npm run context -- --mode e2e`, 전체 세션은 `npm run context`를 사용한다.

## 목표

이 프로젝트는 볼링 지공사가 모바일/PWA 환경에서 고객별 지공 차트, 작업 기록, 메모를 로컬 데이터베이스(IndexedDB / LocalStorage) 및 구글 드라이브 백업으로 관리하는 React 앱이다. AI가 컨텍스트를 잃어도 아래 문서와 명령을 기준으로 복구한다.

## 반드시 읽을 파일

1. `GEMINI.md`
2. `docs/VIBE_CODING_GUIDE.md`
3. `docs/UI_GUIDE.md`
4. `docs/GEMINI_TASK_TEMPLATE.md`
5. `docs/PROJECT_CONTEXT.md`
6. `docs/SESSION_STATE.md`
7. 변경하려는 실제 소스 파일과 관련 테스트 파일

CI, E2E, 배포, GitHub Actions, 정적 서버 작업이면 `docs/CI_CD.md`도 읽는다.

## 작업 규칙

- **[팩트 기반 작업 절대 원칙]**: 짐작, 추측, 거짓 보고를 100% 금지하며, 오직 있는 그대로의 사실,Empirical Log, 1:1 입증 수치에 기반해서만 상황을 판단하고 작업을 진행한다.
- **[원인 분석 우선 보고 절대 철칙]**: "원인 분석해서 보고하라"는 지시를 받으면 절대로 먼저 코드를 수정하거나 배포하지 않고, **원인 분석 보고서를 지공사님께 먼저 제출한 후 승인/지시를 수령하여 행동**한다.
- **[질문 선응답 철칙]**: 질문과 지시가 혼재하면 **반드시 질문에 대해 100% 먼저 명확히 답변한 후 차후 지시를 수령**한다.
- 기능 변경 전 `docs/SESSION_STATE.md`의 "현재 우선순위"를 확인한다.
- Git 저장소라면 작업 시작 전 `git status --short --branch`로 현재 브랜치와 변경분을 확인한다.
- Git 저장소라면 `main` 직접 작업을 피하고, 기능/수정 단위 브랜치에서 PR로 합친다.
- Gemini 웹, Codex, 사람이 동시에 작업한다면 작업 범위를 파일 단위로 나누고 서로의 diff를 되돌리지 않는다.
- 고객/차트 데이터 저장 구조를 바꿀 때는 마이그레이션 계획을 먼저 남긴다.
- 데이터베이스(IndexedDB/LocalStorage) 저장 구조 변경은 특히 조심한다. 서비스 데이터가 깨질 수 있다.
- **[볼링공 DB 수집 및 갱신 절대 지침]**: 모든 볼링공 DB 수집/갱신 시 추측/블로그 텍스트 입력을 전면 금지하며, **무조건 제미나이 Vision OCR(Gemini OCR)을 활용해 공식 카탈로그 이미지 스펙표 팩트 수치를 100% 정밀 추출하는 방식을 프로젝트 절대 규정**으로 강제한다.
- 사용자가 명시적으로 요청하지 않은 메인 화면 UI, 버튼, 사용자 흐름은 추가하지 않는다.
- UI 변경은 `docs/UI_GUIDE.md`의 색상, 카드, 버튼, 모달 기준을 따른다.
- 요청이 막연하면 `docs/GEMINI_TASK_TEMPLATE.md` 형식으로 범위와 금지 조건을 먼저 좁힌다.
- Gemini 웹에 줄 짧은 요청은 `npm run prompt:ui`, `npm run prompt:fix`, `npm run prompt:e2e`, `npm run prompt:data`로 생성한다. 이 프롬프트의 필수 읽기 목록과 공통 금지 조건을 지우지 않는다.
- 새 색상 팔레트, 새 버튼 타입, 새 모달 패턴, 새 native `alert`/`confirm`/`prompt`는 승인 전 추가하지 않는다.
- `dist`, `dev-dist`, `node_modules`, `.env*` 생성물/비밀값은 커밋하지 않는다.
- UI 변경은 모바일 540px 폭 중심으로 확인한다.
- 완료 전 최소 `npm run check`를 실행한다.
- 고객 생성/차트 저장 같은 실제 화면 흐름을 바꿨다면 `npm run e2e` 또는 `npm run check:e2e`까지 실행한다.
- 작업이 끝나면 `docs/SESSION_STATE.md`의 "최근 변경"과 "다음 할 일"을 갱신한다.
- 모든 수정 요청 사항은 제안 컨펌 코드작성 순으로 진행한다.

## 빠른 명령

```bash
npm run dev
npm run context
npm run context:light
npm run context -- --mode ui
npm run context -- --mode data
npm run context -- --mode e2e
npm run prompt:ui
npm run prompt:fix
npm run prompt:e2e
npm run prompt:data
npm run check
npm run e2e
npm run check:e2e
npm run icons
npm run build
```
