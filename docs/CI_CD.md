# CI/CD 설계

## 목표

작업자가 AI 도구를 바꿔도 최소 품질 기준을 동일하게 유지한다. PR 또는 main push마다 test/lint/build와 실제 브라우저 E2E를 확인하고, main 브랜치는 정적 산출물을 GitHub Pages로 배포할 수 있게 한다. 

온라인 DB 연동 구조(파이어베이스 & Supabase) 도입에 따라, 로컬 품질 검증과 CI 환경에서 필요한 DB 연동 및 환경 변수 파이프라인 설계를 명확히 규정한다.

## 로컬 품질 게이트

```bash
npm ci
npm run check
```

`npm run check`는 아래를 실행한다.

```bash
npm run test
npm run lint
npm run build
```

화면 흐름까지 확인하는 전체 로컬 게이트는 아래를 사용한다.

```bash
npm run check:e2e
```

`npm run check:e2e`는 기본 품질 게이트 뒤 Playwright desktop/mobile Chromium 테스트와 PWA manifest smoke를 실행한다. 최초 실행 환경에서는 `npx playwright install chromium`이 필요할 수 있다.

## 환경 변수 (Environment Variables)

프로젝트 빌드 및 E2E 테스트 과정에서 온라인 API 호출이 이루어지므로, 아래의 환경 변수 설정 상태를 확인해야 한다.

- `VITE_DB_MODE`: DB 저장 제어 모드 (`firebase` | `supabase` | `dual`)
- `VITE_SUPABASE_URL`: Supabase 프로젝트 API URL
- `VITE_SUPABASE_ANON_KEY`: Supabase 익명 API 키

> [!NOTE]
> CI 환경(`ci.yml`)에서는 목(Mock) 데이터 또는 테스트용 에뮬레이터 환경을 타깃으로 삼거나, 테스트용 공개 환경 변수를 설정하여 빌드 및 E2E가 중단되지 않도록 구성해야 한다.

## GitHub Actions

### CI

파일: `.github/workflows/ci.yml`

- 트리거: pull request, main push, 수동 실행
- Node 22 사용
- `npm ci`
- `npm run check` (테스트, 린트, 빌드)
- Chromium 브라우저 설치 및 OS 종속성 준비
- `npm run e2e` (Playwright를 통한 종단 간 화면 플로우 검증)
- 빌드 결과물 `dist/`를 artifact로 보관
- Playwright 리포트(`playwright-report/`)를 artifact로 보관

### GitHub Pages 배포

파일: `.github/workflows/deploy-pages.yml`

- 트리거: main push, 수동 실행
- `npm ci`
- `npm run check`
- `dist/` 업로드
- GitHub Pages에 배포
- 저장소 경로 배포를 위해 `VITE_BASE_PATH`를 `/${repo}/`로 설정한다. (커스텀 도메인 적용 시 workflow의 `VITE_BASE_PATH`를 `/`로 변경)

## 추후 확장

- **Firebase Local Emulator 연동**: CI/E2E 테스트 시 실제 Firebase 네트워크 호출을 지양하고, 로컬 에뮬레이터를 기동하여 완결된 테스트 환경 구축.
- **Supabase DB 마이그레이션 자동화**: PR 생성 시 DB Schema 마이그레이션 변경분이 있는지 Supabase CLI를 활용해 스키마 유효성 검사 적용.
- **Lighthouse/PWA Audit**: 웹 성능 및 PWA 호환 수준을 검출하는 LightHouse CI 빌드 태스크 연동.
- **디자인 회귀 테스트**: Playwright screenshot baseline 비교를 통한 UI 레이아웃 회귀 방지.
