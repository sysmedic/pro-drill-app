# Session State

이 파일은 AI 세션이 바뀌어도 프로젝트의 작업 맥락을 회복하기 위한 손잡이다. 작업 후 반드시 갱신한다.

## 현재 우선순위

1. 차트 입력폼을 `FingerPitchSection`, `ThumbSection`, `SpanSection`, `HandConditionSection` 단위로 분리한다.
2. 고객 목록 화면의 검색/정렬/row UI를 공용 primitive 기준으로 정리한다.
3. 주요 화면별 screenshot baseline 또는 DOM contract를 보강한다.
4. GitHub remote 연결, branch protection, GitHub Pages 설정을 마무리한다.

## 최근 변경

- 더 이상 필요하지 않은 온라인 데이터베이스(Firebase 및 Supabase) 관련 설정 및 소스 코드(functions/, .firebase/, firebase.json, supabaseClient.js, authService.js, chartService.js, Login.jsx 등 총 13개 항목)를 완전히 삭제 정리했다.
- `package.json`의 `dependencies`에서 `firebase` 및 `@supabase/supabase-js` 패키지 의존성을 제거했다.
- `src/hooks/useGlobalNfcRead.js`의 NFC 스캔 점프 로직을 Firebase 원격 조회 방식에서 로컬 DB(IndexedDB 및 LocalStorage) 순회 검색 방식으로 리팩토링하여 Firebase SDK 의존성을 완전히 걷어냈다.
- 프로젝트 하네스 문서(`GEMINI.md`) 및 전체 기술 아키텍처 문서들(`PROJECT_CONTEXT.md`, `VIBE_CODING_GUIDE.md`, `CI_CD.md`)에서 Firebase/Supabase 설명을 제거하고 로컬 전용 구동 모드에 맞춰 대대적으로 갱신했다.
- 파이어베이스(Firebase) 및 슈파베이스(Supabase) 온라인 데이터 적재 아키텍처에 맞게 최상위 하네스 문서 `GEMINI.md`와 `docs/` 내의 전체 안내 문서들(`PROJECT_CONTEXT.md`, `VIBE_CODING_GUIDE.md`, `CI_CD.md`, `GEMINI_TASK_TEMPLATE.md`, `UI_GUIDE.md`)을 최신 정보로 모두 갱신했다.
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
- Gemini 바이브코딩 혼선을 줄이기 위해 `docs/UI_GUIDE.md`와 `docs/GEMINI_TASK_TEMPLATE.md`를 추가하고 AI 하네스 문서와 컨텍스트 팩에 연결했다.
- `ChartTopBar.jsx`의 유틸리티 버튼에 `aria-expanded`를 추가해 사용 중인 prop 계약을 명확히 하고 lint 실패를 해소했다.
- `npm run context:light`와 `npm run prompt:ui|fix|e2e|data`를 추가해 Gemini 웹에서 매번 긴 문서를 복사하지 않아도 작업 요청을 만들 수 있게 했다.
- 프론트 구조 1차 정리로 `src/components/layout/`와 `src/components/ui/` primitive를 추가하고 고객 목록/차트 상단/주요 카드/모달 일부를 공용 래퍼와 아이콘으로 이전했다.
- 화면 JSX의 raw emoji 노출을 제거하고, 아이콘은 `src/components/ui/Icon.jsx`에서 재사용하게 했다.
- `ModalShell.jsx`와 `Field.jsx`를 추가해 고객 폼, 차트 메모/히스토리/나가기 모달, 작업내용 입력을 공용 focus trap/입력 스타일로 이전했다.
- `ChartDetail.jsx`의 히스토리 저장/삭제/이름변경 흐름을 `useHistoryRecords.js`로 분리했다.
- `ChartDetail.jsx`의 메모 배치/드래그/활성 메모 편집 상태를 `useMemoOverlay.jsx`로 분리했다.
- `ChartInputForm.jsx`의 반복 accordion/select/keypad trigger UI를 `DisclosureSection`, `SelectField`, `KeypadField` primitive로 옮겼다.
- 고객 목록 저장을 `customerStorage` helper로 분리하고, malformed/non-array 고객 저장값과 legacy 차트 히스토리 migration edge case가 즉시 유실되지 않도록 보강했다.
- Playwright에 390px 모바일 프로젝트와 저장 localStorage 키/히스토리 불러오기/미저장 나가기/PWA manifest E2E를 추가했다.
- `PageShell`의 content surface 폭 토큰을 정리하고 fixed 상단바/하단 유틸 시트가 본문 카드와 같은 좌우 기준선을 쓰게 했다.
- `TopBarShell` fixed spacer가 실제 상단바 높이를 측정해 본문 겹침 회귀를 줄이게 했다.
- Playwright에 540px 모바일 프로젝트와 `visual-layout` smoke를 추가해 상단바/본문/하단 시트 폭 어긋남을 잡게 했다.
- Playwright에 한글 IME 조합 입력 smoke를 추가해 모달 입력이 조각나는 회귀를 잡게 했다.
- storage key 상수값을 `projectContracts` 테스트로 고정했다.
- `ConfirmModal`, `TextInputModal`, `FeedbackToast`를 추가하고 기존 native `alert`/`confirm`/`prompt` call site를 제거했다.
- `SelectField`의 직접 입력 흐름을 native prompt 대신 `TextInputModal`로 교체했다.
- 고객 생성/수정/삭제와 차트 저장/삭제/이름변경이 저장 성공 여부를 확인한 뒤에만 화면 state를 확정하도록 바꿨다.
- Playwright에 `storage-failure` smoke를 추가해 고객 저장/차트 저장 실패가 성공처럼 보이지 않도록 검증한다.
- `projectContracts` 테스트가 이제 `src` 전체의 native `alert`/`confirm`/`prompt` 사용을 금지한다.
- 고객 관리 헤더의 수동 `최적화` 버튼과 `--vh` 직접 세팅을 제거하고, viewport 대응은 `PageShell`의 `100svh` 기반 레이아웃에 맡기도록 정리했다.
- 공용 `Button` variant의 gradient/세로 press offset을 제거하고 line-height 기준을 통일해 툴바 버튼 깊이와 내부 아이콘-텍스트 정렬을 맞췄다.
- `DisclosureSection`, `SelectField`, `KeypadField`에 `density="compact"`를 추가하고 차트 입력폼 밀도를 줄여 한 화면에서 더 많은 지공 값을 확인할 수 있게 했다.
- 유틸 바텀시트의 미구현 `사진첨부` placeholder 버튼을 제거하고, 히스토리 목록 선택 영역을 native `button`으로 바꿨다.
- 차트 상단 모드 전환 버튼의 접근성 라벨을 보강하고, 메모 배치 안내가 화면을 덜 가리도록 위치/애니메이션을 낮췄다.
- `projectContracts`에 compact 입력 primitive와 미구현 future-action placeholder 금지 계약을 추가했다.
- 고객 저장값과 차트 히스토리 저장값을 읽을 때 객체 schema를 검증해 깨진 레코드는 화면 state에서 제외하되 원본 localStorage는 덮어쓰지 않도록 보강했다.
- 고객 저장은 유효하지 않은 고객 레코드가 섞인 배열을 거부하고, 차트 히스토리 저장은 유효한 기록 레코드만 직렬화하도록 정리했다.
- 고객/차트 기록/메모 ID 생성을 `src/lib/ids.js`의 `createLocalId()`로 모으고 `Date.now()` 직접 ID 생성을 제거했다.
- 저장 schema 방어와 shared ID helper를 검증하는 Node 테스트와 `Date.now()` ID 회귀 방지 계약 테스트를 추가했다.
- 고객 관리 상단에 ☰ 햄버거 메뉴를 복원하고 시스템 설정과 환경 설정을 분할 전개하는 드롭다운 팝오버를 연동했다.
- 신규 환경 설정 모달(`GeneralSettingsModal.jsx`)을 추가하여 바탕화면 3회 연속 클릭 잠금 및 이력 자동 팝업("첫 화면에서 로그 보기") 제어를 개별 토글하도록 일원화했다.
- 차트 테스크창의 메모 및 기록 버튼에서 초소형 뷰포트 시 텍스트 라벨이 감춰지던 CSS 클래스를 제거하여 언제나 텍스트 이름이 명시 노출되도록 패치했다.
- 비상용 수동 파일 백업/복원 기능을 `SettingsModal.jsx`에서 걷어내어 신규 `BackupSettingsModal.jsx` 독립 모달로 분리 이식하고, 햄버거 메뉴 오버레이 하단에 3번째 아이템으로 배치했다.
- 고객 관리의 userTier를 전역 라이선스 세션과 일원화하고, 미인증 사용자에게는 수동 로컬 백업 메뉴가 딤드(opacity-40) 상태로 노출되며 클릭 시 안내 토스트가 뜨도록 설계했다.
- 사용자 등급 체계를 master, certified(인증 사용자), trial(Trial)로 개편하고, sysmedic@gmail.com 로그인 시 master 권한이 설정되도록 매핑했다.
- Trial 등급이라도 유예 기간 만료 경고(남은 일수 <= 30일) 도래 전까지는 AI추천 및 AI 설정 기능을 개방 사용하도록 완화하되, 수동 백업 기능은 Trial 기간 여부와 무관히 상시 딤드 처리했다.
- 햄버거 메뉴를 환경설정 ➔ 클라우드 ➔ AI 설정 ➔ 로컬 백업 순으로 재배치하고, 모든 모달의 패딩, 여백, 둥글기 등 디자인을 클라우드 설정 모달 기준으로 완벽히 통일했다.
- Trial 등급 90일 만료 시점 이후의 강제 차단 게이트를 해제하여 앱 진입을 상시 허용하고, 30일 전 경고 배너 유지 및 만료 시 전용 배너 노출로 개편했다.
- 만료 완료 상태에서 차트 상세 진입 시 혹은 뒤로가기 퇴장 시 등록 권유 피드백 토스트를 스르륵 노출해 정식 라이선스로의 전환을 부드럽게 유도했다.
- 기존 구글 백업 프로젝트와 완전히 격리된 별도의 라이선스 전용 Firebase 프로젝트('LicenseApp') 및 전용 SDK 인스턴스를 구축하여 다중 파이어베이스 아키텍처를 실현했다.
- 마스터 계정 로그인 시에만 드롭다운에 노출되는 비밀 '마스터 제어실' 모달을 추가하여 실시간 지공사 등록 및 locked/active 토글 제어 및 Trial 통계 조회를 동적 지원했다.
- 데이터 유실 및 법적 분쟁을 방지하기 위해 로컬 IndexedDB는 안전하게 원본 보존하되 status === 'locked' 감지 시 앱 화면 전체 접근을 강제 락다운하고 즉시 해제 가능한 가역적 킬스위치를 이식했다.
- 최초 기동 시 구글 계정을 의무 확인하는 'LoginGate.jsx' 컴포넌트를 이식하고, 로그인 성공 시에만 고객관리 메인 뷰 진입을 개방했다.
- 이메일 해시와 함께 이메일 원문('email') 필드를 Firebase DB에 병행 적재하여 중복 기기 체험 가입 왜곡을 원천 예방(정확도 100%)하고, 마스터 제어실에서 승인 지공사 및 Trial 체험 지공사들의 실제 구글 계정명과 D-Day 잔여일을 표 형식으로 실시간 모니터링할 수 있도록 뷰를 대폭 확장했다.
- 파이어베이스 규칙(Rules)이 설정되어 있지 않은 상황에서도 Firestore 조회 403 오류를 격리 수용하고 즉각 'trial' 등급을 부여하여 앱 화면 진입이 중단 없이 통과하도록 안전장치를 신설했다.
- 구글 OAuth 동의 화면의 테스트(Testing) 모드 시 보안 차단을 우회하기 위해 최초 로그인 게이트에서는 드라이브 스코프를 제외한 경량의 이메일 전용 권한만 요청하고, 실제 드라이브 연동 활성화 시점에 권한을 추가 수락(Incremental Consent)받도록 이원화했다.
- ProDrill AI 설정 모달(`AiSettingsModal.jsx`) 디자인 기준을 바탕으로 기록 이름 변경, 기록 삭제 확인, 1차 및 2차 고객 삭제 확인 모달의 디자인과 구조를 `ModalShell` 기반으로 완전히 일치시켰다.
- 햄버거 메뉴의 환경설정 모달(`GeneralSettingsModal.jsx`)에 '입력창 아코디언박스 펼치기' 및 '차트창 볼러스펙 아코디언박스 펼치기' 2개 체크 항목을 신설하고, 설정 활성화 시 차트 입력 모드 및 볼러스펙 상세 카드가 기본으로 전개된 상태로 작동하도록 연동했다.
- 차트 입력창(`ChartInputForm.jsx`) 최상단의 사용손/투구방식 선택 박스 스킨을 핸드컨디션 박스와 통일하고, Bridge 박스를 아코디언에서 핑거선택박스와 100% 동일한 수평 한 줄(Row) 레이아웃 및 `border-indigo-300` 스킨으로 개편했으며, 엄지 섹션 타이틀 명칭을 `엄지 (Thumb)`으로 통일했다.
- 차트 입력창의 핸드 컨디션 박스와 Span 박스 사이에 **볼러 스펙 아코디언 박스**를 신설하고, 내부 6개 입력 항목(트랙 플레어, 틸트, RPM, 구속, PAP Over, PAP Up/Down)을 핸드 컨디션 박스와 동일한 3열(3 columns) 그리드 배열로 정돈하여 차트창 상단의 `BowlerSpecCard`와 실시간 100% 양방향 동기화되도록 연동했다.
- iOS Safari 터치 시 화면 자동 줌인 덜컹거림을 근본 차단하기 위해 `index.html` 뷰포트에 `maximum-scale=1.0, user-scalable=no` 방어벽을 구축하고, 입력 필드(`SelectField`, `KeypadField`) 폰트 크기 역전 현상(`text-[16px] sm:text-sm`)을 제거하여 모든 창 해상도에서 균형 잡힌 **`text-sm` (14px font-semibold)**으로 일원화했다.
- 차트창 상단 볼러스펙 카드(`BowlerSpecCard.jsx`) 내의 모든 선택 및 수치 항목(트랙 플레어, 틸트, RPM, 구속, PAP Over, PAP Up/Down) 폰트를 시원하고 가독성 명확한 **`16px` (`text-base font-black`)**로 완벽하게 통일했다.
- 차트 입력 모드(`isEditMode`) 진입 시 상단의 `BowlerSpecCard` 배너 삭제뿐만 아니라 상단 테스크바 아래에서 반짝이던 롤링 배너("현재 기록입니다 / 클릭하여 새 차트로 만들기")까지 깔끔하게 삭제(숨김) 처리하여 테스크바 크기를 슬림하게 대폭 축소시켰으며, 입력 표면 카드(`chart-edit-surface`) 패딩(`p-2 pb-2`) 및 `ChartInputForm` 최하단 여백(`pb-1.5`)을 대폭 줄여 모바일 조작성을 최대화했다.
- 상단 테스크바 내의 첫 번째 이동 버튼 명칭을 기존 `뒤로`에서 **`고객관리`**로 변경하여 지공사의 화면 이동 직관성을 향상시켰다.
- 햄버거 메인 메뉴 항목 명칭을 직관적으로 간소화("클라우드 설정"➔"클라우드", "ProDrill AI 설정"➔"ProDrill AI", "로컬 백업"➔"백업", "마스터 제어실"➔"제어실")하고 요청된 순서(**환경 설정 ➔ ProDrill AI ➔ 클라우드 ➔ 백업 ➔ 제어실**)로 깔끔하게 재배치했다.
- 환경 설정 모달(`GeneralSettingsModal.jsx`)의 배너 타이틀 명칭을 **`⚙️ 환경 설정`**으로 간소화하고, 4개 옵션 라벨(**🔒 차트 가리기**, **📁 로그 보기**, **📋 입력창 펼치기**, **👤 볼러스펙 펼치기**)을 대칭적이고 직관적인 군더더기 없는 명칭으로 완전히 깔끔하게 정돈했다.
- OpenAI/Gemini/Apple Intelligence 등 최신 AI 세계적 표준 이모지인 **`✨` (Sparkles 반짝이)**로 ProDrill AI 메뉴, 모달, 버튼 아이콘을 감각적이고 세련되게 최종 반영했다.
- `TaskDetailsCard` 내의 `✨ AI 추천` 버튼과 `2LS 변환` 버튼을 `레이아웃 (Dual Angle 등)` 필드 라벨 오른쪽 선상으로 함께 이동시키고, 두 버튼의 크기와 패딩(`px-2 py-0.5 text-[11px] font-bold`)을 **100% 나란히 일치**시켜 입력 필드 가림 현상을 완전히 해소하고 시각적 정돈감을 완벽하게 극대화했다.
- `2LS 변환` / `Dual 변환` 버튼 클릭 시 기존 수치 ➔ 변환 수치 ➔ 볼러 스펙 ➔ **AI/수학적 변환 연산 유도 과정(`reason`)**을 투명하게 안내하는 **`ConvertProcessModal` (변환 과정 안내 팝업 모달)**을 신설하고, 시스템 내 기존 모달들(`AiSettingsModal`, `SettingsModal`)과 100% 동일한 규격 컴팩트 래퍼(`size="sm"`, `p-5`) 및 하단 취소/확인 버튼 프리미티브로 디자인 통일감을 완성했다.
- 차트 기록 변경 경고 모달(`ChartModalManager.jsx`) 타이틀 명칭을 기존의 `⚠️ 불러온 차트 기록 변경`에서 직관적인 **`⚠️ 차트 기록 변경`**으로 간소화 정돈하고, 모달 내 중복 및 불필요 설명 문단들을 깔끔하게 제거했다.
- 인라인 형태였던 **새 차트 저장 안내 모달(`ChartDetail.jsx`)**을 `ModalShell size="sm"` 래퍼 및 시스템 표준 모달 구조(`bg-slate-50 p-4 rounded-xl border` 컨테이너 및 `Button variant="primary"` 취소/확인 액션 버튼)로 완벽하게 튜닝하여 전체 모달의 디자인 컨셉을 100% 통일화했다.
- 햄버거 메인 메뉴 제일 하단(`CustomerHeader.jsx`)에 **`🔄 업데이트`** 버튼을 신설하고, PWA Service Worker 및 브라우저 최신 배포본 갱신 연동 헬퍼 모듈(`src/lib/pwaUpdate.js`)을 연결하여 클릭 시 최신 배포본을 탐색하고 자동으로 앱을 최신화하는 기능을 구축했다.
- 고객 관리 화면(`CustomerManager.jsx`)에서 목록에 표시 및 정렬되는 고객 카드 한도 제한 개수를 기존 30명에서 **최대 100명 (`slice(0, 100)`)**으로 확대하여, 속도 저하 없이 한눈에 더 많은 고객 카드를 손쉽게 조회하고 탐색할 수 있도록 완성했다.

## 다음 할 일

- 차트 입력폼을 섹션 단위 컴포넌트로 분리한다.
- 고객 목록 화면의 검색/정렬/row UI를 공용 primitive 기준으로 정리한다.
- 주요 화면별 screenshot baseline 또는 DOM contract를 보강한다.
- GitHub Actions/Pages 첫 실행을 확인한다.

## 세션 시작 프롬프트

```text
이 프로젝트는 볼링 지공 차트 PWA다. 먼저 GEMINI.md, docs/PROJECT_CONTEXT.md, docs/SESSION_STATE.md, docs/CI_CD.md를 읽고 현재 우선순위와 저장 구조를 요약해줘. 작업 전에는 변경 범위를 짧게 말하고, 작업 후에는 npm run check 결과와 docs/SESSION_STATE.md 갱신 내용을 알려줘.
```
