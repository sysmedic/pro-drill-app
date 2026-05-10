export default function ChartTopBar({
  isEditMode,
  utilityState,
  onBack,
  onSave,
  onToggleEditMode,
  onToggleUtility,
}) {
  return (
    <>
      {/* 공간을 차지하여 아래 내용이 위로 빨려올라가지 않게 하는 빈 박스 */}
      <div className="h-[64px] sm:h-[76px] mb-4 sm:mb-6 w-full shrink-0" aria-hidden="true" />
      
      {/* 화면에 항상 고정되는 실제 네비게이션 바 */}
      <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 border-b-[4px] border-b-slate-300 fixed top-2 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-[768px] z-[110] flex justify-between items-center">
      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <button type="button" onClick={onBack} className="p-1.5 sm:p-2 bg-gradient-to-b from-white to-slate-100 text-slate-600 border border-slate-200 shadow-sm rounded-lg font-bold text-sm sm:text-base transition-all hover:to-slate-200 active:scale-95">◀ Back</button>
        <button
          type="button"
          onClick={onToggleUtility}
          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold shadow-sm text-xs sm:text-sm transition-colors border active:scale-95 bg-gradient-to-b from-white to-slate-50 text-slate-700 border-slate-200"
        >
          🛠️ 유틸
        </button>
      </div>

      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleEditMode}
          className="bg-gradient-to-b from-indigo-50 to-indigo-100 text-indigo-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-black shadow-sm text-xs sm:text-sm border border-indigo-200 active:scale-95 transition-transform"
        >
          {isEditMode ? '📄 차트' : '✏️ 수정'}
        </button>
        <button type="button" onClick={onSave} className="bg-gradient-to-b from-indigo-500 to-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold shadow-md border border-indigo-700 border-b-[3px] active:border-b-[1px] active:translate-y-[2px] text-sm sm:text-base transition-all shrink-0">Save</button>
      </div>
    </div>
    </>
  );
}
