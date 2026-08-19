import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { ExitConfirmModal, MemoModal } from './ChartModals.jsx';
import DrillingGuideView from './DrillingGuideView.jsx';
import SettingsModal from '../customerManager/SettingsModal.jsx';
import SpanConverterModal from './SpanConverterModal.jsx';
import SpanGuideModal from './SpanGuideModal.jsx';

export default function ChartModalManager({
  activeMemoId,
  setActiveMemoId, 
  historyConfirm,
  renameRequest,
  deleteRequest,
  showModifyWarning,
  showExitConfirm,
  sharePreview,
  showDrillingGuide,
  showSettingsModal,
  showSpanConverter,
  setShowSpanConverter,
  showSpanGuide,
  setShowSpanGuide,
  
  memos,
  history,
  viewingRecord,
  shareFilename,
  chartData,
  customer,
  
  setHistoryConfirm,
  setRenameRequest,
  setDeleteRequest,
  setShowModifyWarning,
  setShowExitConfirm,
  setSharePreview,
  setShareFilename,
  setShowDrillingGuide, 
  setShowSettingsModal,
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

  const [guideChanged, setGuideChanged] = useState(false);
  const [showGuideCloseConfirm, setShowGuideCloseConfirm] = useState(false);

  useEffect(() => {
    if (renameRequest?.currentName) {
      setInputName(renameRequest.currentName);
    }
  }, [renameRequest]);

  useEffect(() => {
    if (showDrillingGuide) {
      setGuideChanged(false);
      setShowGuideCloseConfirm(false);
    }
  }, [showDrillingGuide]);

  return (
    <>
      {/* 1. 메모 모달 */}
      {activeMemoId && (() => {
        const activeMemo = memos.find(m => m.id === activeMemoId);
        
        return (
          <MemoModal
            title={activeMemo?.text ? "메모" : "메모 작성"}
            memo={activeMemo}
            onDelete={() => setMemoDeleteRequested(true)}
            onClose={() => setActiveMemoId(null)} 
            
            // 🛠️ [2번 요구사항 반영]: 무조건 true를 보내 고정화시키던 하드코딩 구문을 지우고, 현재 객체의 고정 상태 수치를 그대로 중계 이식했습니다.
            onSave={(text, color, shape) => {
              saveActiveMemoText(text, color, shape, activeMemo ? activeMemo.isPinned : true);
            }}
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

      {/* 기록 불러오기 확인 모달 (ProDrill AI 설정 모달 디자인 기준 일치화) */}
      {historyConfirm && (
        <ModalShell
          onClose={() => setHistoryConfirm(null)}
          size="sm"
          title="기록 불러오기"
          titleId="history-load-confirm-title"
        >
          <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
            {/* 설정 영역 컨테이너 (클라우드 설정 모달 기준 일치화) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-normal">
                  선택하신 지공 기록을 화면에 로드합니다. 기록을 불러오면 <strong>현재 화면에서 편집 중이던 임시 수치 및 정보는 모두 덮어씌워져 삭제</strong>됩니다. 이 지공 기록을 불러오시겠습니까?<br /><br />
                  • <strong>기록 이름:</strong> <span className="text-indigo-600 font-extrabold">{historyConfirm.name || '불러온 기록'}</span><br />
                  • <strong>저장 일시:</strong> <span className="text-slate-700 font-extrabold">{historyConfirm.timestamp}</span>
                </p>
              </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setHistoryConfirm(null)} 
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <Button 
                onClick={() => {
                  loadRecord(historyConfirm);
                  setHistoryConfirm(null);
                }}
                size="sm"
                variant="primary"
              >
                불러오기
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 이름 변경 모달 (ProDrill AI 설정 모달 디자인 기준 일치화) */}
      {renameRequest && (
        <ModalShell
          onClose={() => setRenameRequest(null)}
          size="sm"
          title={"\u270F\uFE0F 기록 이름 변경"}
          zClassName="z-[200]"
        >
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleRenameRecord(inputName);
            }}
            className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto"
          >
            {/* 설명 단락 */}
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              변경할 지공 기록의 이름을 입력해 주세요.
            </p>

            {/* 설정 영역 컨테이너 (AI 설정 모달 디자인 기준 일치화) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{"\u270F\uFE0F"}</span>
                <h3 className="text-sm font-black text-slate-800">지공 기록 이름 수정</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-normal">
                  새로운 지공 기록 명칭을 입력하신 후 [이름 변경] 버튼을 눌러주세요.
                </p>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-800"
                  placeholder="새로운 이름을 입력하세요"
                  autoFocus
                />
              </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setRenameRequest(null)} 
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <Button 
                type="submit"
                size="sm"
                variant="primary"
              >
                이름 변경
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* 기록 삭제 확인 모달 (ProDrill AI 설정 모달 디자인 기준 일치화) */}
      {deleteRequest && (
        <ModalShell
          onClose={() => setDeleteRequest(null)}
          size="sm"
          title="🗑️ 기록 삭제"
          zClassName="z-[200]"
        >
          <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
            {/* 설명 단락 */}
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              선택하신 지공 기록을 삭제합니다.
            </p>

            {/* 경고 영역 컨테이너 (AI 설정 모달 디자인 기준 일치화) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{"\u26A0\uFE0F"}</span>
                <h3 className="text-sm font-black text-slate-800">기록 삭제 경고</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-normal">
                  이 지공 기록을 정말 삭제하시겠습니까?<br />
                  <strong className="text-rose-600 font-bold">※ 삭제된 지공 기록 데이터는 복구할 수 없습니다.</strong>
                </p>
              </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setDeleteRequest(null)} 
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <Button 
                onClick={() => {
                  handleDeleteRecord(deleteRequest);
                  setDeleteRequest(null);
                }}
                size="sm"
                variant="danger"
              >
                삭제
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 불러온 차트 기록 변경 확인 모달 (ProDrill AI 설정 모달 디자인 기준 일치화) */}
      {showModifyWarning && (
        <ModalShell
          onClose={() => {
            const originalRecord = history.find(r => r.id === viewingRecord?.id);
            if (originalRecord) loadRecord(originalRecord);
            setShowModifyWarning(false);
          }}
          size="sm"
          title={"\u26A0\uFE0F 차트 기록 변경"}
        >
          <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
            {/* 안내 본문 영역 (중간의 '지공 차트 덮어쓰기 경고' 작은 타이틀 요소 삭제됨) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500 leading-normal">
                불러온 차트의 내용이 변경됩니다. 이대로 저장하면 기존 기록이 완전히 덮어씌워집니다. 계속하시겠습니까?<br /><br />
                <span className="text-rose-600 font-bold">※ 새로운 차트로 생성하려면 '취소'를 누른 후 상단의 기록 배너를 클릭해 주세요.</span>
              </p>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => {
                  const originalRecord = history.find(r => r.id === viewingRecord?.id);
                  if (originalRecord) loadRecord(originalRecord);
                  setShowModifyWarning(false);
                }} 
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <Button 
                onClick={() => {
                  setShowModifyWarning(false);
                }}
                size="sm"
                variant="primary"
              >
                승인
              </Button>
            </div>
          </div>
        </ModalShell>
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
            if (guideChanged) {
              setShowGuideCloseConfirm(true);
            } else {
              setShowDrillingGuide(false);
              setIsEditMode(false);
            }
          }}
          onGuideStateChange={(drillingGuide, updatedThumbDetails) => {
            setGuideChanged(true); 
            const nextData = { ...chartData, drillingGuide };
            if (updatedThumbDetails) {
              nextData.thumbDetails = updatedThumbDetails;
            }
            handleChartDataChange(nextData);
          }}
        />
      )}

      {/* 드릴링 가이드 전용 퇴장 변경 안내 모달 */}
      {showGuideCloseConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2">드릴링 수치 변경</h3>
              <p className="text-sm text-slate-600 font-medium leading-normal whitespace-pre-line">
                드릴링 가이드의 수치/옵션이 변경되었습니다.<br/>변경된 수치/옵션을 최종 반영하려면 메인 차트에서 '저장'을 진행해 주세요.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex">
              <button 
                type="button"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                onClick={() => {
                  setShowGuideCloseConfirm(false);
                  setGuideChanged(false);
                  setShowDrillingGuide(false);
                  setIsEditMode(false);
                }}
              >
                승인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 세팅 모달 */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onFeedback={setFeedback}
        />
      )}

      {/* 만능 스판 변환기 모달 */}
      <SpanConverterModal
        isOpen={showSpanConverter}
        onClose={() => setShowSpanConverter(false)}
        data={chartData}
        onApply={(convertedResult) => {
          handleChartDataChange({
            ...chartData,
            ...convertedResult
          });
          setFeedback('스판 수치가 성공적으로 변환 및 반영되었습니다.');
        }}
      />

      {/* 스판 연산 가이드 안내 모달 */}
      <SpanGuideModal
        isOpen={showSpanGuide}
        onClose={() => setShowSpanGuide(false)}
      />
    </>
  );
}