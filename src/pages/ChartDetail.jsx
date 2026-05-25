import { useCallback, useEffect, useRef, useState } from 'react';

import PageShell from '../components/layout/PageShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { FeedbackToast, ConfirmModal } from '../components/ui/Dialogs.jsx';

import BowlerSpecCard from './chartDetail/BowlerSpecCard.jsx';
import ChartBlueprintView from './chartDetail/ChartBlueprintView.jsx';
import ChartInputForm from './chartDetail/ChartInputForm.jsx';
import ChartTopBar from './chartDetail/ChartTopBar.jsx';
import TaskDetailsCard from './chartDetail/TaskDetailsCard.jsx';
import UtilitySheet from './chartDetail/UtilitySheet.jsx';
import ChartModalManager from './chartDetail/ChartModalManager.jsx'; 

import CustomerHistoryModal from './chartDetail/CustomerHistoryModal.jsx';

import useChartSession from './chartDetail/useChartSession.js'; 
import useChartExport from './chartDetail/useChartExport.js'; 
import useHistoryRecords from './chartDetail/useHistoryRecords.js';
import useMemoOverlay from './chartDetail/useMemoOverlay.jsx';
import useChartNfc from './chartDetail/useChartNfc.js';

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ChartDetail({ customer, onBack, maxChartsAllowed, currentChartsCount, userTier, refreshChartCount }) {
  // UI 상태 관리
  const [utilityState, setUtilityState] = useState('hidden');
  const [showDrillingGuide, setShowDrillingGuide] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(true);
  
  // 신규 모달 상태 관리
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  
  // 지연된 모달 오픈을 위한 상태
  const [delayedActiveMemoId, setDelayedActiveMemoId] = useState(null);

  // 불러오기 차단(Intercept) 및 대기를 위한 상태
  const [pendingLoadTarget, setPendingLoadTarget] = useState(null);
  const [showInterceptModal, setShowInterceptModal] = useState(false);

  // 찌꺼기 방지용 고유 키
  const [entryKey, setEntryKey] = useState(Date.now());
  
  // Refs
  const chartRef = useRef(null);
  const specRef = useRef(null);
  const taskRef = useRef(null);
  const formRef = useRef(null);
  const pullStartY = useRef(null);
  const setViewingRecordRef = useRef(null);
  const setHasUnsavedChangesRef = useRef(null);

  // 훅 초기화 및 연결
  const historyManager = useHistoryRecords(customer, {
    refreshChartCount,
    setFeedback,
    onRenameSuccess: useCallback((id, nextName) => {
      if (setViewingRecordRef.current) setViewingRecordRef.current(id, nextName);
    }, [])
  });
  
  const memoManager = useMemoOverlay({ 
    onDirty: useCallback(() => {
      if (setHasUnsavedChangesRef.current) setHasUnsavedChangesRef.current(true);
    }, [])
  });

  const sessionManager = useChartSession({
    customer,
    history: historyManager.history,
    loading: historyManager.loading,
    maxChartsAllowed,
    currentChartsCount,
    userTier,
    refreshChartCount,
    memos: memoManager.memos,
    setMemos: memoManager.setMemos,
    saveRecord: historyManager.saveRecord,
    setFeedback
  });

  const exportManager = useChartExport({
    customer,
    isEditMode: sessionManager.isEditMode,
    setFeedback,
    setUtilityState
  });

  const nfcManager = useChartNfc({
    sessionRecordId: sessionManager.sessionRecordId,
    hasUnsavedChanges: sessionManager.hasUnsavedChanges,
    setFeedback,
    setUtilityState,
  });

  const wipeCleanSlate = () => {
    sessionManager.setBallName('');
    sessionManager.setLayoutInfo('');
    sessionManager.setIntent('');
    sessionManager.setViewingRecord(null);
    sessionManager.setSessionRecordId(null);
    if (sessionManager.setHasUnsavedChanges) {
      sessionManager.setHasUnsavedChanges(false);
    }
  };

  useEffect(() => {
    setEntryKey(Date.now());
    wipeCleanSlate(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const forceZoomResetAndExecute = useCallback((callback) => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      setTimeout(() => {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        if (callback) callback();
      }, 150);
    } else {
      if (callback) callback();
    }
  }, []);

  const handleBackExit = () => {
    if (sessionManager.hasUnsavedChanges) {
      setShowExitConfirm(true);
      return;
    }
    forceZoomResetAndExecute(() => {
      wipeCleanSlate();
      onBack();
    });
  };

  const handleConfirmedExit = () => {
    forceZoomResetAndExecute(() => {
      wipeCleanSlate();
      onBack();
    });
  };

  setViewingRecordRef.current = (id, nextName) => {
    if (sessionManager.viewingRecord && sessionManager.viewingRecord.id === id) {
      sessionManager.setViewingRecord(prev => ({ ...prev, name: nextName }));
    }
  };
  setHasUnsavedChangesRef.current = sessionManager.setHasUnsavedChanges;

  const handleSave = useCallback(async (...args) => {
    const isNewChart = !sessionManager.sessionRecordId && !sessionManager.viewingRecord;
    await sessionManager.handleSave(...args);
    
    if (isNewChart && auth.currentUser?.email) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.email), { chartCount: increment(1) });
      } catch (e) { console.error("차트 카운트 증가 실패:", e); }
    }
    return true; 
  }, [sessionManager.handleSave, sessionManager.sessionRecordId, sessionManager.viewingRecord]);

  const handleDeleteRecord = useCallback(async (...args) => {
    try {
      await historyManager.handleDeleteRecord(...args);
      if (auth.currentUser?.email) {
        await updateDoc(doc(db, 'users', auth.currentUser.email), { chartCount: increment(-1) });
      }
    } catch (e) { console.error("차트 카운트 차감 실패:", e); }
  }, [historyManager.handleDeleteRecord]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleSave(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleSave]);

  // 메모 클릭 시 줌 강제 리셋 ➔ 스크롤 센터링 ➔ 모달 오픈 (타이머 꼬임 방지 적용)
  useEffect(() => {
    let timeoutId;

    if (memoManager.activeMemoId) {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const unlockedViewport = 'width=device-width, initial-scale=1.0'; 
      
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }

      if (memoManager.activeMemo) {
        let targetRef = chartRef;
        if (memoManager.activeMemo.section === 'task') targetRef = taskRef;
        else if (memoManager.activeMemo.section === 'spec') targetRef = specRef;
        else if (memoManager.activeMemo.section === 'form') targetRef = formRef;

        if (targetRef && targetRef.current) {
          setTimeout(() => {
            targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }
      }

      timeoutId = setTimeout(() => {
        if (viewportMeta) {
          viewportMeta.setAttribute('content', unlockedViewport); 
        }
        setDelayedActiveMemoId(memoManager.activeMemoId);
      }, 350); 
    } else {
      setDelayedActiveMemoId(null);
    }

    return () => clearTimeout(timeoutId); 
  }, [memoManager.activeMemoId, memoManager.activeMemo]);

  // 창 전환/이동 시 강제 1배율 리셋 (타이머 꼬임 방지 적용)
  useEffect(() => {
    let timeoutId;
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const unlockedViewport = 'width=device-width, initial-scale=1.0'; 
    
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      
      timeoutId = setTimeout(() => {
        viewportMeta.setAttribute('content', unlockedViewport); 
      }, 350);
    }

    return () => clearTimeout(timeoutId); 
  }, [
    sessionManager.isEditMode, 
    isTimelineModalOpen, 
    historyManager.showHistoryModal,
    showDrillingGuide,
    utilityState,
    exportManager.sharePreview,
    showSettingsModal,
    memoManager.isPlacingMemo
  ]);

  // 불러오기 실행 브릿지 함수 (모달 닫기 처리 포함)
  const executeLoad = useCallback((record) => {
    sessionManager.loadRecord(record);
    setIsTimelineModalOpen(false);
    historyManager.setShowHistoryModal(false);
  }, [sessionManager, historyManager]);

  // 모든 불러오기 요청을 가로채서 미저장 상태 검사 (Intercept)
  const requestLoadRecord = useCallback((record) => {
    if (sessionManager.hasUnsavedChanges) {
      setPendingLoadTarget(record);
      setShowInterceptModal(true);
    } else {
      executeLoad(record);
    }
  }, [sessionManager.hasUnsavedChanges, executeLoad]);

  // 타임라인 클릭 시 로직도 Intercept로 교체
  const handleLoadRecordFromTimeline = (chartId) => {
    const targetRecord = historyManager.history.find(r => r.id === chartId);
    if (targetRecord) {
      requestLoadRecord(targetRecord);
    } else {
      setFeedback({
        message: '이미 삭제되었거나 찾을 수 없는 차트입니다.',
        title: '차트 없음',
        tone: 'danger'
      });
    }
  };

  if (historyManager.loading) {
    return (
      <PageShell>
         <div className="flex justify-center items-center h-full text-slate-500 font-bold animate-pulse pt-20">
            차트 데이터를 불러오는 중입니다...
         </div>
      </PageShell>
    );
  }

  const isNewChart = !sessionManager.sessionRecordId && !sessionManager.viewingRecord;
  const currentRecordId = sessionManager.viewingRecord?.id || sessionManager.sessionRecordId;

  // 사전 권한 제어: 신규 차트 작성 중이면서 허용치를 채웠거나 초과했는지 판별
  const isLimitExceeded = isNewChart && maxChartsAllowed !== Infinity && currentChartsCount >= maxChartsAllowed;

  return (
    <PageShell bottomPadding="pb-40">
      {memoManager.isPlacingMemo && (
        <div className="fixed inset-0 z-[30] bg-black/5 touch-none" onClick={() => memoManager.setIsPlacingMemo(false)} />
      )}

      {memoManager.isPlacingMemo && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 max-w-[calc(100%-24px)] bg-indigo-600/80 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-2xl z-[100] font-bold text-sm flex items-center gap-2 animate-fade-in">
          <span className="min-w-0 text-center leading-snug">원하는 위치를 터치하세요</span>
          <Button className="ml-1 border-transparent bg-white/20 text-white hover:bg-white/30" onClick={() => memoManager.setIsPlacingMemo(false)} size="xs" variant="plain">✕</Button>
        </div>
      )}

      <ChartTopBar
        isEditMode={sessionManager.isEditMode}
        utilityState={utilityState}
        viewingRecord={sessionManager.viewingRecord}
        userTier={userTier} 
        onStartMemo={() => memoManager.setIsPlacingMemo(true)}
        onBack={handleBackExit} 
        onSave={handleSave}
        onToggleEditMode={() => sessionManager.setIsEditMode(!sessionManager.isEditMode)}
        onToggleUtility={() => setUtilityState(utilityState === 'expanded' ? 'collapsed' : 'expanded')}
        onShowTimeline={() => setIsTimelineModalOpen(true)} 
        onConvertTemplate={() => setShowTemplateConfirm(true)}
      />

      {/* 🟢 [수정] 박스 레이아웃 및 외곽선 구조로 변경완료 (Amber 색상 유지) */}
      {isLimitExceeded && (
        <div className="w-full mt-1.5 mb-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-700 animate-fade-in relative z-20 flex items-center justify-center gap-1.5 leading-snug shadow-sm transform-gpu [backface-visibility:hidden]">
          <span>⚠️ 현재 {userTier?.toUpperCase()} 등급의 차트 생성 한도({maxChartsAllowed}개)에 도달하여 새 차트를 추가 저장할 수 없습니다.</span>
        </div>
      )}

      <div ref={exportManager.exportRef} className="flex flex-col w-full">
        {!sessionManager.isEditMode && (
          <BowlerSpecCard
            chartData={sessionManager.chartData}
            customer={customer}
            customerInfo={sessionManager.customerInfo}
            innerRef={specRef}
            isOpen={isDetailOpen}
            memoOverlay={memoManager.renderMemoOverlay('spec', specRef)}
            memosRenderer={memoManager.renderMemos('spec', specRef)}
            onCustomerInfoChange={sessionManager.updateCustomerInfo}
            onToggleOpen={() => setIsDetailOpen(!isDetailOpen)}
          />
        )}

        {sessionManager.isEditMode ? (
          <Card className="w-full p-2 pb-6 sm:p-6 sm:pb-8 mt-1 sm:mt-1.5 mb-4 sm:mb-6 relative z-40 overflow-hidden animate-fade-in transform-gpu [backface-visibility:hidden]" data-testid="chart-edit-surface">
            <div ref={formRef} className="relative w-full h-full">
              {memoManager.renderMemoOverlay('form', formRef)}
              {memoManager.renderMemos('form', formRef)}
              <ChartInputForm customer={customer} data={sessionManager.chartData} onChange={sessionManager.handleChartDataChange} />
            </div>
          </Card>
        ) : (
          <ChartBlueprintView
            customer={customer}
            data={sessionManager.chartData}
            innerRef={chartRef}
            memoOverlay={memoManager.renderMemoOverlay('chart', chartRef)}
            memosRenderer={memoManager.renderMemos('chart', chartRef)}
            isMemoActive={memoManager.isMemoActive}
            onGuideClick={() => setShowDrillingGuide(true)}
          />
        )}

        {!sessionManager.isEditMode && (
          <TaskDetailsCard
            key={currentRecordId ? `record_${currentRecordId}` : `new_chart_${entryKey}`}
            ballName={sessionManager.ballName}
            innerRef={taskRef}
            intent={sessionManager.intent}
            layoutInfo={sessionManager.layoutInfo}
            isOpen={isTaskOpen}
            memoOverlay={memoManager.renderMemoOverlay('task', taskRef)}
            memosRenderer={memoManager.renderMemos('task', taskRef)}
            onBallNameChange={sessionManager.updateWorkField(sessionManager.setBallName)}
            onIntentChange={sessionManager.updateWorkField(sessionManager.setIntent)}
            onLayoutInfoChange={sessionManager.updateWorkField(sessionManager.setLayoutInfo)}
            onToggleOpen={() => setIsTaskOpen(!isTaskOpen)}
            chartData={sessionManager.chartData}
            onChartDataChange={sessionManager.handleChartDataChange}
            setHasUnsavedChanges={sessionManager.setHasUnsavedChanges}
            isNewChart={isNewChart}
            handleSave={handleSave}
            currentRecordId={currentRecordId} 
          />
        )}
      </div>

      <UtilitySheet
        utilityState={utilityState}
        setUtilityState={setUtilityState}
        pullStartYRef={pullStartY}
        isLocked={memoManager.isMemoActive || memoManager.activeMemoId !== null}
        currentChartsCount={currentChartsCount}
        maxChartsAllowed={maxChartsAllowed}
        userTier={userTier}
        onStartBackup={() => { setShowSettingsModal(true); setUtilityState('collapsed'); }}
        onStartDrilling={() => { setShowDrillingGuide(true); setUtilityState('collapsed'); }}
        onStartShare={exportManager.handleShare}
        onShowHistory={() => { 
          historyManager.setShowHistoryModal(true); 
          setUtilityState('collapsed'); 
        }}
        onStartNfcWrite={nfcManager.handleNfcWrite}
      />

      <ChartModalManager
        activeMemoId={delayedActiveMemoId}
        showHistoryModal={historyManager.showHistoryModal}
        historyConfirm={historyManager.historyConfirm}
        renameRequest={historyManager.renameRequest}
        deleteRequest={historyManager.deleteRequest}
        showModifyWarning={sessionManager.showModifyWarning}
        showExitConfirm={showExitConfirm}
        sharePreview={exportManager.sharePreview}
        showDrillingGuide={showDrillingGuide}
        showSettingsModal={showSettingsModal}
        memos={memoManager.memos}
        history={historyManager.history}
        maxChartsAllowed={maxChartsAllowed}
        currentChartsCount={currentChartsCount}
        viewingRecord={sessionManager.viewingRecord}
        shareFilename={exportManager.shareFilename}
        chartData={sessionManager.chartData}
        customer={customer}
        userTier={userTier}
        ballName={sessionManager.ballName}
        setMemos={memoManager.setMemos}
        setShowHistoryModal={historyManager.setShowHistoryModal}
        setHistoryConfirm={historyManager.setHistoryConfirm}
        setRenameRequest={historyManager.setRenameRequest}
        setDeleteRequest={historyManager.setDeleteRequest}
        setShowModifyWarning={sessionManager.setShowModifyWarning}
        setShowExitConfirm={setShowExitConfirm}
        setSharePreview={exportManager.setSharePreview}
        setShareFilename={exportManager.setShareFilename}
        setShowDrillingGuide={setShowDrillingGuide}
        setShowSettingsModal={setShowSettingsModal}
        setBallName={sessionManager.setBallName}
        setLayoutInfo={sessionManager.setLayoutInfo}
        setIntent={sessionManager.setIntent}
        setViewingRecord={sessionManager.setViewingRecord}
        setSessionRecordId={sessionManager.setSessionRecordId}
        setSessionRecordName={sessionManager.setSessionRecordName}
        setIsEditMode={sessionManager.setIsEditMode}
        setFeedback={setFeedback}
        
        loadRecord={requestLoadRecord} 
        
        handleRenameRecord={historyManager.handleRenameRecord}
        handleDeleteRecord={handleDeleteRecord}
        handleSave={handleSave}
        onBack={handleConfirmedExit} 
        executeShare={exportManager.executeShare}
        handleChartDataChange={sessionManager.handleChartDataChange}
        saveActiveMemoText={memoManager.saveActiveMemoText}
        deleteActiveMemo={memoManager.deleteActiveMemo}
      />

      <CustomerHistoryModal 
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        customer={customer}
        onLoadRecord={handleLoadRecordFromTimeline}
      />

      {showInterceptModal && pendingLoadTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2">저장되지 않은 차트</h3>
              <p className="text-sm text-slate-600 font-medium leading-snug">
                현재 작업 중인 차트에 저장되지 않은 내용이 있습니다.<br/>새 차트를 불러오기 전에 저장하시겠습니까?
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <button 
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm active:scale-95 transition-all"
                onClick={async () => {
                  const success = await handleSave();
                  if (success) {
                    executeLoad(pendingLoadTarget);
                    setShowInterceptModal(false);
                    setPendingLoadTarget(null);
                  }
                }}
              >
                저장 후 불러오기
              </button>
              <button 
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm active:scale-95 transition-all"
                onClick={() => {
                  executeLoad(pendingLoadTarget);
                  setShowInterceptModal(false);
                  setPendingLoadTarget(null);
                }}
              >
                저장하지 않고 불러오기
              </button>
              <button 
                className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm active:scale-95 transition-all"
                onClick={() => {
                  setShowInterceptModal(false);
                  setPendingLoadTarget(null);
                }}
              >
                취소 (작업 계속하기)
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateConfirm && (
        <ConfirmModal
          title="새 차트 만들기"
          message="현재 기록의 지공 수치를 바탕으로 새로운 차트를 작성하시겠습니까? (기존 메모는 유지되며 공 이름, 작업내용, 관리내역은 초기화됩니다.)"
          confirmLabel="확인"
          cancelLabel="취소"
          onConfirm={() => {
            sessionManager.convertToTemplate();
            setShowTemplateConfirm(false);
          }}
          onCancel={() => setShowTemplateConfirm(false)}
        />
      )}

      <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} title={feedback?.title} tone={feedback?.tone} />
    </PageShell>
  );
}