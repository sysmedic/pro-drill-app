# Drilling Chart

모바일/PWA 환경에서 고객별 볼링 지공 차트, 작업 기록, 메모를 관리하는 React 앱입니다.

## 빠른 시작

```bash
npm ci
npm run dev
```

PWA 아이콘을 다시 만들 때는 아래 명령을 사용합니다.

```bash
npm run icons
```

품질 검사는 아래 명령 하나로 통일합니다.

```bash
npm run check
```

`npm run check`는 test, lint, production build를 함께 실행합니다.

실제 브라우저에서 고객 생성과 차트 저장 흐름까지 확인할 때는 Playwright E2E를 실행합니다.

```bash
npm run e2e
npm run check:e2e
```

`npm run check:e2e`는 기본 품질 검사 뒤 Playwright E2E까지 이어서 실행하는 전체 로컬 게이트입니다.

## AI 컨텍스트 하네스

Gemini 웹처럼 세션 컨텍스트가 쉽게 끊기는 도구를 사용할 때는 아래 명령을 실행하고 출력 전체를 새 세션에 붙여넣습니다.

```bash
npm run context
```

핵심 문서:

- `GEMINI.md`: AI 작업 규칙
- `docs/VIBE_CODING_GUIDE.md`: 바이브코딩 요청법과 현재 구조 설명
- `docs/PROJECT_CONTEXT.md`: 프로젝트 구조와 데이터 저장 계약
- `docs/SESSION_STATE.md`: 현재 우선순위와 이어받을 작업
- `docs/CI_CD.md`: CI/CD 설계

작업을 끝낸 AI는 `docs/SESSION_STATE.md`를 갱신해야 합니다.

## Git 운영 규칙

현재 로컬 폴더는 GitHub Actions 설정을 포함하지만, `.git` 저장소 초기화와 원격 연결은 별도로 필요합니다. 저장소로 운영할 때는 아래 흐름을 기준으로 잡습니다.

```bash
git status --short --branch
git switch -c feature/<작업명>
npm run check
```

- `main`에는 직접 작업하지 않고 PR로 합칩니다.
- Gemini 웹, Codex, 사람이 동시에 작업할 때는 파일 소유 범위를 나눕니다.
- `dist`, `dev-dist`, `node_modules`, `.env*`는 커밋하지 않습니다.
- 초기화 직후 `git status --ignored`로 생성물 제외 상태를 확인합니다.

## CI/CD

GitHub Actions 워크플로가 포함되어 있습니다.

- `.github/workflows/ci.yml`: PR/main push에서 `npm run check`와 Playwright E2E
- `.github/workflows/deploy-pages.yml`: main push에서 GitHub Pages 배포

GitHub Pages를 저장소 하위 경로가 아닌 루트/커스텀 도메인으로 배포한다면 `deploy-pages.yml`의 `VITE_BASE_PATH`를 `/`로 바꾸세요.

## 현재 가장 중요한 개선 과제

1. 모달 focus trap과 포커스 복귀 보강
2. Playwright E2E 범위를 히스토리와 나가기 경고까지 확장
3. GitHub remote 연결과 GitHub Pages 첫 배포 확인
4. 저장소 관련 UI 핸들러 추가 분리
