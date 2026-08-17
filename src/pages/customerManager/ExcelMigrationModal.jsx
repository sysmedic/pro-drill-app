import { useState } from 'react';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import { isMigrationAuthorizedEmail } from '../../lib/userLicenseManager.js';

export default function ExcelMigrationModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [loading, setLoading] = useState(false);

  // 복원 모드 선택 관련 상태 (기존 차트에 덧붙이기 vs 전체 덮어쓰기)
  const [pendingBackupPackage, setPendingBackupPackage] = useState(null);
  const [showRestoreModeConfirm, setShowRestoreModeConfirm] = useState(false);

  const activeEmail = (typeof window !== "undefined"
    ? (localStorage.getItem("prodrill_linked_email") || localStorage.getItem("prodrill_certified_email_plain") || "sysmedic3@gmail.com")
    : "sysmedic3@gmail.com"
  ).trim().toLowerCase();

  const isAuthorized = isMigrationAuthorizedEmail(activeEmail);

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
    setLoading(true);
    setShowRestoreModeConfirm(false);
    try {
      const { unpackAppData } = await import('../../lib/syncService.js');
      await unpackAppData(pendingBackupPackage, mode, activeEmail);
      onFeedback({
        message: mode === 'merge' 
          ? '🎉 기존 지공 데이터를 100% 안전하게 보존하고, 백업 지공 차트 데이터를 성공적으로 덧붙였습니다!'
          : '🎉 백업 데이터로 성공적으로 덮어쓰기 복원되었습니다.',
        tone: 'success'
      });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      onFeedback({ message: '복원 실패: ' + err.message, tone: 'danger' });
    } finally {
      setLoading(false);
      setPendingBackupPackage(null);
    }
  };

  if (!isAuthorized) {
    return (
      <ModalShell onClose={onClose} size="sm" title="📦 엑셀 마이그레이션">
        <div className="p-5 text-center space-y-4">
          <p className="text-xs text-red-600 font-bold">
            [경고] 엑셀 마이그레이션 도구는 지정 관리자 계정(sysmedic3@gmail.com, worms0529@gmail.com) 전용 기능입니다.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs"
          >
            닫기
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <>
      <ModalShell onClose={onClose} size="sm" title="📦 엑셀 마이그레이션">
        <div className="p-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-slate-600 font-bold leading-relaxed">
            기존 엑셀 지공 차트(.xlsx)를 백업 JSON 파일로 변환하여 다운로드하거나, 변환된 백업 파일(.json)을 직접 선택하여 복원합니다.
          </p>

          {/* 1. 엑셀 폴더 / 다중 파일 선택 변환 */}
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  📁 엑셀 폴더 / 다중 파일 변환
                </h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">.xlsx ➔ .json</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-800 leading-normal">
                엑셀 차트들이 담긴 폴더나 다중 파일들을 선택해 주세요. 소유자 서명이 주입된 백업 JSON 파일이 생성 다운로드됩니다.
              </p>
            </div>

            <label className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span>{loading ? "⌛ 처리 중..." : "📁 엑셀 폴더 / 다중 파일 선택 ➔ 백업 JSON 변환"}</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                multiple
                webkitdirectory="true"
                directory="true"
                className="hidden"
                disabled={loading}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  setLoading(true);
                  try {
                    const { convertMultipleExcelsToBackupJsonInBrowser } = await import('../../lib/excelMigrationService.js');
                    const res = await convertMultipleExcelsToBackupJsonInBrowser(files, activeEmail);
                    onFeedback({
                      message: `🎉 엑셀 백업 다운로드 완료! 총 ${res.totalFiles}개 파일 처리 (${res.customerCount}명 고객 마이그레이션). 변환된 '${res.filename}' 파일로 아래 [백업 파일 불러오기]를 실행하세요.`,
                      tone: "success"
                    });
                  } catch (err) {
                    console.error("엑셀 백업 변환 오류:", err);
                    onFeedback({
                      message: `엑셀 변환 실패: ${err.message || "파일 변환 중 오류가 발생했습니다."}`,
                      tone: "danger"
                    });
                  } finally {
                    setLoading(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>

          {/* 2. 📤 변환 완료된 백업 JSON 파일 직접 불러오기 (이전 통합!) */}
          <div className="bg-indigo-50/80 p-4 rounded-xl border border-indigo-200 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  📤 변환 완료된 백업 JSON 파일 불러오기 및 복원
                </h4>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-300">.json 복원</span>
              </div>
              <p className="text-[11px] font-bold text-indigo-800 leading-normal">
                변환되거나 보관된 백업 JSON 파일(`prodrill_local_backup_...json`)을 선택하여, 기존 차트에 덧붙이거나 전체 덮어쓰기 복원을 진행합니다.
              </p>
            </div>

            <label className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span>📤 백업 JSON 파일 선택 및 복원</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                disabled={loading}
                onChange={handleFileRestoreSelect}
              />
            </label>
          </div>

          {/* 3. 닫기 버튼 */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-28 py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </ModalShell>

      {/* 4. 복원 방식 선택 컨펌 모달 (덧붙이기 vs 덮어쓰기) */}
      {showRestoreModeConfirm && (
        <ConfirmModal
          confirmLabel="기존 데이터 유지하고 덧붙이기"
          message={`선택하신 백업 파일(고객 ${pendingBackupPackage?.data?.customers?.length || 0}명)의 지공 차트 데이터를 현재 앱에 어떤 방식으로 복원하시겠습니까?`}
          onCancel={() => handleExecuteRestoreMode('overwrite')}
          onConfirm={() => handleExecuteRestoreMode('merge')}
          title="백업 복원 방식 선택"
          titleId="migration-restore-mode-confirm-title"
          zClassName="z-[2000]"
          dangerLabel="전체 덮어쓰기 (기존 삭제)"
        />
      )}
    </>
  );
}

