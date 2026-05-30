import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { ExitConfirmModal, MemoModal } from './ChartModals.jsx';
import DrillingGuideView from './DrillingGuideView.jsx';
import SettingsModal from '../customerManager/SettingsModal.jsx';

export default function ChartModalManager({
  activeMemoId,
  showHistoryModal,
  historyConfirm,
  renameRequest,
  deleteRequest,
  showModifyWarning,
  showExitConfirm,
  sharePreview,
  showDrillingGuide,
  showSettingsModal,
  
  memos,
  history,
  maxChartsAllowed,
  currentChartsCount,
  viewingRecord,
  shareFilename,
  chartData,
  customer,
  userTier,
  ballName,
  
  setMemos,
  setHistoryConfirm,
  setRenameRequest,
  setDeleteRequest,
  setShowModifyWarning,
  setShowExitConfirm,
  setSharePreview,
  setShareFilename,
  setShowDrillingGuide,
  setShowSettingsModal,
  setBallName,
  setLayoutInfo,
  setIntent,
  setViewingRecord,
  setSessionRecordId,
  setSessionRecordName,
  setIsEditMode,
  setFeedback,
  loadRecord,
  handleRenameRecord,
  handleDeleteRecord,
  handleSave,
  onBack,
  executeShare,
  handleChartDataChange,
  saveActiveMemoText,
  deleteActiveMemo
}) {
  const [memoDeleteRequested, setMemoDeleteRequested] = React.useState(false);
  const [inputName, setInputName] = useState('');

  // 이름 변경 대상 지정 시 입력값 초기 동기화
  useEffect(() => {
    if (renameRequest?.currentName) {
      setInputName(renameRequest.currentName);
    }
  }, [renameRequest]);

  return (
    <>
      {/* 1. 메모 모달 */}
      {activeMemoId && (() => {
        const activeMemo = memos.find(m => m.id === activeMemoId);
        return (
          <MemoModal
            title={activeMemo?.text ? "메모" : "메모 작성"}
            memo={activeMemo}
            onSave={saveActiveMemoText}
            onDelete={() => setMemoDeleteRequested(true)}
          />
        );
      })()}

      {/* 메모 삭제 확인 모달 */}
      {memoDeleteRequested && (
        <ConfirmModal
          cancelLabel="취소"
          confirmLabel="삭제"
          danger={true}
          message="이 메모를 정말 삭제하시겠습니까?"
          onCancel={() => setMemoDeleteRequested(false)}
          onConfirm={() => {
            deleteActiveMemo();
            setMemoDeleteRequested(false);
          }}
          title="메모 삭제"
          titleId="memo-delete-confirm-title"
        />
      )}

      {/* 3. 불러오기 확인 모달 */}
      {historyConfirm && (
        <ConfirmModal
          confirmLabel="불러오기"
          message={`${historyConfirm.timestamp} 기록을 불러오시겠습니까?`}
          onCancel={() => setHistoryConfirm(null)}
          onConfirm={() => {
            loadRecord(historyConfirm);
            setHistoryConfirm(null);
          }}
          title="기록 불러오기"
          titleId="history-load-confirm-title"
        />
      )}

      {/* 이름 변경 모달 */}
      {renameRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleRenameRecord(inputName);
            }}
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-1.5">기록 이름 변경</h3>
              <p className="text-xs text-slate-500 font-semibold mb-4 leading-normal">
                변경할 지공 기록의 이름을 입력해 주세요.
              </p>
              <div className="flex items-center w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-slate-800 placeholder-slate-400 focus:ring-0 p-0"
                  placeholder="새로운 이름을 입력하세요"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                type="button"
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm active:scale-95 transition-all"
                onClick={() => setRenameRequest(null)}
              >
                취소
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm active:scale-95 transition-all"
              >
                변경
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 기록 삭제 확인 모달 */}
      {deleteRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2">기록 삭제</h3>
              <p className="text-sm text-slate-600 font-medium leading-snug">
                이 기록을 정말 삭제하시겠습니까?<br/>삭제된 기록은 복구할 수 없습니다.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                type="button"
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm active:scale-95 transition-all"
                onClick={() => setDeleteRequest(null)}
              >
                취소
              </button>
              <button 
                type="button"
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm active:scale-95 transition-all"
                onClick={() => {
                  handleDeleteRecord(deleteRequest);
                  setDeleteRequest(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기록 수정 알림 모달 */}
      {showModifyWarning && (
        <ConfirmModal
          title="불러온 차트 기록 변경"
          message={"불러온 차트의 내용이 변경됩니다. 이대로 저장하면 기존 기록이 완전히 덮어씌워집니다. 계속하시겠습니까?\n\n(※ 새로운 차트로 생성하려면 '취소'를 누른 후 상단의 기록 배너를 클릭해 주세요.)"}
          confirmLabel="내용 변경"
          cancelLabel="취소"
          danger={true}
          onConfirm={() => {
            setShowModifyWarning(false);
          }}
          onCancel={() => {
            const originalRecord = history.find(r => r.id === viewingRecord.id);
            if (originalRecord) loadRecord(originalRecord);
            setShowModifyWarning(false);
          }}
        />
      )}

      {/* 퇴장 확인 모달 */}
      {showExitConfirm && (
        <ExitConfirmModal
          onClose={() => setShowExitConfirm(false)}
          onSaveAndExit={async () => {
            const isSaved = await handleSave(true); 
            if (isSaved) {
              setShowExitConfirm(false);
              onBack();
            }
          }}
          onExitWithoutSave={() => {
            setShowExitConfirm(false);
            onBack(); 
          }}
        />
      )}

      {/* 공유 미리보기 모달 */}
      {sharePreview && (
        <ModalShell
          bodyClassName="p-5 flex flex-col gap-4 bg-slate-50"
          icon="chart"
          onClose={() => setSharePreview(null)}
          size="md"
          title="미리보기"
          titleId="share-preview-modal-title"
          zClassName="z-[150]"
        >
          <div className="w-full max-h-[50vh] overflow-y-auto rounded-lg border border-slate-300 shadow-inner bg-white">
            <img src={URL.createObjectURL(sharePreview)} alt="지공차트 미리보기" className="w-full h-auto" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="share-filename" className="text-sm font-bold text-slate-700">저장 파일명</label>
            <div className="flex items-center gap-2">
              <input
                id="share-filename"
                type="text"
                value={shareFilename}
                onChange={(e) => setShareFilename(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="파일명을 입력하세요"
              />
              <span className="text-slate-500 font-medium text-sm">.png</span>
            </div>
          </div>
          <p className="text-xs text-center text-slate-500 font-medium px-2 mt-1">이 이미지를 공유하거나 기기에 저장하시겠습니까?</p>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setSharePreview(null)} size="lg" variant="secondary">
              취소
            </Button>
            <Button className="flex-1" onClick={executeShare} size="lg" variant="primary">
              공유 / 저장
            </Button>
          </div>
        </ModalShell>
      )}

      {/* 지공 도면 가이드 뷰 모달 */}
      {showDrillingGuide && (
        <DrillingGuideView
          data={chartData}
          customer={customer}
          onClose={() => {
            setShowDrillingGuide(false);
            setIsEditMode(false);
          }}
          onGuideStateChange={(drillingGuide) => handleChartDataChange({ ...chartData, drillingGuide })}
        />
      )}

      {/* 세팅 모달 */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onFeedback={setFeedback}
        />
      )}
    </>
  );
}