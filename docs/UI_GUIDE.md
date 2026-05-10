# UI Guide

이 문서는 Gemini, Codex, 사람이 UI를 수정할 때 디자인 일관성을 지키기 위한 기준이다. 새 화면을 자유롭게 만들기보다, 기존 앱의 모바일 PWA 밀도를 유지한다.

## 원칙

- 모바일 390px와 540px 폭에서 먼저 자연스러워야 한다.
- 새 기능보다 현장 입력 속도와 기록 안정성을 우선한다.
- 요청받지 않은 버튼, 화면, 사용자 흐름을 추가하지 않는다.
- 색상, 여백, 둥근 정도, 그림자는 기존 컴포넌트 패턴을 따른다.
- 기존 `localStorage` 저장 키와 고객/히스토리 데이터 구조는 UI 작업에서 건드리지 않는다.

## 화면 구조

- 공용 레이아웃은 `src/components/layout/PageShell.jsx`와 `src/components/layout/TopBarShell.jsx`를 먼저 사용한다.
- 최상위 화면 폭과 화면 패딩은 `PageShell.jsx`의 `PAGE_MAX_WIDTH_CLASS`, `PAGE_INLINE_PADDING_CLASS` 토큰을 기본으로 한다.
- 고객 목록 같은 화면 제목 영역은 `TopBarShell`의 `pageHeader` 변형을 사용하고, 차트 상세의 고정 조작 영역은 더 얇은 `toolbar` 변형을 사용한다.
- fixed 상단 툴바는 `PageShell`의 내부 content 폭과 맞추기 위해 `FIXED_SURFACE_WIDTH_CLASS`를 사용한다.
- fixed/sticky/sheet처럼 페이지 padding 밖에 렌더되는 표면은 `PAGE_CONTENT_SURFACE_CLASS` 또는 `FIXED_SURFACE_WIDTH_CLASS` 중 하나를 사용해 본문 카드와 좌우 기준선을 맞춘다.
- fixed 상단바의 spacer 높이는 `TopBarShell`이 실제 렌더 높이를 측정해 맞춘다. 새 버튼/문구를 넣을 때 spacer 높이 숫자를 직접 늘리는 방식으로 해결하지 않는다.
- 배경은 `bg-slate-50` 또는 앱 전체 `bg-slate-200` 계열을 유지한다.
- 화면 단위 여백은 `p-2 sm:p-4`를 기본으로 한다.
- 고정 상단바, 바텀시트, 오버레이의 `z-index`는 `PageShell.jsx`의 `LAYER_CLASS`를 먼저 사용하고 충돌을 확인한다.

## 색상

- 기본 배경: `slate-50`, `slate-100`, `slate-200`
- 본문 텍스트: `slate-800`, 보조 텍스트: `slate-500`
- 주요 액션: `indigo-500`, `indigo-600`, `indigo-700`
- 위험 액션: `red-500`, `red-600`, `red-100`
- 메모: `yellow-50`, `yellow-100`, `yellow-200`, `yellow-400`
- 새 팔레트나 강한 그라디언트는 먼저 제안만 하고, 승인 전에는 추가하지 않는다.

## 컴포넌트 기준

카드:

- 새 카드는 `src/components/ui/Card.jsx`를 먼저 사용한다.
- 폭 제한, 레이어, GPU surface가 필요한 카드는 `Card`의 `constrained`, `layer`, `gpu`, `padding`, `elevation` prop을 우선 사용한다.
- `bg-white`, `border border-slate-200`, `shadow-sm` 또는 `shadow-md`
- 기본 반경은 `rounded-xl`; 큰 패널은 기존 패턴에 맞춰 `rounded-2xl`까지 허용한다.
- 카드 안에 또 다른 장식용 카드를 중첩하지 않는다.

버튼:

- 새 버튼은 `src/components/ui/Button.jsx`와 `IconButton`을 먼저 사용한다.
- 클릭 가능한 주요 surface는 native `button`을 우선 사용하고, 불가피한 `div` 상호작용은 `role`, `tabIndex`, Enter/Space keyboard 처리를 둔다.
- Primary: indigo 계열 배경, 흰색 텍스트
- Secondary: 흰색 또는 slate 계열 배경, slate 텍스트
- Danger: red 계열 텍스트 또는 배경
- Icon button: 정사각형 터치 영역과 `aria-label`을 유지한다.
- 모바일에서 버튼 텍스트가 줄바꿈되거나 잘리면 폭, 축약 라벨, 아이콘 버튼 중 하나로 정리한다.

아이콘:

- 새 아이콘은 `src/components/ui/Icon.jsx`에 이름을 추가하고 재사용한다.
- 화면에 raw emoji를 직접 넣지 않는다.
- 의미 있는 아이콘 버튼에는 반드시 `aria-label`을 둔다.

입력:

- 새 input/select/textarea는 `src/components/ui/Field.jsx`를 먼저 사용한다.
- 차트 입력폼의 반복 select는 `src/components/ui/SelectField.jsx`, 접이식 섹션은 `src/components/ui/DisclosureSection.jsx`, 키패드 호출 버튼은 `src/components/ui/KeypadField.jsx`를 사용한다.
- `focus:ring-2 focus:ring-indigo-500 outline-none`을 유지한다.
- iOS 자동 줌을 피하려면 모바일 텍스트 입력은 최소 `16px`를 사용한다.
- 필수 입력만 `required`로 막고, 작업 중 흐름을 끊는 새 `alert`는 추가하지 않는다.

모달/시트:

- 새 모달은 `src/components/ui/ModalShell.jsx`를 먼저 사용한다.
- 확인/입력/알림 흐름은 `src/components/ui/Dialogs.jsx`의 `ConfirmModal`, `TextInputModal`, `FeedbackToast`를 먼저 사용한다.
- 모든 모달은 `role="dialog"`와 `aria-modal="true"`를 가진다.
- Esc 닫기, focus trap, 닫힌 뒤 포커스 복귀를 목표 기준으로 한다.
- native `alert`, `confirm`, `prompt`를 사용하지 않는다.
- 바텀시트는 현장 모바일 조작을 고려해 터치 영역을 44px 이상으로 유지한다.

## 변경 전 체크리스트

- 수정 범위가 한 화면 또는 한 컴포넌트 그룹으로 좁혀졌는가?
- 새 색상, 새 버튼, 새 사용자 흐름을 추가하지 않는가?
- 모바일 390px/540px에서 텍스트가 넘치지 않는가?
- 저장 키, 마이그레이션, 고객 삭제 흐름을 건드리지 않는가?
- 완료 후 `npm run check`를 실행할 수 있는가?

## 금지 패턴

- "예쁘게", "현대적으로" 같은 막연한 요청만 보고 전체 UI를 재작성한다.
- 파일 여러 곳을 동시에 넓게 바꾸면서 검증은 나중에 한다.
- 기존 컴포넌트와 다른 버튼/카드 스타일을 새로 만든다.
- 화면 JSX에 raw emoji를 직접 넣는다.
- 요청받지 않은 백업, 설정, 메뉴, 튜토리얼, 랜딩 섹션을 추가한다.
- 저장 구조 변경 없이 UI에서 데이터 의미를 바꾼다.

## 회귀 테스트 기준

- 레이아웃 기준선을 건드리면 `e2e/visual-layout.spec.js`가 390px, 540px, desktop에서 통과해야 한다.
- 한글 입력이나 모달 focus trap을 건드리면 `e2e/korean-ime.spec.js`가 통과해야 한다.
- 저장 성공/실패 흐름을 건드리면 `e2e/storage-failure.spec.js`가 통과해야 한다.
- 새 native `alert`, `confirm`, `prompt`를 추가하지 않는다. `test/projectContracts.test.js`가 `src` 전체에서 이를 막는다.
