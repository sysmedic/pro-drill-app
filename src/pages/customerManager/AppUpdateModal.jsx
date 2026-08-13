import { useState, useEffect } from "react";
import ModalShell from "../../components/ui/ModalShell.jsx";
import { checkForAppUpdate, triggerAppReload, CURRENT_APP_BUILD_DATE } from "../../lib/pwaUpdate.js";

export default function AppUpdateModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [isChecking, setIsChecking] = useState(true);
  const [updateResult, setUpdateResult] = useState(null);

  const runCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkForAppUpdate();
      setUpdateResult({
        checked: true,
        currentBuild: res.currentBuild,
        serverBuild: res.serverBuild,
        hasNewVersion: res.hasNewVersion
      });
      if (res.hasNewVersion) {
        onFeedback({
          message: "\u2728 새로운 앱 업데이트가 발견되었습니다!",
          tone: "info"
        });
      } else {
        onFeedback({
          message: "[최신] 현재 최신 배포본을 이용 중입니다.",
          tone: "success"
        });
      }
    } catch (err) {
      console.error("업데이트 검사 오류:", err);
      onFeedback({
        message: "업데이트 정보 확인 중 오류가 발생했습니다.",
        tone: "danger"
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <ModalShell onClose={onClose} size="sm" title={"\uD83D\uDD04 앱 업데이트 정보"}>
      <div className="p-5 flex flex-col gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                {"\uD83C\uDF10"} 실시간 배포 정보 비교
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                현재 설치/사용 중인 앱과 서버의 최신 배포 일자를 대조합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={runCheck}
              disabled={isChecking}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
            >
              {isChecking ? "검사 중..." : "다시 확인"}
            </button>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span>{"\uD83D\uDCF1"} 현재 사용 앱 배포일자:</span>
              <span className="font-bold text-slate-800">{CURRENT_APP_BUILD_DATE}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 font-medium pt-2 border-t border-slate-100">
              <span>{"\uD83C\uDF10"} 최신 서버 배포일자:</span>
              <span className="font-bold text-indigo-700">
                {isChecking ? "조회 중..." : (updateResult?.serverBuild || "확인 불가")}
              </span>
            </div>

            {updateResult?.checked && !isChecking && (
              <div className="pt-2.5 text-center font-bold border-t border-slate-100">
                {updateResult.hasNewVersion ? (
                  <div className="space-y-2.5">
                    <p className="text-amber-600 text-[11.5px] bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                      {"\u2728"} 새로운 버전의 앱이 출시되었습니다! 아래 버튼을 눌러 업데이트를 적용하세요.
                    </p>
                    <button
                      type="button"
                      onClick={triggerAppReload}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      {"\u26A1"} 지금 최신 버전으로 업데이트
                    </button>
                  </div>
                ) : (
                  <p className="text-emerald-600 text-[11.5px] bg-emerald-50 p-2 rounded-lg border border-emerald-200/60">
                    [최신] 현재 이미 최신 버전을 사용하고 계십니다.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            type="button"
            className="w-full sm:w-24 py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
