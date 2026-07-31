import { useCallback, useEffect, useRef, useState } from 'react';

import PageShell from '../components/layout/PageShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { FeedbackToast, ConfirmModal } from '../components/ui/Dialogs.jsx';
import ModalShell from '../components/ui/ModalShell.jsx';

import BowlerSpecCard from './chartDetail/BowlerSpecCard.jsx';
import ChartBlueprintView from './chartDetail/ChartBlueprintView.jsx';
import ChartInputForm from './chartDetail/ChartInputForm.jsx';
import ChartTopBar from './chartDetail/ChartTopBar.jsx';
import TaskDetailsCard from './chartDetail/TaskDetailsCard.jsx';
import UtilitySheet from './chartDetail/UtilitySheet.jsx';
import ChartModalManager from './chartDetail/ChartModalManager.jsx'; 

import CustomerHistoryModal from './chartDetail/CustomerHistoryModal.jsx';
import AiRecommendationModal from './chartDetail/AiRecommendationModal.jsx'; // 🤖 AI 추천 모달 임포트

import useChartSession from './chartDetail/useChartSession.js'; 
import useChartExport from './chartDetail/useChartExport.js'; 
import useHistoryRecords from './chartDetail/useHistoryRecords.js';
import useMemoOverlay from './chartDetail/useMemoOverlay.jsx';
import useChartNfc from './chartDetail/useChartNfc.js';
import useViewportControl from './chartDetail/useViewportControl.js';
import useExitInterceptor from './chartDetail/useExitInterceptor.js';
import { calculateGracePeriod, isLicenseCertified } from '../lib/userLicenseManager.js';

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
  const [showAiModal, setShowAiModal] = useState(false); // 🤖 AI 추천 모달 오픈 상태값
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false); // 💡 자동 팝업 전용 모달 오픈 상태값
  
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
  const [entryKey, setEntryKey] = useState(new Date().getTime());
  
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
  const graceInfo = calculateGracePeriod();
  const isGraceExpired = graceInfo.isExpired || graceInfo.daysLeft <= 30;
  const isBetaTester = ['master', 'certified'].includes(userTier?.toLowerCase()) || (userTier?.toLowerCase() === 'trial' && !isGraceExpired);
  const isNfcTier = ['master', 'certified'].includes(userTier?.toLowerCase());

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
    // useChartSession이 진입 시 자동으로 모달을 열려고 할 때, 자동 팝업 전용 상태(isAutoModalOpen)를 갱신
    setShowHistoryModal: useCallback((show) => {
      if (initialChartId && show === true) return;
      setIsAutoModalOpen(show);
    }, [initialChartId]),
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

  // 🤖 AI 추천 및 2LS 변환 핸들러 신설
  const handleSelectRecommendation = useCallback(({ layout, intentSummary, condition }) => {
    sessionManager.setLayoutInfo(layout);
    const prefix = sessionManager.intent ? `${sessionManager.intent}\n` : '';
    sessionManager.setIntent(`${prefix}[AI 추천(${condition}): ${intentSummary}]`);
    sessionManager.setHasUnsavedChanges(true);
    setFeedback({ message: 'AI 레이아웃 및 추천 의도가 적용되었습니다.', tone: 'success' });
  }, [sessionManager.intent, sessionManager.setLayoutInfo, sessionManager.setIntent, sessionManager.setHasUnsavedChanges]);

  const handleManual2LsConvert = useCallback(async () => {
    const { getApiKey, convertLayoutTo2LS, convert2LSToDualAngle } = await import('../lib/openaiService.js');
    const apiKey = getApiKey();
    if (!apiKey) {
      setFeedback({ message: '변환 연산을 위해 Gemini API Key를 먼저 설정해주세요. (시스템 설정⚙️ 혹은 AI 추천 모달)', tone: 'warning' });
      setShowAiModal(true);
      return;
    }

    if (!sessionManager.layoutInfo) return;

    const has2lsPrefix = sessionManager.layoutInfo.includes('(2LS)');
    setFeedback({ message: has2lsPrefix ? 'Dual Angle 변환 진행 중...' : '2LS 변환 진행 중...', tone: 'info' });
    try {
      if (has2lsPrefix) {
        // 2LS -> Dual Angle 역변환 (스펙 반영)
        const res = await convert2LSToDualAngle({
          currentLayout: sessionManager.layoutInfo,
          bowler: customer,
          spec: sessionManager.customerInfo
        });
        if (res && res.dualAngle) {
          sessionManager.setLayoutInfo(res.dualAngle);
          const prefix = sessionManager.intent ? `${sessionManager.intent}\n` : '';
          sessionManager.setIntent(`${prefix}[Dual 변환 적용: ${res.reason}]`);
          sessionManager.setHasUnsavedChanges(true);
          setFeedback({ message: 'Dual Angle 레이아웃으로 변환 완료!', tone: 'success' });
        }
      } else {
        // Dual Angle -> 2LS 변환 (스펙 반영)
        const res = await convertLayoutTo2LS({
          currentLayout: sessionManager.layoutInfo,
          bowler: customer,
          spec: sessionManager.customerInfo
        });
        if (res && res.twoLS) {
          sessionManager.setLayoutInfo(res.twoLS);
          const prefix = sessionManager.intent ? `${sessionManager.intent}\n` : '';
          sessionManager.setIntent(`${prefix}[2LS 변환 적용: ${res.reason}]`);
          sessionManager.setHasUnsavedChanges(true);
          setFeedback({ message: '2LS 레이아웃으로 변환 완료!', tone: 'success' });
        }
      }
    } catch (err) {
      console.error("수동 변환 에러:", err);
      setFeedback({ message: '변환에 실패했습니다. 형식 및 네트워크를 확인해 주세요.', tone: 'danger' });
    }
  }, [sessionManager.layoutInfo, customer, sessionManager.customerInfo, sessionManager.intent, sessionManager.setLayoutInfo, sessionManager.setIntent, sessionManager.setHasUnsavedChanges]);

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

    const now = new Date().getTime();
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

  const handleBackWithExpiredGuidance = useCallback(() => {
    if (!isLicenseCertified() && graceInfo && graceInfo.isExpired) {
      setFeedback({ 
        message: '💡 Trial 무료 체험 기간이 만료되어 정식 등록이 필요합니다. 클라우드 설정 메뉴에서 라이선스를 연동하실 수 있습니다.', 
        tone: 'warning' 
      });
    }
    onBack();
  }, [onBack, graceInfo, setFeedback]);

  // 퇴장 처리 및 팝업 가로채기 엔진 연동
  const exitInterceptor = useExitInterceptor({
    sessionManager,
    historyManager,
    onBack: handleBackWithExpiredGuidance,
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
      setIsTimelineModalOpen(true);
    }
  }, [sessionManager.hasUnsavedChanges, exitInterceptor, setIsTimelineModalOpen, customer?.activityLogs]);

  useEffect(() => {
    setEntryKey(new Date().getTime());
    exitInterceptor.wipeCleanSlate(); 
    setIsTimelineModalOpen(false);
    setIsAutoModalOpen(false);
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
  
  // 모든 등급의 사용자에 대해 자동팝업 및 수동오픈 100% 개방
  const isHistoryOpen = (initialChartId && currentRecordId !== initialChartId)
    ? false 
    : (isTimelineModalOpen || isAutoModalOpen);

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
              if (memoManager.isPlacingMemo || sessionManager.hasUnsavedChanges || !sessionManager.viewingRecord || sessionManager.hasWarnedModify) {
                if (!memoManager.isPlacingMemo && !sessionManager.isEditMode) {
                  memoWarningApprovedRef.current = true;
                  sessionManager.setHasUnsavedChanges(true);
                }
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
          onTriggerLock={onTriggerLock}
        />
      )}

      {isLimitExceeded && (
        <div className="w-full mt-1.5 mb-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-700 animate-fade-in relative z-20 flex items-center justify-center gap-1.5 leading-snug shadow-sm transform-gpu [backface-visibility:hidden]">
          <span>현재 {userTier?.toUpperCase()} 등급의 차트 생성 한도({maxChartsAllowed}개)에 도달하여 새 차트를 추가 저장할 수 없습니다.</span>
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
            memoOverlay={null}
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
            memoOverlay={null}
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
            onTriggerAiRecommend={() => setShowAiModal(true)}
            onTrigger2LsConvert={handleManual2LsConvert}
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
        isManualOpen={isTimelineModalOpen} // 💡 [진입 분기]: 수동 오픈 여부를 모달 내부로 전달
        userTier={userTier} 
        onClose={() => {
          setIsTimelineModalOpen(false);
          setIsAutoModalOpen(false);
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
            historyManager.setHistoryConfirm(recordOrId);
          } else {
            const targetRecord = historyManager.history.find(r => r.id === recordOrId);
            if (targetRecord) {
              historyManager.setHistoryConfirm(targetRecord);
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
        <ModalShell
          onClose={() => setShowLogInterceptModal(false)}
          size="sm"
          title={"\uD83D\uDCCB 저장 여부 확인"}
          zClassName="z-[200]"
        >
          <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
            {/* 설명 단락 */}
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              변경 중인 내용을 저장하고 이동할지 여부를 결정합니다.
            </p>

            {/* 경고 영역 컨테이너 (AI 설정 모달 디자인 기준 일치화) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{"\u26A0\uFE0F"}</span>
                <h3 className="text-sm font-black text-slate-800">미저장 변경 사항 경고</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-normal">
                  현재 작성 중인 지공 차트에 저장되지 않은 변경 사항이 있습니다. 저장 후 기록 목록을 조회하시겠습니까?
                </p>
              </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => {
                  setShowLogInterceptModal(false);
                  if (customer?.activityLogs && customer.activityLogs.length > 0) {
                    setIsTimelineModalOpen(true);
                  }
                }} 
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소 (저장 없이 이동)
              </button>
              <Button 
                onClick={async () => {
                  setShowLogInterceptModal(false);
                  await exitInterceptor.handleSave();
                  setIsTimelineModalOpen(true);
                }}
                size="sm"
                variant="primary"
              >
                저장 후 이동
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {exitInterceptor.showNewChartNameModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmedName = exitInterceptor.newChartNameInput.trim() || '차트';
              exitInterceptor.expectedBallNameRef.current = trimmedName; 
              if (sessionManager.setBallName) {
                sessionManager.setBallName(trimmedName);
              }
              exitInterceptor.setShowNewChartNameModal(false);
              
              // 핫라인을 통해 직접 비동기 순차 실행
              await sessionManager.handleSave(trimmedName);
              if (exitInterceptor.isExitingAfterSave) {
                exitInterceptor.setIsExitingAfterSave(false);
                onBack();
              }
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

      <AiRecommendationModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        bowler={customer}
        spec={sessionManager.customerInfo}
        ballName={sessionManager.ballName}
        onSelectRecommendation={handleSelectRecommendation}
      />

      <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} title={feedback?.title} tone={feedback?.tone} />
    </PageShell>
  );
}