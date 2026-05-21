import { useCallback, useEffect, useRef, useState } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
// 🟢 수정됨: ConfirmModal 추가 임포트
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
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false); // 🟢 템플릿 변환 확인 모달용
  
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
    // memoManager.setMemos([]);
    sessionManager.setViewingRecord(null);
    sessionManager.setSessionRecordId(null);
    if (sessionManager.setHasUnsavedChanges) {
      sessionManager.setHasUnsavedChanges(false);
    }
  };

  useEffect(() => {
    setEntryKey(Date.now());
    wipeCleanSlate(); 
    // const timer = setTimeout(() => wipeCleanSlate(), 100); 
    // return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const handleBackExit = () => {
    if (sessionManager.hasUnsavedChanges) {
      setShowExitConfirm(true);
      return;
    }
    wipeCleanSlate();
    onBack();
  };

  const handleConfirmedExit = () => {
    wipeCleanSlate();
    onBack();
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

  const handleLoadRecordFromTimeline = (chartId) => {
    const targetRecord = historyManager.history.find(r => r.id === chartId);
    
    if (targetRecord) {
      if (sessionManager.hasUnsavedChanges) {
        sessionManager.setShowModifyWarning(true);
      } else {
        sessionManager.loadRecord(targetRecord);
      }
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
        onConvertTemplate={() => setShowTemplateConfirm(true)} // 🟢 배너 클릭 시 템플릿 모달 팝업
      />

      <div ref={exportManager.exportRef} className="flex flex-col">
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
          />
        )}

        {!sessionManager.isEditMode && (
          <TaskDetailsCard
            key={currentRecordId ? `record_${currentRecordId}` : `new_chart_${entryKey}`}
            ballName={sessionManager.ballName}
            innerRef={taskRef}
            intent={sessionManager.intent}
            isOpen={isTaskOpen}
            layoutInfo={sessionManager.layoutInfo}
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
        activeMemoId={memoManager.activeMemoId}
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
        loadRecord={sessionManager.loadRecord}
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

      {/* 🟢 기획 추가: 새 차트 템플릿 변환 확인 모달 */}
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