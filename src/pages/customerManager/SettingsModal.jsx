import { useState, useEffect } from "react";
import Button from "../../components/ui/Button.jsx";
import { ConfirmModal } from "../../components/ui/Dialogs.jsx";
import ModalShell from "../../components/ui/ModalShell.jsx";
import { isLicenseCertified, calculateGracePeriod, getUserProfile, saveUserProfile, sanitizeString } from "../../lib/userLicenseManager.js";
import { 
  initGoogleApi, 
  isGoogleSignedIn,
  listBackupSnapshots
} from "../../lib/googleDriveBackup.js";
import { 
  performBackup, 
  performRestore
} from "../../lib/syncService.js";

export default function SettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});

  // AI 및 Google 관련 상태
  const [googleLoading, setGoogleLoading] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [showSyncModeConfirm, setShowSyncModeConfirm] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(() => ({
    certified: isLicenseCertified(),
    grace: calculateGracePeriod()
  }));

  // 지공사 프로필 상태
  const [profileName, setProfileName] = useState("");
  const [profileShop, setProfileShop] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [initialProfile, setInitialProfile] = useState({ name: "", shopName: "", phone: "" });

  // 스냅샷 관리 상태
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [showMoreSnapshots, setShowMoreSnapshots] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);

  // 복원 모드 선택 관련 상태 (기존 차트에 덧붙이기 vs 전체 덮어쓰기)
  const [pendingBackupPackage, setPendingBackupPackage] = useState(null);
  const [showRestoreModeConfirm, setShowRestoreModeConfirm] = useState(false);



  const handleFileRestoreSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const payload = JSON.parse(evt.target.result);
        if (!payload || payload.appId !== 'ProDrill') {
          onFeedback({ message: '올바른 ProDrill 백업 파일이 아닙니다.', tone: 'danger' });
          return;
        }
        setPendingBackupPackage(payload);
        setShowRestoreModeConfirm(true); // 복원 방식 선택 다이얼로그 모달 가동!
      } catch (err) {
        onFeedback({ message: '백업 파일 읽기 실패: ' + err.message, tone: 'danger' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestoreMode = async (mode) => {
    if (!pendingBackupPackage) return;
    setGoogleLoading(true);
    setShowRestoreModeConfirm(false);
    try {
      const { unpackAppData } = await import('../../lib/syncService.js');
      const activeEmail = localStorage.getItem("prodrill_linked_email") || localStorage.getItem("prodrill_certified_email_plain") || "sysmedic3@gmail.com";
      await unpackAppData(pendingBackupPackage, mode, activeEmail);
      onFeedback({
        message: mode === 'merge' 
          ? '🎉 기존 지공 데이터를 100% 안전하게 보존하고, 백업 지공 차트 데이터를 성공적으로 덧붙였습니다!'
          : '🎉 백업 데이터로 성공적으로 덮어쓰기 복원되었습니다.',
        tone: 'success'
      });
    } catch (err) {
      onFeedback({ message: '복원 실패: ' + err.message, tone: 'danger' });
    } finally {
      setGoogleLoading(false);
      setPendingBackupPackage(null);
    }
  };

  const fetchSnapshots = async () => {
    if (!isGoogleSignedIn()) return;
    setLoadingSnapshots(true);
    try {
      const list = await listBackupSnapshots();
      setSnapshots(list || []);
    } catch (e) {
      console.warn("스냅샷 목록 로드 지연:", e);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    // 초기 로딩 시 설정값 복원
    setAutoSync(localStorage.getItem("prodrill_auto_sync_enabled") !== "false");

    const prof = getUserProfile();
    if (prof) {
      const nameVal = prof.name || "";
      const shopVal = prof.shopName || "";
      const phoneVal = prof.phone || "";
      setProfileName(nameVal);
      setProfileShop(shopVal);
      setProfilePhone(phoneVal);
      setInitialProfile({ name: nameVal, shopName: shopVal, phone: phoneVal });
    }

    const handleLicenseUpdate = () => {
      setLicenseInfo({
        certified: isLicenseCertified(),
        grace: calculateGracePeriod()
      });
      const p = getUserProfile();
      if (p) {
        setProfileName(p.name || "");
        setProfileShop(p.shopName || "");
        setProfilePhone(p.phone || "");
        setInitialProfile({ name: p.name || "", shopName: p.shopName || "", phone: p.phone || "" });
      } else {
        setProfileName("");
        setProfileShop("");
        setProfilePhone("");
        setInitialProfile({ name: "", shopName: "", phone: "" });
      }
    };

    window.addEventListener("prodrill_license_updated", handleLicenseUpdate);

    // 구글 API 사전 초기화 및 스냅샷 조회
    initGoogleApi()
      .then(() => fetchSnapshots())
      .catch(e => {
        console.warn("구글 API 초기 이닛 생략 (Vite 환경 변수가 비어있는 경우 등):", e);
      });

    return () => {
      window.removeEventListener("prodrill_license_updated", handleLicenseUpdate);
    };
  }, []);

  const isProfileDirty = profileName !== initialProfile.name || profileShop !== initialProfile.shopName || profilePhone !== initialProfile.phone;

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const email = localStorage.getItem("prodrill_linked_email") || localStorage.getItem("prodrill_certified_email_plain") || "";
    if (!email) {
      onFeedback({ message: "구글 계정이 연동되어 있지 않습니다.", tone: "warning" });
      return;
    }
    const cleanName = sanitizeString(profileName, 15);
    const cleanShop = sanitizeString(profileShop, 30);
    const cleanPhone = sanitizeString(profilePhone, 20);

    if (!cleanName) {
      onFeedback({ message: "지공사 성함을 정확히 입력해 주세요.", tone: "warning" });
      return;
    }

    setProfileSaving(true);
    try {
      await saveUserProfile(email, { name: cleanName, shopName: cleanShop, phone: cleanPhone }, "user");
      setInitialProfile({ name: cleanName, shopName: cleanShop, phone: cleanPhone });
      onFeedback({ message: "지공사 프로필 정보가 변경 저장되었습니다.", tone: "success" });
    } catch (err) {
      console.error("프로필 저장 에러:", err);
      onFeedback({ message: "프로필 저장 중 오류가 발생했습니다.", tone: "danger" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleGoogleBackup = async () => {
    if (!licenseInfo.certified && licenseInfo.grace.isExpired) {
      onFeedback({ message: "미인증 계정이거나 트라이얼 기간이 만료되어 구글 드라이브 백업 권한이 제한됩니다.", tone: "danger" });
      return;
    }
    setGoogleLoading(true);
    try {
      await performBackup();
      const nowStr = new Date().toISOString();
      localStorage.setItem("prodrill_last_backup_time", nowStr);
      await fetchSnapshots();
      onFeedback({ message: "구글 드라이브 백업 스냅샷 저장이 완료되었습니다.", tone: "success" });
    } catch (err) {
      console.error("구글 백업 실패:", err);
      onFeedback({ message: "백업 실패: 인터넷 연결 상태나 로그인 권한을 확인해 주세요.", tone: "danger" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const triggerGoogleRestore = (snapshotId = null) => {
    if (!licenseInfo.certified && licenseInfo.grace.isExpired) {
      onFeedback({ message: "미인증 계정이거나 트라이얼 기간이 만료되어 백업 복원 권한이 제한됩니다.", tone: "danger" });
      return;
    }
    setSelectedSnapshotId(snapshotId);
    setShowSyncModeConfirm(true);
  };

  const handleConfirmGoogleRestore = async () => {
    setShowSyncModeConfirm(false);
    setGoogleLoading(true);
    try {
      await performRestore(selectedSnapshotId, "overwrite");
      onFeedback({ message: "선택한 백업 스냅샷 데이터로 100% 덮어쓰기 복원이 성공적으로 완료되었습니다!", tone: "success" });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("구글 복원 실패:", err);
      onFeedback({ message: "복원 실패: 백업 파일을 읽는 도중 오류가 발생했습니다.", tone: "danger" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleContactAdmin = async () => {
    const adminEmail = "sysmedic@gmail.com";
    const subject = encodeURIComponent("[ProDrill] 라이선스 연장 및 등록 문의");
    const body = encodeURIComponent("안녕하세요, ProDrill 지공 차트 앱 라이선스 문의드립니다.\n\n계정 이메일: " + (localStorage.getItem("prodrill_linked_email") || localStorage.getItem("prodrill_certified_email_plain") || "지공사 계정"));

    window.location.href = "mailto:" + adminEmail + "?subject=" + subject + "&body=" + body;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(adminEmail);
      }
    } catch (e) {
      console.warn("클립보드 복사 지연:", e);
    }

    onFeedback({
      message: "관리자 이메일(" + adminEmail + ")이 복사되었습니다. 메일을 보내주세요.",
      tone: "success"
    });
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    localStorage.setItem("prodrill_auto_sync_enabled", nextVal ? "true" : "false");
    onFeedback({ 
      message: "자동 백업 및 동기화 기능이 " + (nextVal ? "활성화" : "비활성화") + "되었습니다.", 
      tone: "success" 
    });
  };

  const formatBackupDate = (isoStr) => {
    if (!isoStr || isoStr === "기록 없음") return "기록 없음";
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      return date.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  const visibleSnapshots = showMoreSnapshots ? snapshots : snapshots.slice(0, 3);
  const licenseStatus = typeof window !== "undefined" ? (localStorage.getItem("prodrill_license_status") || "") : "";
  const isRevoked = licenseStatus === "suspended" || licenseStatus === "revoked" || licenseStatus === "locked" || licenseStatus === "inactive";
  const isExpiredUncertified = isRevoked || (!licenseInfo.certified && licenseInfo.grace.isExpired);

  return (
    <>
      <ModalShell onClose={onClose} size="sm" title="☁️ 클라우드 백업" titleId="settings-modal-title">
        <div className="p-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

          {/* A. 지공사 프로필 + 라이선스/트라이얼/미인증 상태 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">지공사 프로필</h3>
              {/* 은은하고 조화로운 라이선스/트라이얼/미인증 뱃지 */}
              {licenseInfo.certified && !isRevoked ? (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 정식 계정
                </span>
              ) : isRevoked ? (
                <div className="flex items-center gap-1.5">
                  <span className="bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 인증 만료
                  </span>
                  <button
                    type="button"
                    onClick={handleContactAdmin}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    라이선스 문의
                  </button>
                </div>
              ) : !licenseInfo.grace.isExpired ? (
                <span className="bg-slate-100 text-slate-600 border border-slate-200/80 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> 트라이얼 잔여 {licenseInfo.grace.daysLeft}일
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 트라이얼 만료
                  </span>
                  <button
                    type="button"
                    onClick={handleContactAdmin}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    라이선스 문의
                  </button>
                </div>
              )}
            </div>
            <p className={"text-[11px] leading-normal " + (isExpiredUncertified ? "text-rose-600 font-bold" : "text-slate-500")}>
              {isExpiredUncertified
                ? "라이선스가 만료되어 클라우드 백업 및 복원이 제한됩니다."
                : "상주하시는 지공 샵 명칭과 성함을 등록해 두시면 라이선스 관리 및 차트 프로필에 안전하게 반영됩니다."
              }
            </p>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-black text-slate-600 mb-1">지공사 성함 *</label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-600 mb-1">지공 샵</label>
                <input
                  type="text"
                  placeholder="예: 서울 붐볼링 지공 샵"
                  value={profileShop}
                  onChange={(e) => setProfileShop(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              {isProfileDirty && (
                <div className="pt-1 flex justify-end animate-fade-in">
                  <Button onClick={handleSaveProfile} disabled={profileSaving} size="sm" variant="primary">
                    {profileSaving ? "저장 중..." : "프로필 수정 저장"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* B. 구글 드라이브 클라우드 동기화 및 다중 스냅샷 복원 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button className="w-full text-xs font-bold" onClick={handleGoogleBackup} variant="primary" disabled={googleLoading || isExpiredUncertified}>
                  {googleLoading ? "백업 중..." : "드라이브에 백업 하기"}
                </Button>
              </div>



              {/* 📤 로컬 백업 파일 직접 불러오기 (복원 선택 연동) */}
              <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    📤 로컬 백업 파일 직접 불러오기
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">.json 복원</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-normal font-bold">
                  변환되거나 저장된 백업 JSON 파일을 선택하여, 기존 차트에 덧붙이거나 전체 덮어쓰기 복원을 진행합니다.
                </p>
                <div className="pt-1">
                  <label className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                    <span>📤 백업 파일 선택 및 복원</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleFileRestoreSelect}
                    />
                  </label>
                </div>
              </div>

              {/* 백업 스냅샷 목록 */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                    백업 스냅샷 <span className="text-[10px] text-slate-400 font-bold">(최대 30개 보관)</span>
                  </h4>
                  {loadingSnapshots && <span className="text-[10px] text-indigo-600 font-bold animate-pulse">조회 중...</span>}
                </div>

                {snapshots.length === 0 && !loadingSnapshots ? (
                  <div className="text-[11px] text-slate-400 font-bold p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    보관된 백업 스냅샷이 없습니다. [드라이브에 백업 하기] 버튼을 클릭하세요.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleSnapshots.map((snap, idx) => (
                      <div key={snap.id || idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-300 transition-all">
                        <div>
                          <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                            {idx === 0 && <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded text-[9px] font-black">최신</span>}
                            <span>{formatBackupDate(snap.createdTime)}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 flex gap-2 mt-0.5">
                            <span>고객 {snap.customerCount || 0}명</span>
                            <span>차트 {snap.chartCount || 0}개</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => triggerGoogleRestore(snap.id)}
                          disabled={googleLoading || isExpiredUncertified}
                          className="px-2.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-[11px] font-black transition-colors shrink-0 active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          복원
                        </button>
                      </div>
                    ))}

                    {snapshots.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowMoreSnapshots(!showMoreSnapshots)}
                        className="w-full py-2 text-center text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-100 flex items-center justify-center gap-1 mt-1 cursor-pointer"
                      >
                        {showMoreSnapshots ? (
                          <>이전 백업 접기</>
                        ) : (
                          <>이전 백업 스냅샷 더보기 (총 {snapshots.length}개 중 {snapshots.length - 3}개 더보기)</>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* AI 모달 기준과 동기화된 자동 백업 토글 스위치 */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-bold">앱 실행/종료 시 자동 백업</span>
                  <button 
                    type="button"
                    onClick={handleToggleAutoSync}
                    disabled={isExpiredUncertified}
                    className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 " + (autoSync ? "bg-indigo-600" : "bg-slate-300")}
                  >
                    <span className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (autoSync ? "translate-x-4" : "translate-x-0")} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </ModalShell>

      {/* 1. 구글 드라이브 복원 컨펌 모달 */}
      {showSyncModeConfirm && (
        <ConfirmModal
          confirmLabel="동기화 병합 복원"
          message="선택하신 백업 스냅샷과 현재 기기의 데이터를 중복 없이 하나로 통합(병합)합니다. 오프라인에서 새로 작업한 차트도 모두 안전하게 보존됩니다. 계속 진행하시겠습니까?"
          onCancel={() => setShowSyncModeConfirm(false)}
          onConfirm={handleConfirmGoogleRestore}
          title="클라우드 통합 복원 확인"
          titleId="google-restore-confirm-title"
          zClassName="z-[150]"
        />
      )}

      {/* 2. 로컬 백업 파일 복원 모드 선택 모달 (기존 차트에 덧붙이기 vs 전체 덮어쓰기) */}
      {showRestoreModeConfirm && (
        <ModalShell
          align="center"
          onClose={() => { setShowRestoreModeConfirm(false); setPendingBackupPackage(null); }}
          size="md"
          title="백업 복원 방식 선택"
          titleId="restore-mode-select-title"
          variant="light"
          zClassName="z-[160]"
        >
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              불러오려는 백업 데이터를 현재 프로드릴 앱에 적용할 방식을 선택해 주세요.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleExecuteRestoreMode('merge')}
                className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-left transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-900 group-hover:text-emerald-950 flex items-center gap-1.5">
                    <span>➕ 기존 차트에 덧붙이기</span>
                    <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">권장</span>
                  </span>
                </div>
                <p className="text-[11px] font-bold text-emerald-700 leading-normal">
                  이미 작성해두신 기존 고객 카드나 지공 차트를 <strong>100% 보존</strong>하면서, 백업 및 엑셀 마이그레이션 데이터만 안전하게 추가합니다.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleExecuteRestoreMode('overwrite')}
                className="w-full p-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-left transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-700 group-hover:text-rose-700">
                    전체 덮어쓰기
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 group-hover:text-rose-600 leading-normal">
                  현재 기기의 기존 데이터를 삭제하고, 불러온 백업 파일 데이터로 전체 교체합니다.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={() => { setShowRestoreModeConfirm(false); setPendingBackupPackage(null); }} size="sm" variant="secondary">
                취소
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

    </>
  );
}
