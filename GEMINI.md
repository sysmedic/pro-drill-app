# Gemini / AI 작업 하네스

이 파일을 Gemini 웹 세션 시작 시 먼저 붙여넣거나, `npm run context` 출력 전체를 붙여넣고 시작한다.

## 목표

이 프로젝트는 볼링 지공사가 모바일/PWA 환경에서 고객별 지공 차트, 작업 기록, 메모를 오프라인으로 관리하는 React 앱이다. AI가 컨텍스트를 잃어도 아래 문서와 명령을 기준으로 복구한다.

## 반드시 읽을 파일

1. `docs/PROJECT_CONTEXT.md`
2. `docs/VIBE_CODING_GUIDE.md`
3. `docs/SESSION_STATE.md`
4. `docs/CI_CD.md`
5. 변경하려는 실제 소스 파일

## 작업 규칙

- 기능 변경 전 `docs/SESSION_STATE.md`의 "현재 우선순위"를 확인한다.
- Git 저장소라면 작업 시작 전 `git status --short --branch`로 현재 브랜치와 변경분을 확인한다.
- Git 저장소라면 `main` 직접 작업을 피하고, 기능/수정 단위 브랜치에서 PR로 합친다.
- Gemini 웹, Codex, 사람이 동시에 작업한다면 작업 범위를 파일 단위로 나누고 서로의 diff를 되돌리지 않는다.
- 고객/차트 데이터 저장 구조를 바꿀 때는 마이그레이션 계획을 먼저 남긴다.
- `localStorage` 키 변경은 특히 조심한다. 기존 사용자 데이터가 날아갈 수 있다.
- 사용자가 명시적으로 요청하지 않은 메인 화면 UI, 버튼, 사용자 흐름은 추가하지 않는다.
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
npm run check
npm run e2e
npm run check:e2e
npm run icons
npm run build
```
