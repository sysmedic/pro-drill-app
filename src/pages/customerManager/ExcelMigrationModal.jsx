import { useState } from 'react';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { isMigrationAuthorizedEmail } from '../../lib/userLicenseManager.js';

export default function ExcelMigrationModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [loading, setLoading] = useState(false);

  const activeEmail = (typeof window !== "undefined"
    ? (localStorage.getItem("prodrill_linked_email") || localStorage.getItem("prodrill_certified_email_plain") || "sysmedic3@gmail.com")
    : "sysmedic3@gmail.com"
  ).trim().toLowerCase();

  const isAuthorized = isMigrationAuthorizedEmail(activeEmail);

  if (!isAuthorized) {
    return (
      <ModalShell onClose={onClose} size="sm" title="📦 엑셀 마이그레이션 (권한 제한)">
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
    <ModalShell onClose={onClose} size="sm" title="📦 엑셀 마이그레이션 (관리자 전용)">
      <div className="p-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
        <p className="text-xs text-slate-600 font-bold leading-relaxed">
          기존 사용하시던 엑셀 지공 차트(.xlsx) 폴더나 다중 파일들을 선택하시면, ProDrill 호환 백업 JSON 파일로 1초 만에 일괄 변환 및 다운로드합니다.
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
              엑셀 차트들이 담긴 폴더나 다중 파일들을 선택해 주세요. 마이그레이션된 소유자 서명이 주입된 백업 파일이 생성됩니다.
            </p>
          </div>

          <label className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            <span>{loading ? "⌛ 변환 처리 중..." : "📁 엑셀 폴더 / 다중 파일 선택 ➔ 백업 JSON 변환"}</span>
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
                    message: `🎉 엑셀 백업 다운로드 완료! 총 ${res.totalFiles}개 파일 처리 (${res.customerCount}명 고객 마이그레이션). 다운로드된 '${res.filename}' 파일로 [🗂️ 로컬 백업] 복원을 진행해 주세요.`,
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

        {/* 2. 안내 및 닫기 */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500 space-y-1">
          <p>💡 마이그레이션 완료 후 생성된 JSON 파일은 햄버거 메뉴 ➔ [🗂️ 로컬 백업] ➔ [백업 파일 직접 불러오기]를 통해 앱으로 복원하실 수 있습니다.</p>
        </div>

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
  );
}
