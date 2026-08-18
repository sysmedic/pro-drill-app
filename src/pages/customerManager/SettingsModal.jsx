import { useState, useEffect } from "react";
import Button from "../../components/ui/Button.jsx";
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

  const handleConfirmGoogleRestore = async (restoreMode = 'merge') => {
    setShowSyncModeConfirm(false);
    setGoogleLoading(true);
    try {
      await performRestore(selectedSnapshotId, restoreMode);
      
      // 🟢 [완치 수술]: 비동기 IDB 저장 완결 후 실시간 UI 갱신 이벤트 발행 (조기 새로고침으로 인한 유실 차단)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prodrill_data_restored'));
        window.dispatchEvent(new Event('storage'));
      }

      const msg = restoreMode === 'merge'
        ? "선택한 백업 데이터와 현재 기기 데이터의 1:1 증분 병합 복원이 완료되었습니다!"
        : "선택한 백업 스냅샷 데이터로 100% 덮어쓰기 복원이 성공적으로 완료되었습니다!";
      onFeedback({ message: msg, tone: "success" });

      // 🟢 [완치 수술]: 복원 완료 시 설정 모달 자동 닫기
      if (typeof onClose === 'function') {
        onClose();
      }
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





              {/* 백업 스냅샷 목록 */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                    백업 스냅샷
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

      {/* 1. 구글 드라이브 복원 방식 선택 모달 */}
      {showSyncModeConfirm && (
        <ModalShell
          align="center"
          onClose={() => setShowSyncModeConfirm(false)}
          size="sm"
          title="클라우드 백업 복원 선택"
          variant="light"
          zClassName="z-[150]"
        >
          <div className="p-4 flex flex-col gap-3 text-center">
            <p className="text-xs font-bold text-slate-600 mb-1">
              복원 방식을 선택해 주세요.
            </p>

            <button
              onClick={() => handleConfirmGoogleRestore('merge')}
              className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-left hover:bg-indigo-100 transition-colors active:scale-95 cursor-pointer"
            >
              <span className="font-black text-indigo-700 text-xs block">[증분 복원] (병합 - 추천)</span>
              <span className="text-[11px] text-indigo-600 block mt-0.5">
                기존 내 기기 데이터와 클라우드 백업을 합쳐 타임스탬프 순으로 둘 다 보존합니다.
              </span>
            </button>

            <button
              onClick={() => handleConfirmGoogleRestore('overwrite')}
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left hover:bg-rose-100 transition-colors active:scale-95 cursor-pointer"
            >
              <span className="font-black text-rose-700 text-xs block">[덮어쓰기 복원]</span>
              <span className="text-[11px] text-rose-600 block mt-0.5">
                기존 내 기기 데이터를 지우고 클라우드 백업본 상태로 100% 동일하게 복원합니다.
              </span>
            </button>
          </div>
        </ModalShell>
      )}



    </>
  );
}
