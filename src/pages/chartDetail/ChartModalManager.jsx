import React from 'react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal, TextInputModal } from '../../components/ui/Dialogs.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { ExitConfirmModal, HistoryModal, MemoModal } from './ChartModals.jsx';
import DrillingGuideView from './DrillingGuideView.jsx';
import SettingsModal from '../customerManager/SettingsModal.jsx';

export default function ChartModalManager({
  // 제어 상태 변수
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
  
  // 데이터 변수
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
  
  // 상태 변경 Setter 및 액션 함수
  setMemos,
  setShowHistoryModal,
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
  return (
    <>
      {/* 1. 메모 모달 */}
      {activeMemoId && (
        <MemoModal
          memo={memos.find(m => m.id === activeMemoId)}
          onSave={saveActiveMemoText}
          onDelete={deleteActiveMemo}
        />
      )}

      {/* 2. 기록 역사 모달 */}
      {showHistoryModal && (
        <HistoryModal
          history={history}
          maxChartsAllowed={maxChartsAllowed}
          currentChartsCount={currentChartsCount}
          onSelect={(record) => setHistoryConfirm(record)}
          onClose={() => setShowHistoryModal(false)}
          onDelete={(id) => setDeleteRequest(id)}
          onRename={(id, currentName) => setRenameRequest({ id, currentName })}
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

      {/* 4. 이름 변경 모달 */}
      {renameRequest && (
        <TextInputModal
          confirmLabel="변경"
          initialValue={renameRequest.currentName || ''}
          label="새 기록 이름"
          onCancel={() => setRenameRequest(null)}
          onConfirm={handleRenameRecord}
          placeholder="새로운 이름을 입력하세요"
          title="기록 이름 변경"
          titleId="history-rename-input-title"
        />
      )}

      {/* 5. 삭제 확인 모달 */}
      {deleteRequest && (
        <ConfirmModal
          cancelLabel="취소"
          confirmLabel="삭제"
          danger={true}
          message={"이 기록을 정말 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다."}
          onCancel={() => setDeleteRequest(null)}
          onConfirm={() => {
            handleDeleteRecord(deleteRequest);
            setDeleteRequest(null);
          }}
          title="기록 삭제"
          titleId="history-delete-confirm-title"
        />
      )}

      {/* 6. 기록 수정 알림 모달 (개편됨) */}
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
            // 변경 내용을 되돌리고 모달을 닫음 (이후 배너를 클릭하여 안전하게 새 템플릿 생성 가능)
            const originalRecord = history.find(r => r.id === viewingRecord.id);
            if (originalRecord) loadRecord(originalRecord);
            setShowModifyWarning(false);
          }}
        />
      )}

      {/* 7. 퇴장 확인 모달 */}
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

      {/* 8. 공유 미리보기 모달 */}
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

      {/* 9. 지공 도면 가이드 뷰 모달 */}
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

      {/* 10. 세팅 모달 */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onFeedback={setFeedback}
        />
      )}
    </>
  );
}