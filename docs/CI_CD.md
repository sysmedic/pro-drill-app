# CI/CD 설계

## 목표

작업자가 AI 도구를 바꿔도 최소 품질 기준을 동일하게 유지한다. PR 또는 main push마다 test/lint/build와 실제 브라우저 E2E를 확인하고, main 브랜치는 정적 산출물을 GitHub Pages로 배포할 수 있게 한다.

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

`npm run check:e2e`는 기본 품질 게이트 뒤 Playwright Chromium 테스트를 실행한다. 최초 실행 환경에서는 `npx playwright install chromium`이 필요할 수 있다.

## GitHub Actions

### CI

파일: `.github/workflows/ci.yml`

- 트리거: pull request, main push, 수동 실행
- Node 22 사용
- `npm ci`
- `npm run check`
- Chromium 브라우저 설치
- `npm run e2e`
- 빌드 결과물 `dist/`를 artifact로 보관
- Playwright 리포트를 artifact로 보관

### GitHub Pages 배포

파일: `.github/workflows/deploy-pages.yml`

- 트리거: main push, 수동 실행
- `npm ci`
- `npm run check`
- `dist/` 업로드
- GitHub Pages에 배포
- 저장소 경로 배포를 위해 `VITE_BASE_PATH`를 `/${repo}/`로 설정한다.

GitHub Pages에서 루트 도메인 또는 커스텀 도메인을 쓴다면 workflow의 `VITE_BASE_PATH`를 `/`로 바꾸면 된다.

## 추후 확장

- Playwright 흐름 확장: 기록 불러오기, 뒤로가기 경고 확인
- Lighthouse/PWA audit
- manifest 아이콘이 외부 URL을 참조하지 않는지 검사
- `localStorage` 마이그레이션 단위 테스트
- 배포 전 manifest 아이콘과 service worker 검증
