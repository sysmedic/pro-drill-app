# 🎳 ProDrill & ProDrill Tools 새 컴퓨터 이주 가이드

본 패키지는 다른 컴퓨터로 작업 환경을 옮길 때 필요한 **환경 설정(.env) 파일**, **고객/차트 백업 데이터(.json)**, 그리고 **단계별 설치 및 실행 가이드**를 담고 있습니다.

---

## 📂 패키지 구성 내용

- **`env_files/`**: Firebase 및 로컬 개발용 보안 환경 설정 파일 (`.env`, `.env.local`)
- **`customer_backups/`**: 고객 및 지공 차트 백업 데이터 파일 (`.json`)
  - `prodrill_batch_backup_sysmedic3_2026-08-17 (8).json` (1.2MB, 최신 일괄 백업)
  - `prodrill_local_backup_2026-08-18 (1).json` (최신 로컬 백업)
- **`README.md`**: 본 이주 가이드 문서

---

## 🚀 새 컴퓨터에서 시작하기 (3단계)

### 1단계: Git 저장소 내려받기 (Clone)
새 컴퓨터의 터미널(Terminal 또는 Git Bash)을 열고 프로젝트를 다운로드합니다.

```bash
git clone https://github.com/sysmedic/pro-drill-app.git ProDrill
cd ProDrill
git checkout 툴킷-최적화
```

*(※ 만약 이미 폴더가 있다면 `cd ProDrill` 이동 후 `git pull origin 툴킷-최적화` 실행)*

---

### 2단계: 환경 설정 파일(.env) 복사
본 백업 폴더의 `env_files/` 안에 있는 두 파일을 새 컴퓨터의 **`ProDrill/` 프로젝트 루트 폴더**에 그대로 복사해 넣습니다.

- `env_files/.env` ➔ `ProDrill/.env`
- `env_files/.env.local` ➔ `ProDrill/.env.local`

---

### 3단계: 라이브러리 부품 설치 (Install)

```bash
# 1. 메인 ProDrill 앱 부품 설치
npm install

# 2. ProDrill Tools (지공 계산기) 툴킷 부품 설치
npm --prefix drilling-tools-app install
```

---

## 🏃 앱 실행 방법

### 1. 🛠️ ProDrill Tools (스판 변환기, 마킹 계산기, 오발/트라이오발 툴킷)
```bash
npm --prefix drilling-tools-app run dev
```
- 브라우저 접속: **`http://localhost:3001`**

### 2. 🎳 메인 ProDrill 차트 관리 앱
```bash
npm run dev
```
- 브라우저 접속: **`http://localhost:3000`**

---

## 💾 고객 데이터 복원 방법 (필요시)

새 컴퓨터에서 메인 ProDrill 앱을 켜신 후:
1. 상단 메뉴의 **[설정] ➔ [데이터 백업/복원]** (또는 고객 관리 모달)로 이동합니다.
2. **[백업 파일에서 복원]** 버튼을 클릭합니다.
3. 본 패키지의 `customer_backups/` 폴더에 있는 **`prodrill_batch_backup_sysmedic3_2026-08-17 (8).json`** 파일을 선택하시면 모든 고객 명단과 차트 이력이 100% 온전하게 복원됩니다.

---

생성일시: 2026년 8월 28일
작성자: Antigravity AI Coding Assistant
