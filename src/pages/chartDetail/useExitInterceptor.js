import { useState, useRef, useEffect, useCallback } from 'react';

export default function useExitInterceptor({
  sessionManager,
  historyManager,
  onBack,
  forceZoomResetAndExecute,
  setFeedback,
  setIsTimelineModalOpen
}) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showNewChartNameModal, setShowNewChartNameModal] = useState(false);
  const [newChartNameInput, setNewChartNameInput] = useState('');
  const [isExitingAfterSave, setIsExitingAfterSave] = useState(false);
  const [isReadyToSave, setIsReadyToSave] = useState(false);
  const [pendingLoadTarget, setPendingLoadTarget] = useState(null);
  const [showInterceptModal, setShowInterceptModal] = useState(false);

  const expectedBallNameRef = useRef('');

  const isNewChart = !sessionManager.sessionRecordId && !sessionManager.viewingRecord;

  // 세션 기저 초기화 기능 격리
  const wipeCleanSlate = useCallback(() => {
    sessionManager.setBallName('');
    sessionManager.setLayoutInfo('');
    sessionManager.setIntent('');
    sessionManager.setViewingRecord(null);
    sessionManager.setSessionRecordId(null);
    if (sessionManager.setHasUnsavedChanges) {
      sessionManager.setHasUnsavedChanges(false);
    }
  }, [sessionManager]);

  // 뒤로가기 퇴장 인터셉트
  const handleBackExit = useCallback(() => {
    if (sessionManager.hasUnsavedChanges) {
      setShowExitConfirm(true);
      return;
    }
    forceZoomResetAndExecute(() => {
      wipeCleanSlate();
      onBack();
    });
  }, [sessionManager.hasUnsavedChanges, forceZoomResetAndExecute, wipeCleanSlate, onBack]);

  // 확정 퇴장
  const handleConfirmedExit = useCallback(() => {
    forceZoomResetAndExecute(() => {
      wipeCleanSlate();
      onBack();
    });
  }, [forceZoomResetAndExecute, wipeCleanSlate, onBack]);

  // 수동/자동 통합 저장 로직 인터셉트
  const handleSave = useCallback(async (isAutoSave = false) => {
    const isExitConfirmSave = showExitConfirm && isAutoSave === true;

    if (isNewChart && !showNewChartNameModal && (isAutoSave !== true || isExitConfirmSave)) {
      const defaultName = (sessionManager.ballName || '').replace(/[_\s]\d{6}$/, '').trim();
      setNewChartNameInput(defaultName);
      setShowNewChartNameModal(true);
      
      if (isExitConfirmSave) {
        setIsExitingAfterSave(true);
        setShowExitConfirm(false); 
      }
      return false; 
    }

    if (isNewChart && isAutoSave === true && !isExitConfirmSave && !sessionManager.ballName?.trim()) {
      if (sessionManager.setBallName) {
        sessionManager.setBallName('차트');
      }
    }

    await sessionManager.handleSave();
    return true; 
  }, [isNewChart, showNewChartNameModal, sessionManager, showExitConfirm]);

  // 명칭 변경 감지 후 동기식 순차 결합 저장 이펙트
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

  // 백그라운드 전환 시 자동 저장 처리 이펙트
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleSave(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleSave]);

  // 차트 실제 로드 마감 처리
  const executeLoad = useCallback((record) => {
    sessionManager.loadRecord(record);
    setIsTimelineModalOpen(false);
    historyManager.setShowHistoryModal(false);
  }, [sessionManager, historyManager, setIsTimelineModalOpen]);

  // 차트 불러오기 요청 인터셉트 구문
  const requestLoadRecord = useCallback((record) => {
    if (sessionManager.hasUnsavedChanges) {
      setPendingLoadTarget(record);
      setShowInterceptModal(true);
    } else {
      executeLoad(record);
    }
  }, [sessionManager.hasUnsavedChanges, executeLoad]);

  // 타임라인 연동 로드 핸들러
  const handleLoadRecordFromTimeline = useCallback((chartId) => {
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
  }, [historyManager.history, requestLoadRecord, setFeedback]);

  return {
    showExitConfirm,
    setShowExitConfirm,
    showNewChartNameModal,
    setShowNewChartNameModal,
    newChartNameInput,
    setNewChartNameInput,
    isExitingAfterSave,
    setIsExitingAfterSave,
    isReadyToSave,
    setIsReadyToSave,
    pendingLoadTarget,
    setPendingLoadTarget,
    showInterceptModal,
    setShowInterceptModal,
    expectedBallNameRef,
    isNewChart,
    wipeCleanSlate,
    handleBackExit,
    handleConfirmedExit,
    handleSave,
    executeLoad,
    requestLoadRecord,
    handleLoadRecordFromTimeline
  };
}