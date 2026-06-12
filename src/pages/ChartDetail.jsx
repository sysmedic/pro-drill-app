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
import useViewportControl from './chartDetail/useViewportControl.js';
import useExitInterceptor from './chartDetail/useExitInterceptor.js';

// [보안 확충]: 비밀번호 분실 시 구글 인증 초기화를 유도하기 위해 auth 도구 수입
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function ChartDetail({ 
  customer, initialChartId, onBack, maxChartsAllowed, currentChartsCount, userTier, refreshChartCount,
  onTriggerLock // 상위 App.jsx로부터 전송받은 락다운 원격 스위치 수령
}) {
  // UI 상태 관리
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [utilityState, setUtilityState] = useState('hidden');
  const [showDrillingGuide, setShowDrillingGuide] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(true);
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  const [showLogInterceptModal, setShowLogInterceptModal] = useState(false);
  
  // 로컬스토리지에서 이전에 저장된 설정을 역직렬화하여 초기값 브릿징
  const [showLogsOnChart, setShowLogsOnChart] = useState(() => {
    const saved = localStorage.getItem('showLogsOnChart');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 사용자가 모달 스위치 버튼을 눌러 상태를 변경할 때마다 영구 박제 처리
  useEffect(() => {
    localStorage.setItem('showLogsOnChart', JSON.stringify(showLogsOnChart));
  }, [showLogsOnChart]);

  // 지연된 모달 오픈을 위한 상태
  const [delayedActiveMemoId, setDelayedActiveMemoId] = useState(null);

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

  // 차트 도면 트리플 클릭 감지용 Ref 선언
  const chartClickRef = useRef({ count: 0, lastClick: 0 });

  // 메모 버튼 클릭 시 경고창 순서 제어를 위한 독립적 제어 플래그 Refs
  const memoPendingRef = useRef(false);
  const isCancellingRef = useRef(false);
  
  // 내부 훅의 연속적 모달 중복 트리거를 무력화하기 위한 인터셉트 플래그 Ref
  const memoWarningApprovedRef = useRef(false);

  // 라이선스 등급 판별 상수 선언
  const isBetaTester = ['expert', 'master'].includes(userTier?.toLowerCase());
  const isNfcTier = ['expert', 'master'].includes(userTier?.toLowerCase());

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
    setFeedback,
    // useChartSession이 진입 시 자동으로 모달을 열려고 할 때, 일반 등급 유저라면 강제 차단 가드 작동
    setShowHistoryModal: useCallback((show) => {
      if (initialChartId && show === true) return;
      if (!isBetaTester && show === true) return; 
      setIsTimelineModalOpen(show);
    }, [initialChartId, isBetaTester]),
    showLogsOnChart
  });

  const exportManager = useChartExport({
    customer,
    isEditMode: sessionManager.isEditMode, // 🟢 객체 자바스크립트 문법(콜론 및 콤마)으로 정밀 교정 완료
    setFeedback,
    setUtilityState
  });

  const nfcManager = useChartNfc({
    sessionRecordId: sessionManager.sessionRecordId,
    hasUnsavedChanges: sessionManager.hasUnsavedChanges,
    setFeedback,
    setUtilityState,
  });

  // NFC로 진입 시 타겟 차트를 무조건 즉시 강제 로드 후 모달 상태 잔상 강제 파괴
  useEffect(() => {
    if (initialChartId && !historyManager.loading && historyManager.history.length > 0) {
      const currentRecordId = sessionManager.viewingRecord?.id || sessionManager.sessionRecordId;
      if (currentRecordId !== initialChartId) {
        const targetRecord = historyManager.history.find(r => r.id === initialChartId);
        if (targetRecord) {
          sessionManager.loadRecord(targetRecord);
          setIsTimelineModalOpen(false); 
          if (typeof historyManager?.setShowHistoryModal === 'function') {
            historyManager.setShowHistoryModal(false);
          }
        }
      }
    }
  }, [initialChartId, historyManager.loading, historyManager.history, sessionManager.viewingRecord, sessionManager.sessionRecordId, historyManager]);

  // 화면 꺼짐 방지(Screen Wake Lock) 가동 이펙트
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('화면 켜짐 유지 가동 실패:', err.message);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) {
        wakeLock.release().then(() => {
          wakeLock = null;
        });
      }
    };
  }, []);

  // 지공 도면 자체를 3번 클릭했을 때 작동하는 잠금 제어 핸들러
  const handleChartTripleClick = useCallback(() => {
    if (memoManager.isPlacingMemo) return;

    const now = Date.now();
    const { count, lastClick } = chartClickRef.current;

    if (now - lastClick < 350) { 
      const nextCount = count + 1;
      if (nextCount >= 3) {
        chartClickRef.current = { count: 0, lastClick: 0 };
        if (onTriggerLock) onTriggerLock(); 
      } else {
        chartClickRef.current = { count: nextCount, lastClick: now };
      }
    } else {
      chartClickRef.current = { count: 1, lastClick: now };
    }
  }, [onTriggerLock, memoManager.isPlacingMemo]);

  // 뷰포트 제어용 훅 연동
  const { forceZoomResetAndExecute } = useViewportControl({
    activeMemoId: memoManager.activeMemoId,
    activeMemo: memoManager.activeMemo,
    setDelayedActiveMemoId,
    refs: { chartRef, taskRef, specRef, formRef },
    modalDeps: [
      sessionManager.isEditMode, 
      isTimelineModalOpen, 
      historyManager.showHistoryModal,
      showDrillingGuide,
      utilityState,
      exportManager.sharePreview,
      showSettingsModal,
      memoManager.isPlacingMemo
    ]
  });

  // 퇴장 처리 및 팝업 가로채기 엔진 연동
  const exitInterceptor = useExitInterceptor({
    sessionManager,
    historyManager,
    onBack,
    forceZoomResetAndExecute,
    setFeedback,
    setIsTimelineModalOpen
  });

  const handleShowTimelineClick = useCallback(async () => {
    if (sessionManager.hasUnsavedChanges) {
      if (exitInterceptor.isNewChart) {
        const success = await exitInterceptor.handleSave();
        if (success) setIsTimelineModalOpen(true);
      } else {
        setShowLogInterceptModal(true);
      }
    } else {
      if (!customer?.activityLogs || customer.activityLogs.length === 0) return;
      setIsTimelineModalOpen(true);
    }
  }, [sessionManager.hasUnsavedChanges, exitInterceptor, setIsTimelineModalOpen, customer?.activityLogs]);

  useEffect(() => {
    setEntryKey(Date.now());
    exitInterceptor.wipeCleanSlate(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  useEffect(() => {
    setViewingRecordRef.current = (id, nextName) => {
      if (sessionManager.viewingRecord && sessionManager.viewingRecord.id === id) {
        sessionManager.setViewingRecord(prev => ({ ...prev, name: nextName }));
      }
    };
    setHasUnsavedChangesRef.current = sessionManager.setHasUnsavedChanges;
  }, [sessionManager.viewingRecord, sessionManager.setHasUnsavedChanges]);

  const handleDeleteRecord = useCallback(async (...args) => {
    try {
      await historyManager.handleDeleteRecord(...args);
    } catch (e) { console.error("차트 삭제 실패:", e); }
  }, [historyManager.handleDeleteRecord]);

  useEffect(() => {
    if (!sessionManager.showModifyWarning) {
      if (memoPendingRef.current) {
        memoPendingRef.current = false;
        if (!isCancellingRef.current) {
          memoWarningApprovedRef.current = true;
          if (sessionManager.setHasUnsavedChanges) {
            sessionManager.setHasUnsavedChanges(true); 
          }
          memoManager.setIsPlacingMemo(true);
        }
      }
      isCancellingRef.current = false;
    }
  }, [sessionManager.showModifyWarning, memoManager, sessionManager]);

  useEffect(() => {
    if (sessionManager.showModifyWarning && memoWarningApprovedRef.current) {
      sessionManager.setShowModifyWarning(false);
    }
  }, [sessionManager.showModifyWarning, sessionManager]);

  useEffect(() => {
    if (!memoManager.isPlacingMemo) {
      memoWarningApprovedRef.current = false;
    }
  }, [memoManager.isPlacingMemo]);

  const currentRecordId = sessionManager.viewingRecord?.id || sessionManager.sessionRecordId;
  const isLimitExceeded = exitInterceptor.isNewChart && maxChartsAllowed !== Infinity && currentChartsCount >= maxChartsAllowed;
  
  // 베타테스터 등급은 자동팝업 포함 기존 방식 100% 사수, 일반 유저는 오직 수동 오픈 상태(isTimelineModalOpen)로만 사수됨
  const isHistoryOpen = (initialChartId && currentRecordId !== initialChartId)
    ? false 
    : isBetaTester
      ? (isTimelineModalOpen || historyManager.showHistoryModal)
      : (isTimelineModalOpen);

  return (
    <PageShell bottomPadding="pb-40">
      <style>{`
        ::-webkit-scrollbar {
          display: none !important;
        }
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        
        div[class*="bg-green"]:has(.toast-message-pink),
        div[class*="bg-emerald"]:has(.toast-message-pink) {
          background-color: #fff1f2 !important; 
          border-color: #fecdd3 !important;     
          color: #9f1239 !important;            
        }
        div[class*="bg-green"]:has(.toast-message-pink) *,
        div[class*="bg-emerald"]:has(.toast-message-pink) * {
          color: #9f1239 !important;
          fill: #9f1239 !important;
          stroke: #9f1239 !important;
        }
      `}</style>

      {memoManager.isPlacingMemo && (
        <div className="fixed inset-0 z-[30] bg-black/5 touch-none" onClick={() => memoManager.setIsPlacingMemo(false)} />
      )}

      {memoManager.isPlacingMemo && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 max-w-[calc(100%-24px)] bg-indigo-600/80 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-2xl z-[100] font-bold text-sm flex items-center gap-2 animate-fade-in">
          <span className="min-w-0 text-center leading-snug">원하는 위치를 터치하세요</span>
          <Button className="ml-1 border-transparent bg-white/20 text-white hover:bg-white/30" onClick={() => memoManager.setIsPlacingMemo(false)} size="xs" variant="plain">✕</Button>
        </div>
      )}

      {/* 지공 기록창 혹은 드릴링 가이드 중 하나라도 활성화되면 상단 탑바를 영리하게 숨김 */}
      {!(isHistoryOpen || showDrillingGuide) && (
        <ChartTopBar
          isEditMode={sessionManager.isEditMode}
          isPlacingMemo={memoManager.isPlacingMemo}
          utilityState={utilityState}
          viewingRecord={sessionManager.viewingRecord}
          userTier={userTier} 
          onStartMemo={() => { 
            if (!sessionManager.isEditMode) {
              if (memoManager.isPlacingMemo || sessionManager.hasUnsavedChanges || !sessionManager.viewingRecord) {
                memoManager.setIsPlacingMemo(!memoManager.isPlacingMemo);
              } else {
                memoPendingRef.current = true;
                sessionManager.setShowModifyWarning(true);
              }
            }
          }}
          onBack={exitInterceptor.handleBackExit} 
          onSave={async () => {
            if (sessionManager.hasUnsavedChanges) {
              await exitInterceptor.handleSave();
            } else {
              setFeedback({
                message: <span className="toast-message-pink">저장할 내용이 없습니다.</span>,
                tone: "success" 
              });
            }
          }}
          onToggleEditMode={() => sessionManager.setIsEditMode(!sessionManager.isEditMode)}
          onToggleUtility={() => setUtilityState(utilityState === 'expanded' ? 'collapsed' : 'expanded')}
          onShowTimeline={handleShowTimelineClick}
          onConvertTemplate={() => setShowTemplateConfirm(true)}
          sessionRecordId={sessionManager.sessionRecordId}
          ballName={sessionManager.ballName}
        />
      )}

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
              <ChartInputForm customer={customer} data={sessionManager.chartData} onChange={sessionManager.handleChartDataChange} />
            </div>
          </Card>
        ) : (
          <div 
            onClick={handleChartTripleClick}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="w-full"
          >
            <ChartBlueprintView
              customer={customer}
              data={sessionManager.chartData}
              innerRef={chartRef}
              memoOverlay={memoManager.renderMemoOverlay('chart', chartRef)}
              memosRenderer={memoManager.renderMemos('chart', chartRef)}
              isMemoActive={memoManager.isMemoActive}
              onGuideClick={() => setShowDrillingGuide(true)}
            />
          </div>
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
            isNewChart={exitInterceptor.isNewChart}
            handleSave={exitInterceptor.handleSave}
            currentRecordId={currentRecordId} 
            realNfcSupported={isNfcTier && typeof window !== 'undefined' && ('NDEFReader' in window) && localStorage.getItem('nfcUnsupportedDevice') !== 'true'}
            onNfcWrite={isNfcTier ? nfcManager.handleNfcWrite : undefined}
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
          handleShowTimelineClick(); 
          setUtilityState('collapsed'); 
        }}
        onStartNfcWrite={isNfcTier ? nfcManager.handleNfcWrite : undefined}
      />

      <CustomerHistoryModal 
        isOpen={isHistoryOpen}
        userTier={userTier} 
        onClose={() => {
          setIsTimelineModalOpen(false);
          if (typeof historyManager?.setShowHistoryModal === 'function') {
            historyManager.setShowHistoryModal(false);
          }
        }}
        customer={customer}
        history={historyManager.history}
        maxChartsAllowed={maxChartsAllowed}
        currentChartsCount={currentChartsCount}
        onRename={(id, currentName) => historyManager.setRenameRequest({ id, currentName })}
        onDelete={(id) => historyManager.setDeleteRequest(id)}
        onLoadRecord={(recordOrId) => {
          isCancellingRef.current = true;
          if (recordOrId && typeof recordOrId === 'object' && recordOrId.id) {
            sessionManager.loadRecord(recordOrId);
          } else {
            const targetRecord = historyManager.history.find(r => r.id === recordOrId);
            if (targetRecord) {
              sessionManager.loadRecord(targetRecord);
            }
          }
        }}
        showLogsOnChart={showLogsOnChart}
        onToggleLogsVisibility={setShowLogsOnChart}
      />

      <ChartModalManager
        activeMemoId={delayedActiveMemoId}
        showHistoryModal={false}
        historyConfirm={historyManager.historyConfirm}
        renameRequest={historyManager.renameRequest}
        deleteRequest={historyManager.deleteRequest}
        showModifyWarning={sessionManager.showModifyWarning && !memoWarningApprovedRef.current}
        showExitConfirm={exitInterceptor.showExitConfirm}
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
        setHistoryConfirm={historyManager.setHistoryConfirm}
        setRenameRequest={historyManager.setRenameRequest}
        setDeleteRequest={historyManager.setDeleteRequest}
        setShowModifyWarning={sessionManager.setShowModifyWarning}
        setShowExitConfirm={exitInterceptor.setShowExitConfirm}
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
        
        loadRecord={(record) => {
          isCancellingRef.current = true;
          exitInterceptor.requestLoadRecord(record);
        }} 
        
        handleRenameRecord={historyManager.handleRenameRecord}
        handleDeleteRecord={handleDeleteRecord}
        handleSave={exitInterceptor.handleSave}
        onBack={exitInterceptor.handleConfirmedExit} 
        executeShare={exportManager.executeShare}
        handleChartDataChange={sessionManager.handleChartDataChange}
        saveActiveMemoText={memoManager.saveActiveMemoText}
        deleteActiveMemo={memoManager.deleteActiveMemo}
      />

      {showLogInterceptModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2">저장 여부 확인</h3>
              <p className="text-sm text-slate-600 font-medium leading-snug">
                변경 중인 내용을 저장하시겠습니까?
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                type="button"
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm active:scale-95 transition-all"
                onClick={() => {
                  setShowLogInterceptModal(false);
                  if (customer?.activityLogs && customer.activityLogs.length > 0) {
                    setIsTimelineModalOpen(true);
                  }
                }}
              >
                취소
              </button>
              <button 
                type="button"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm active:scale-95 transition-all"
                onClick={async () => {
                  setShowLogInterceptModal(false);
                  await exitInterceptor.handleSave();
                  setIsTimelineModalOpen(true);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {exitInterceptor.showNewChartNameModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const trimmedName = exitInterceptor.newChartNameInput.trim() || '차트';
              exitInterceptor.expectedBallNameRef.current = trimmedName; 
              if (sessionManager.setBallName) {
                sessionManager.setBallName(trimmedName);
              }
              exitInterceptor.setShowNewChartNameModal(false);
              exitInterceptor.setIsReadyToSave(true); 
            }}
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-1.5">새 차트 저장 안내</h3>
              <p className="text-xs text-slate-500 font-semibold mb-4 leading-normal">
                새로 작성된 차트의 이름을 확인 및 수정해 주세요.
              </p>
              <div className="flex items-center w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                <input
                  type="text"
                  value={exitInterceptor.newChartNameInput}
                  onChange={(e) => exitInterceptor.setNewChartNameInput(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-slate-800 placeholder-slate-400 focus:ring-0 p-0"
                  placeholder="공 이름 입력 (예: 코드블랙)"
                  autoFocus
                />
                <span className="text-sm font-bold text-slate-400/60 select-none pl-1 pointer-events-none unselectable">
                  &nbsp;{(() => {
                    const now = new Date();
                    const yy = String(now.getFullYear()).slice(-2);
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    return `${yy}${mm}${dd}`;
                  })()}
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                type="button"
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm active:scale-95 transition-all"
                onClick={() => {
                  exitInterceptor.setShowNewChartNameModal(false);
                  exitInterceptor.setIsExitingAfterSave(false);
                }}
              >
                취소
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm active:scale-95 transition-all"
              >
                저장 / 확인
              </button>
            </div>
          </form>
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