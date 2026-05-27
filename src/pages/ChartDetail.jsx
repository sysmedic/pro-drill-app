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
  
  // 新규 모달 상태 관리
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  
  // 새 차트 첫 저장 시 이름 지정을 위한 모달 및 입력창 상태 선언
  const [showNewChartNameModal, setShowNewChartNameModal] = useState(false);
  const [newChartNameInput, setNewChartNameInput] = useState('');
  
  // 퇴장 모달에서 저장 클릭 시, 명칭 작성 후 순차 퇴장을 처리할 수 있도록 예약 플래그 상태 추가
  const [isExitingAfterSave, setIsExitingAfterSave] = useState(false);

  // 비동기 상태 갱신이 DOM 트리에 완결되었음을 감지하고 세션을 격발할 동기화 대기용 상태
  const [isReadyToSave, setIsReadyToSave] = useState(false);

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

  // 연속 신규 저장 시 비동기 훅의 수렴 상태를 대조 판별하기 위한 동적 기준선 명칭 백업 Ref
  const expectedBallNameRef = useRef('');

  // 메모 버튼 클릭 시 경고창 순서 제어를 위한 독립적 제어 플래그 Refs
  const memoPendingRef = useRef(false);
  const isCancellingRef = useRef(false);
  
  // 내부 훅의 연속적 모달 중복 트리거를 무력화하기 위한 인터셉트 플래그 Ref
  const memoWarningApprovedRef = useRef(false);

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

  const isNewChart = !sessionManager.sessionRecordId && !sessionManager.viewingRecord;

  // 퇴장 모달에서의 저장 요청 여부(isExitConfirmSave)를 정확히 판별하여 저장 양식 모달을 유기적으로 인터셉트 연동
  const handleSave = useCallback(async (isAutoSave = false) => {
    const isExitConfirmSave = showExitConfirm && isAutoSave === true;

    if (isNewChart && !showNewChartNameModal && (isAutoSave !== true || isExitConfirmSave)) {
      // 🎯 [수정 완료] 기존 이름 뒤에 붙어있던 공백+날짜 및 언더바+날짜 접미사 패턴을 정규식으로 완벽히 제거하여 깨끗한 순수 이름만 인풋창에 제안합니다.
      const defaultName = (sessionManager.ballName || '').replace(/[_\s]\d{6}$/, '').trim();
      setNewChartNameInput(defaultName);
      setShowNewChartNameModal(true);
      
      if (isExitConfirmSave) {
        setIsExitingAfterSave(true);
        setShowExitConfirm(false); 
      }
      return false; 
    }

    // 백그라운드 탭 가려짐으로 인한 순수 자동저장 시 기저 엔진 규칙을 저해하지 않도록 정합 가이드 처리
    if (isNewChart && isAutoSave === true && !isExitConfirmSave && !sessionManager.ballName?.trim()) {
      if (sessionManager.setBallName) {
        sessionManager.setBallName('새 지공차트');
      }
    }

    await sessionManager.handleSave();
    return true; 
  }, [isNewChart, showNewChartNameModal, sessionManager, showExitConfirm]);

  // 대기 플래그가 켜졌고, 커스텀 훅의 내부 ballName 상태가 입력 통제된 이름과 완벽히 동기화 수렴한 타이밍을 검증 락킹하여 순차 실행합니다.
  useEffect(() => {
    if (isReadyToSave && sessionManager.ballName === expectedBallNameRef.current) {
      setIsReadyToSave(false);
      const commitSyncSave = async () => {
        await sessionManager.handleSave();
        if (isExitingAfterSave) {
          setIsExitingAfterSave(false);
          onBack();
        }
      };
      commitSyncSave();
    }
  }, [isReadyToSave, sessionManager.ballName, sessionManager.handleSave, isExitingAfterSave, onBack]);

  const handleDeleteRecord = useCallback(async (...args) => {
    try {
      await historyManager.handleDeleteRecord(...args);
    } catch (e) { console.error("차트 삭제 실패:", e); }
  }, [historyManager.handleDeleteRecord]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleSave(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleSave]);

  // 경고창 승인 또는 취소 완료 후 후속 제어 이펙트
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

  // 내부 훅이 setHasUnsavedChanges(true)에 반응하여 두 번째 모달을 연쇄 트리거할 때, 이를 감지해 백그라운드에서 즉시 지우는 이펙트
  useEffect(() => {
    if (sessionManager.showModifyWarning && memoWarningApprovedRef.current) {
      sessionManager.setShowModifyWarning(false);
    }
  }, [sessionManager.showModifyWarning, sessionManager]);

  // 메모 배치 상태가 해제되면 차단 플래그 초기화
  useEffect(() => {
    if (!memoManager.isPlacingMemo) {
      memoWarningApprovedRef.current = false;
    }
  }, [memoManager.isPlacingMemo]);

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

  const executeLoad = useCallback((record) => {
    sessionManager.loadRecord(record);
    setIsTimelineModalOpen(false);
    historyManager.setShowHistoryModal(false);
  }, [sessionManager, historyManager]);

  const requestLoadRecord = useCallback((record) => {
    if (sessionManager.hasUnsavedChanges && !isCancellingRef.current) {
      setPendingLoadTarget(record);
      setShowInterceptModal(true);
    } else {
      executeLoad(record);
    }
  }, [sessionManager.hasUnsavedChanges, executeLoad]);

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

  const currentRecordId = sessionManager.viewingRecord?.id || sessionManager.sessionRecordId;

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
        onBack={handleBackExit} 
        onSave={handleSave}
        onToggleEditMode={() => sessionManager.setIsEditMode(!sessionManager.isEditMode)}
        onToggleUtility={() => setUtilityState(utilityState === 'expanded' ? 'collapsed' : 'expanded')}
        onShowTimeline={() => setIsTimelineModalOpen(true)} 
        onConvertTemplate={() => setShowTemplateConfirm(true)}
        // 🟢 추가: 새 차트 저장 시 배너 즉시 연동을 위한 Props 추가
        sessionRecordId={sessionManager.sessionRecordId}
        ballName={sessionManager.ballName}
      />

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
        showModifyWarning={sessionManager.showModifyWarning && !memoWarningApprovedRef.current}
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
        
        loadRecord={(record) => {
          isCancellingRef.current = true;
          requestLoadRecord(record);
        }} 
        
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

      {/* 타이핑한 텍스트와 비활성 날짜를 결합한 뒤, 동기화 플래그(isReadyToSave)를 세우는 안전 가교형 폼 구조 개편 */}
      {showNewChartNameModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const trimmedName = newChartNameInput.trim() || '새 지공차트';

              // 🎯 [중복 저장 버그 원천 해결] 이 패널에서는 명칭에 날짜를 인위적으로 합성해 붙이지 않고 순수 입력 텍스트만 전송합니다.
              // 날짜 마감 결합은 현재 앱 내부의 기저 모듈(useChartSession의 handleSave)이 알아서 안전하게 1회만 붙이도록 자율 위임 처리합니다.
              expectedBallNameRef.current = trimmedName; 
              if (sessionManager.setBallName) {
                sessionManager.setBallName(trimmedName);
              }
              setShowNewChartNameModal(false);
              setIsReadyToSave(true); 
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
                  value={newChartNameInput}
                  onChange={(e) => setNewChartNameInput(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-slate-800 placeholder-slate-400 focus:ring-0 p-0"
                  placeholder="공 이름 입력 (예: 코드블랙)"
                  autoFocus
                />
                {/* 🎯 기저 엔진의 실제 표기 서식 규격(공백 후 날짜 수렴)에 부합하도록 노출용 프리뷰도 공백 서식(&nbsp;)으로 일원화 싱크를 맞췄습니다 */}
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
                  setShowNewChartNameModal(false);
                  setIsExitingAfterSave(false);
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