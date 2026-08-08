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
- **미입력 스펙 자동 기본값(Default Fallback) 대입 및 사유 자동 명시 개발 완료**:
  1) 볼러스펙(RPM, 구속, PAP X/Y, 축 틸트, 트랙 플레어) 수치가 미입력되었거나 누락된 경우, 지공 연산이 중단되거나 왜곡되지 않도록 **표준 기본값(RPM: 300 RPM, 구속: 25km/h, PAP: 5" Right 1" Up, 틸트: 13°, 플레어: 4.5")**을 대입하여 연산 수행.
- 미입력 스펙 자동 기본값 대입 및 사유 자동 명시 개발 완료.
- 사용자 사용 설명서 모달 (`UserManualModal.jsx`), 사용자 가이드 문서 (`docs/USER_MANUAL.md`, `docs/INSTALL_AND_LOGIN_GUIDE.md`), 햄버거 메뉴 내 사용 설명서 링크 연동 완료.
- `SettingsModal.jsx` 미사용 변수 및 구형 함수 정리로 ESLint 통과 보장.
- `package.json` test 스크립트에 `NODE_ENV=test` 환경변수 명시로 파이어베이스 gRPC 연결 루프 방지 및 Node 단위 테스트 2.5초대 완료 보장.
- `TaskDetailsCard.jsx` 레이아웃 입력 라벨 접근성(`htmlFor="layout-info-input"`) 및 E2E 테스트 선택자 연동 보강.
- Vercel 프로덕션 배포 완료: `https://drilling-chart-psi.vercel.app` (커밋 `60e1fd7` 푸시 및 성공적 배포).
  - **약지 피치 도움말 수치/단위 설명 간결화 (`ChartInputForm.jsx`)**:
    - `약지 피치 (Pitch)`: `Reverse/Forward 및 Lateral(좌/우) 피치 수치와 방향을 입력합니다. (16분 / 32분 단위 토글 지원)` ➔ **`Reverse/Forward 및 Lateral(좌/우) 피치 수치와 방향을 입력합니다.`**로 변경.
  - **중지/약지 Span 도움말 설명 문구 정돈 (`ChartInputForm.jsx`)**:
    - `중지 / 약지 Span`: `그립 수치를 터치하여 정밀 숫자 키패드로 중지 및 약지 스팬 치수를 각각 입력합니다.` ➔ **`정밀 숫자 키패드로 중지 및 약지 스팬 치수를 각각 입력합니다.`**로 변경.
  - **Span 타입 도움말 설명 문구 정돈 (`ChartInputForm.jsx`)**:
    - `Span 타입`: `Conventional, Fingertip 등 볼러의 그립 타입을 선택합니다.` ➔ **`Actual Span, Cut to Cut, Center to Center 등 Span 타입을 선택합니다.`**로 변경.
  - **수치 입력창 도움말 타이틀 7종 '가이드/수치' 접미사 제거 간결화 (`ChartInputForm.jsx`)**:
    - `📖 브릿지 (Bridge) 가이드` ➔ **`📖 브릿지 (Bridge)`**
    - `📖 핸드 컨디션 가이드` ➔ **`📖 핸드 컨디션`**
    - `📖 볼러 스펙 가이드` ➔ **`📖 볼러 스펙`**
    - `📖 Span 수치 가이드` ➔ **`📖 Span`**
    - `📖 중지 지공 가이드` ➔ **`📖 중지`**
    - `📖 약지 지공 가이드` ➔ **`📖 약지`**
    - `📖 엄지 지공 가이드` ➔ **`📖 엄지`**
  - **투구 스타일 도움말 매뉴얼 타이틀 및 문구 정돈 (`ChartInputForm.jsx`)**:
    - **팝업 타이틀**: `📖 투구 스타일 가이드` ➔ **`📖 투구 스타일`**로 변경.
    - **투구 스타일 선택**: `쓰리핑거 및 덤리스(투핸드) 버티컬 스타일을 전환합니다.` ➔ **`쓰리핑거 및 덤리스(투핸드) 스타일을 전환합니다.`**로 변경.
    - **덤리스 자동화**: `덤리스 자동 정돈` ➔ **`덤리스 자동화`**로 변경, `덤리스 선택 시 엄지 수치 입력 구역이 자동으로 숨김 처리됩니다.`로 정돈.
  - **도움말 매뉴얼 팝업 타이틀, 소타이틀 제거, 이모지 및 넘버링 정돈 (`BowlerSpecCard.jsx`, `ChartBlueprintView.jsx`, `TaskDetailsCard.jsx`, `ChartTopBar.jsx`, `CustomerHeader.jsx`)**:
    - **볼러스펙 가이드**: 타이틀 `📖 볼러스펙`으로 변경, 소타이틀 제거, `트랙 플레어 & 틸트` 항목 첫 번째 이동.
    - **지공 도면 가이드**: 타이틀 `📖 지공 차트`로 변경, 소타이틀 제거, `메모 작성`, `드릴링 가이드`, `차트 보호` 문구 정돈.
    - **작업내용 가이드**: 타이틀 `📖 레이아웃 & 지공 / 작업`으로 변경, 소타이틀 제거, 넘버링 제거, `볼링공 모델명` 문구 정돈.
    - **차트 테스크바 가이드**: 넘버링 제거, `[고객관리]`, `[메모]`, `[기록]`, `[저장]` 설명 문구 정돈.
    - **고객관리 테스크바 가이드**: 섹션 2, 3 이모지 제거, `ProDrill AI` API 키 문구 정돈.
  - **모바일 메모 핀 우측 드래그 이동 제한 해제 및 모바일 반응형 크기 최적화 (`useMemoOverlay.jsx`)**:
    - **우측 드래그 제한 해제**: 모바일 해상도(350px~390px)에서 고정 너비(`150px`) 상한 공식(`100% - 42.8% = 57.2%`)으로 인해 화면 중앙에서 멈추던 현상을 완전 해제하였습니다. 핀/핸들 최소 가시 영역(28px)을 확보하고 **화면 우측 끝(최대 92%+)까지 자유롭게 이동 가능**하도록 상한 계산 공식을 개선하였습니다.
    - **모바일 반응형 크기 최적화**: 모바일 뷰포트(<640px) 진입 시 핀 메모 기본 너비를 `150px` ➔ **`110px`** (높이 `80px`, 최소 너비 `48px`)로 슬림화하여 화면 가독성 및 조작 용이성을 강화하였습니다.
  - **고객 카드 `?` 버튼 위치 클럽명 바로 뒤 배치 (`CustomerList.jsx`)**:
    - 첫 번째 고객 카드의 `?` 도움말 버튼 위치를 고객 이름 직후에서 **상주 볼링장/클럽명(`customer.club`) 바로 우측 뒤**로 자연스럽게 이동 배치하였습니다.
    - 매뉴얼 팝업 타이틀을 `📖 고객 카드`로 정돈하고 본문 소타이틀 중복을 제거하였습니다.
    - `⚙️ 환경 설정` 하위 세부 항목을 이모지 전치(`🔒`, `📁`, `📋`, `👤`, `?`) 및 한 행씩 들여쓰기 분리 구조로 시각적 가독성을 대폭 향상하였습니다.
    - `가이드 보기` 항목의 아이콘을 앱 전체 3초 맥동 파동이 100% 완벽히 동기화된 `?` 핑 버튼 아이콘으로 일체화하였습니다.
  - **전체 앱 명칭 일괄 변경 (`GeneralSettingsModal.jsx`, `CustomerHeader.jsx`, `ChartTopBar.jsx`, `UserManualModal.jsx`)**:
    - **`차트 가리기` ➔ `차트 보호`**: 앱 내 모든 설정 토글, 툴팁, 매뉴얼 문구의 `차트 가리기` 명칭을 **`차트 보호`**로 일괄 수정 교체하였습니다.
    - **`로그 보기` ➔ `타임라인 로그 보기`**: 환경설정 2번째 항목 타이틀을 **`📁 타임라인 로그 보기`**로 변경하였습니다.
    - **`시스템 로그` ➔ `타임라인 로그`**: 환경설정 매뉴얼 세부 옵션명을 **`📁 타임라인 로그`**로 변경하였습니다.
    - **`가이드` ➔ `가이드 보기`**: 환경설정 5번째 항목 타이틀을 **`? 가이드 보기`**로 정돈하였습니다.
  - **첫 번째 고객 카드 `?` 가이드 항목 괄호 및 괄호 내용 완전히 제거 (`CustomerList.jsx`)**:
    - 정렬된 첫 번째 고객 카드의 매뉴얼 팝업 가이드 항목 내 모든 괄호 및 괄호 안 내용(`(차트 이동)`, `(정보 수정)`, `(삭제)`, `(편집)`)을 깨끗하게 즉시 제거하였습니다.
    - 정돈된 타이틀: `"고객 카드 클릭"`, `"편집 버튼"`, `"휴지통 버튼"`
    - 정돈된 설명: `"고객 카드 영역을 클릭하면 해당 고객의 지공 차트 상세 페이지로 이동합니다."`, `"우측 연필 아이콘을 클릭하면 고객 인적사항 및 스타일 정보를 수정할 수 있습니다."`, `"우측 휴지통 아이콘을 클릭하면 고객 데이터와 지공 이력 모두가 삭제됩니다."`
  - **앱 전체 모든 `?` 도움말 버튼 3초 맥동 파동 타이밍 100% 동기화 (`useSyncedPingStyle.js`)**:
    - 절대 시간(UNIX Epoch) 모듈러 연산 기반 `useSyncedPingStyle` 훅을 신규 작성하여, 모든 `?` 도움말 버튼의 맥동(Ping) 애니메이션 파동 Phase를 0.001초 단위까지 100% 일치시켜 완벽히 동기화시켰습니다.
  - **엄지 입력 구역 3대 서브헤더 구분선 배지 일체화 (`ChartInputForm.jsx`)**:
    - 이모지를 제거하고 `Offset`, `상세 사이즈 및 각도`, `Bevel (드릴 사이즈/깊이)` 3개 서브 영역 헤더를 동일한 시각적 구분선 배지 스타일(`border-t border-indigo-200`)로 깔끔하게 통합 일체화하였습니다.
  - **상세 수치 입력창 8개 모든 박스 타이틀 우측 옆 `?` 버튼 배치 및 개별 맞춤 매뉴얼 연동 (`ChartInputForm.jsx`)**:
    - 상세 수치 입력창 내 모든 컨테이너 박스(`사용손/투구스타일`, `Bridge`, `핸드 컨디션`, `볼러 스펙`, `Span`, `중지`, `약지`, `엄지`) 타이틀 우측 바로 옆에 `?` 버튼을 일괄 배치하였습니다.
    - 각 버튼 클릭 시 해당 구역(브릿지 간격, 손 상태 기록, 스펙 연동, 스팬 치수, 중약지 및 엄지 지공 상세)에 특화된 개별 매뉴얼 가이드가 팝업되도록 연동하였습니다.
  - **상세 수치 입력창 사용 손 타이틀 바로 옆으로 `?` 버튼 위치 이동 (`ChartInputForm.jsx`)**:
    - 사용 손 박스 중앙에 위치하던 `?` 도움말 버튼을 **사용 손 타이틀 라벨(`왼손` / `오른손`) 바로 우측 텍스트 직후(`flex items-center gap-1.5`)**로 자연스럽게 이동 배치하였습니다.
  - **가이드 팝업 디스플레이 최중앙(`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`) 고정 배치 (`TaskbarHelpBalloon.jsx`)**:
    - 도움말 팝업 위치를 **화면 해상도 및 세로 길이 변화(모바일 키보드/회전 등)에 실시간으로 완전 동적 연동되는 디스플레이 정중앙**으로 고정 배치하였습니다.
  - **모든 `?` 버튼 크기 및 스타일 차트 탑바 기준 일체화 (`CustomerHeader.jsx`, `ChartTopBar.jsx`, `BowlerSpecCard.jsx`, `TaskDetailsCard.jsx`, `ChartInputForm.jsx`, `ChartBlueprintView.jsx`)**:
    - 차트 탑바의 `?` 버튼 크기 및 폰트 디자인인 **`w-6 h-6 sm:w-7 sm:h-7`** 및 **`text-xs sm:text-sm`** 규격으로 앱 전체의 모든 `?` 도움말 버튼 크기를 통일 준용 조치하였습니다.
  - **React `createPortal(..., document.body)` 적용으로 도움말 가림 현상 100% 영구 종식 (`TaskbarHelpBalloon.jsx`)**:
    - 도움말 말풍선을 React `createPortal`로 `document.body` 최상위에 직접 렌더링하도록 전환하였습니다. 부모 카드(`BowlerSpecCard`, `TaskDetailsCard`)의 CSS `transform-gpu` 스태킹 컨텍스트를 완벽히 탈출하여 **스펙 입력박스, 작업내용, 모달 등 앱 내 그 어떤 컨텐츠보다 최상단(`z-[9999]`)**에 100% 가림 없이 표시됩니다.
  - **볼러스펙 카드 `?` 버튼 위치 원상 복귀 및 모든 카드 반전(열림/닫힘) 완전 원천 차단 (`BowlerSpecCard.jsx`, `TaskDetailsCard.jsx`)**:
    - **위치 원상 복귀**: 볼러스펙 `?` 버튼을 기존 위치인 이름 및 인적사항 라벨(`김정문 남 오른손 크랭커`) 바로 옆으로 원상 복귀시켰습니다.
    - **반전 차단**: `?` 버튼 조작 시 `e.stopPropagation()` 및 `e.preventDefault()`로 이벤트를 차단하여 카드 접힘/펼침(`onToggleOpen`)이 전혀 발생하지 않도록 조치하였습니다.
  - **지공 도면 `?` 버튼 상단 좌측 위치 이동 (`ChartBlueprintView.jsx`)**:
    - 지공 도면(`ChartBlueprintView.jsx`)의 `?` 버튼 위치를 도면 상단 중앙에서 **상단 좌측(`top-3 left-3`)**으로 이동 배치하였습니다.
  - **차트 탑바 `?` 도움말 버튼 `기록` 버튼 바로 뒤 배치 (`ChartTopBar.jsx`)**:
    - `ChartTopBar.jsx` 내 `?` 도움말 버튼의 위치를 좌측 버튼 그룹(`고객관리`, `메모`, `기록`) 중 `기록` 버튼 바로 오른쪽 직후 위치로 자연스럽게 이동 배치.
  - **도움말 팝업 `?` 버튼 Y-시작점(버튼 바로 아래) 기준 위치 계산 & 화면 가로 중앙 팝업 구현 (`TaskbarHelpBalloon.jsx`)**:
    - 말풍선 팝업의 Y 위치 상단을 `?` 버튼의 화면상 Y-시작점 바로 아래(`parentRect.bottom + 6px`)부터 시작하도록 동적 계산.
    - 버튼 시작점보다 위로 올라가지 않으면서 가로 위치는 화면 중앙(`left: 50%`, `transform: translateX(-50%)`)에 깔끔히 배치하여 입력박스 가림 완전 방지.
  - **React HTML `<button>` 중첩 오류 완전 완치 (`BowlerSpecCard.jsx`)**: 카드의 가장 외곽 접기/펼치기 `<button>` 태그를 시맨틱 `<div role="button" tabIndex={0}>` 구조로 전환하여, 내부 `?` 버튼 및 팝업 `닫기` 버튼 중첩으로 발생하던 `In HTML, <button> cannot be a descendant of <button>` 하이드레이션 오류 완치.
  - **매뉴얼 중앙 정렬, z-[9999] 최상단 레이어 보장 & 수치 입력 항목 재정돈 (`ChartInputForm.jsx`, `ChartBlueprintView.jsx`, `TaskbarHelpBalloon.jsx`)**:
    - **최상단 및 중앙 정렬**: `TaskbarHelpBalloon.jsx` z-index를 `z-[9999]`로 상향 및 가로폭 반응형 조정, 모든 카드의 도움말 말풍선 `align="center"` 일체화, 지공 도면(`ChartBlueprintView.jsx`) `?` 버튼 상단 가로 중앙(`left-1/2 -translate-x-1/2`) 배치.
    - **수치 입력 폼 매뉴얼 정돈**: `?` 버튼 컨테이너 상단 중앙 이동, `"📖 수치 입력 가이드"` 타이틀 변경 및 소제목 제거, 맞춤법 교정 반영 7대 항목 정돈(`덤리스/쓰리핑거 스타일` 1행 이동, `핸드 컨디션`, `볼러 스펙` 신규 추가).
  - **`[수정]` 버튼 매뉴얼 설명 문구 정돈 (`ChartTopBar.jsx`)**: `4. [수정] 버튼: 차트 수치를 변경할 수 있는 편집 모드로 즉시 전환합니다.`로 명확하게 문구 단일화.
  - **매뉴얼 말풍선 타이틀 및 소제목 정돈 (`CustomerHeader.jsx`, `ChartTopBar.jsx`)**: 
    - `"고객관리 테스크바 매뉴얼"` ➔ **`"고객관리 테스크바"`**
    - `"차트 상세창 매뉴얼"` ➔ **`"차트 테스크바"`**
    - `"상세 수치 입력창 매뉴얼"` ➔ **`"수치 입력 테스크바"`**
    - `"차트 상세 6대 핵심 툴바"` 및 `"수치 입력 전용 3대 액션"` 소제목(Heading) 군더더기 완전 제거.
  - **환경 설정 내 매뉴얼 스위치 변경 즉시 반영 (`GeneralSettingsModal.jsx`, `CustomerHeader.jsx`, `ChartTopBar.jsx`, `BowlerSpecCard.jsx`, `TaskDetailsCard.jsx`, `ChartInputForm.jsx`, `ChartBlueprintView.jsx`)**: 매뉴얼 토글 스위치 조작 시 커스텀 윈도우 이벤트(`manual_help_setting_changed`)를 발송/수신하여 새로고침 없이 즉시 `?` 버튼이 실시간 갱신(표시/숨김)되도록 연동.
  - **`TaskbarHelpBalloon.jsx` 미니 버튼 뱃지 UI 구현**: 매뉴얼 말풍선 내 각 액션 설명 항목에 실제 버튼 디자인과 동일한 SVG 미니 버튼 뱃지(`<Icon name="chart" />`, `<Icon name="back" />`, `<Icon name="memo" />`, `<Icon name="history" />`, `<Icon name="edit" />`, `<Icon name="save" />`, `<Icon name="plus" />`, `<Icon name="search" />`)를 직접 렌더링.
  - 54/54 단위 테스트 및 24/24 E2E 브라우저 테스트 100% 통과 검증.

## 다음 할 일

- 차트 입력폼을 섹션 단위 컴포넌트로 분리한다.
- 고객 목록 화면의 검색/정렬/row UI를 공용 primitive 기준으로 정리한다.
- 주요 화면별 screenshot baseline 또는 DOM contract를 보강한다.
- GitHub Actions/Pages 첫 실행을 확인한다.

## 세션 시작 프롬프트

```text
이 프로젝트는 볼링 지공 차트 PWA다. 먼저 GEMINI.md, docs/PROJECT_CONTEXT.md, docs/SESSION_STATE.md, docs/CI_CD.md를 읽고 현재 우선순위와 저장 구조를 요약해줘. 작업 전에는 변경 범위를 짧게 말하고, 작업 후에는 npm run check 결과와 docs/SESSION_STATE.md 갱신 내용을 알려줘.
```
