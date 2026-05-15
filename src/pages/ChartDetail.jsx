import { useCallback, useEffect, useRef, useState } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { ConfirmModal, FeedbackToast, TextInputModal } from '../components/ui/Dialogs.jsx';
import Icon from '../components/ui/Icon.jsx';
import BowlerSpecCard from './chartDetail/BowlerSpecCard.jsx';
import ChartBlueprintView from './chartDetail/ChartBlueprintView.jsx';
import ChartInputForm from './chartDetail/ChartInputForm.jsx';
import DrillingGuideView from './chartDetail/DrillingGuideView.jsx';
import { ExitConfirmModal, HistoryModal, MemoModal } from './chartDetail/ChartModals.jsx';
import ModalShell from '../components/ui/ModalShell.jsx';
import ChartTopBar from './chartDetail/ChartTopBar.jsx';
import SettingsModal from './customerManager/SettingsModal.jsx';
import TaskDetailsCard from './chartDetail/TaskDetailsCard.jsx';
import UtilitySheet from './chartDetail/UtilitySheet.jsx';
import useHistoryRecords from './chartDetail/useHistoryRecords.js';
import useMemoOverlay from './chartDetail/useMemoOverlay.jsx';
import { getCustomerChartProfile } from '../lib/customerSchema.js';
import { createLocalId } from '../lib/ids.js';

const createDefaultChartData = ({ handedness = 'right', isThumbless = false } = {}) => ({
  isThumbless,
  handedness,
  handCondition: { moisture: '', fingerStiffness: '', thumbStiffness: '' },
  midPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '', holeCutSize: '' },
  ringPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '', holeCutSize: '' },
  thumbPitch: { up: '', down: '', left: '', right: '' },
  thumbOffset: { left: '', right: '' },
  thumbDetails: { holeSize: '', ovalSize: '', slugType: '', holeCutSize: '' },
  bridge: '3/16',
  spanLeft: '',
  spanRight: '',
  spanType: '',
  ovalAngle: '',
  drillingGuide: { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
});

const createDefaultCustomerInfo = () => ({
  fingerStiff: '',
  thumbStiff: '',
  moisture: '',
  trackFlare: '',
  tilt: '',
  papX: '',
  papY: '',
  ballSpeed: '',
  rpm: '',
});

export default function ChartDetail({ customer, onBack, maxChartsAllowed, currentChartsCount, userTier, refreshChartCount }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(true);
  const [utilityState, setUtilityState] = useState('hidden');
  const [showDrillingGuide, setShowDrillingGuide] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [historyConfirm, setHistoryConfirm] = useState(null);
  const [renameRequest, setRenameRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [sharePreview, setSharePreview] = useState(null);
  const [shareFilename, setShareFilename] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [, setSaveDate] = useState('');
  
  // 📍 상태 분리: UI용, ID저장용, 이름기억용 3가지로 완벽 분리
  const [viewingRecord, setViewingRecord] = useState(null);
  const [sessionRecordId, setSessionRecordId] = useState(null);
  const [sessionRecordName, setSessionRecordName] = useState('');
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModifyWarning, setShowModifyWarning] = useState(false);
  const [hasWarnedModify, setHasWarnedModify] = useState(false);
  const markDirty = useCallback(() => setHasUnsavedChanges(true), []);
  
  const {
    history,
    loading,
    showHistoryModal,
    setShowHistoryModal,
    saveRecord,
    deleteRecord,
    renameRecord,
  } = useHistoryRecords(customer);
  
  const {
    memos,
    setMemos,
    isPlacingMemo,
    setIsPlacingMemo,
    activeMemoId,
    renderMemoOverlay,
    renderMemos,
    isMemoActive,
    saveActiveMemoText,
    deleteActiveMemo,
  } = useMemoOverlay({ onDirty: markDirty });

  const loadedCustomerId = useRef(null);
  const historyLengthRef = useRef(0);

  const chartRef = useRef(null);
  const specRef = useRef(null);
  const taskRef = useRef(null);
  const formRef = useRef(null);
  const pullStartY = useRef(null);
  const exportRef = useRef(null);

  const [chartData, setChartData] = useState(() => createDefaultChartData());
  const [customerInfo, setCustomerInfo] = useState(() => createDefaultCustomerInfo());
  const [ballName, setBallName] = useState('');
  const [layoutInfo, setLayoutInfo] = useState('');
  const [intent, setIntent] = useState('');

  const handleChartDataChange = (newData) => {
    setHasUnsavedChanges(true);
    setChartData(newData);
  };

  const updateCustomerInfo = (updater) => {
    setCustomerInfo(prev => typeof updater === 'function' ? updater(prev) : updater);
    setHasUnsavedChanges(true);
  };

  const updateWorkField = (setter) => (value) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    if (loading) return;

    if (loadedCustomerId.current === customer.id) {
      if (historyLengthRef.current === 0 && history.length > 0) {
      } else {
        return; 
      }
    }

    const profile = getCustomerChartProfile(customer);

    const initializeNewCustomer = () => {
      setIsEditMode(true);
      setChartData(createDefaultChartData(profile));
      setCustomerInfo(createDefaultCustomerInfo());
      setBallName('');
      setLayoutInfo('');
      setIntent('');
      setMemos([]);
      setSaveDate('');
      setViewingRecord(null);
      setSessionRecordId(null);
      setSessionRecordName('');
      setHasWarnedModify(false);
    };

    if (history && history.length > 0) {
      const latestRecord = history[0];
      const recordData = latestRecord.data || latestRecord;

      if (recordData.chartData) {
        setChartData({
          ...createDefaultChartData(profile),
          ...recordData.chartData,
          thumbOffset: recordData.chartData.thumbOffset || { left: '', right: '' },
          drillingGuide: recordData.chartData.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
          handedness: recordData.chartData.handedness ?? profile.handedness,
          isThumbless: recordData.chartData.isThumbless ?? profile.isThumbless,
        });
      }
      if (recordData.customerInfo) setCustomerInfo(recordData.customerInfo);

      setBallName('');
      setLayoutInfo('');
      setIntent('');
      setSaveDate(latestRecord.timestamp || latestRecord.createdAt || '');
      setViewingRecord(null);
      setSessionRecordId(null);
      setSessionRecordName('');
      setIsEditMode(false);
      setHasWarnedModify(false);

      setTimeout(() => {
        setMemos(recordData.memos || []);
      }, 100);

      loadedCustomerId.current = customer.id;
      historyLengthRef.current = history.length;
    } else {
      initializeNewCustomer();
      loadedCustomerId.current = customer.id;
      historyLengthRef.current = 0;
    }

    setHasUnsavedChanges(false);
  }, [customer, loading, history, setMemos]);

  useEffect(() => {
    if (hasUnsavedChanges && viewingRecord && !hasWarnedModify) {
      setShowModifyWarning(true);
      setHasWarnedModify(true);
    }
  }, [hasUnsavedChanges, viewingRecord, hasWarnedModify]);

  const handleSave = useCallback(async (silent = false) => {
    if (!hasUnsavedChanges) {
      return true;
    }

    const isNewSession = !sessionRecordId;
    const recordId = sessionRecordId || createLocalId('record');

    if (isNewSession && maxChartsAllowed !== Infinity && currentChartsCount >= maxChartsAllowed) {
      setFeedback({
        message: `${userTier.toUpperCase()} 등급은 최대 ${maxChartsAllowed}개의 차트만 저장할 수 있습니다.`,
        title: '저장 제한',
        tone: 'warning',
      });
      return false;
    }

    const nowObj = new Date();
    const nowTimestamp = nowObj.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const yy = String(nowObj.getFullYear()).slice(-2);
    const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
    const dd = String(nowObj.getDate()).padStart(2, '0');
    const dateBasedName = `차트 ${yy}${mm}${dd}`;
    
    // 📍 핵심 수정: UI가 숨겨져 있어도(sessionRecordName을 통해) 원래 이름을 기억해냄
    const baseRecordName = ballName ? ballName : (sessionRecordName || (viewingRecord ? viewingRecord.name : dateBasedName));
    
    let finalRecordName = baseRecordName;
    
    // 신규 생성일 때만 중복 검사 실행 (-1, -2 생성)
    if (isNewSession) {
      const existingNames = new Set(history.map(r => r.name || r.data?.name));
      
      if (existingNames.has(finalRecordName)) {
        let suffix = 1;
        while (existingNames.has(`${baseRecordName}-${suffix}`)) {
          suffix++;
        }
        finalRecordName = `${baseRecordName}-${suffix}`;
      }
    }
    
    const newRecord = {
      id: recordId,
      timestamp: nowTimestamp,
      name: finalRecordName,
      data: { chartData, customerInfo, ballName, layoutInfo, intent, memos },
    };

    const result = await saveRecord(newRecord);
    if (!result.ok) {
      if (!silent) {
        setFeedback({
          message: '클라우드 저장공간에 차트 기록을 쓰지 못했습니다. 네트워크 상태를 확인해주세요.',
          title: '저장 실패',
          tone: 'danger',
        });
      }
      return false;
    }

    if (isNewSession && refreshChartCount) {
      await refreshChartCount();
    }

    setSaveDate(nowTimestamp);
    setSessionRecordId(newRecord.id); 
    setSessionRecordName(finalRecordName); // 📍 새로 생성되거나 유지된 진짜 이름을 메모리에 꽉 쥐고 있음!

    if (viewingRecord !== null) {
      setViewingRecord({ id: newRecord.id, name: finalRecordName, timestamp: nowTimestamp });
    }

    setHasUnsavedChanges(false);
    
    if (!silent) {
      setFeedback({ message: `${customer.name} 고객님의 기록이 안전하게 저장되었습니다.`, tone: 'success' });
    }
    return true;
  }, [hasUnsavedChanges, maxChartsAllowed, currentChartsCount, userTier, viewingRecord, sessionRecordId, sessionRecordName, history, ballName, chartData, customerInfo, layoutInfo, intent, memos, saveRecord, customer.name, refreshChartCount]);

  const loadRecord = (record) => {
    const recordData = record.data || record;
    const profile = getCustomerChartProfile(customer);
    setMemos([]);

    if (recordData.chartData) {
      setChartData({
        ...recordData.chartData,
        thumbOffset: recordData.chartData.thumbOffset || { left: '', right: '' },
        drillingGuide: recordData.chartData.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
        handedness: recordData.chartData.handedness ?? profile.handedness,
        isThumbless: recordData.chartData.isThumbless ?? profile.isThumbless,
      });
    }
    if (recordData.customerInfo) setCustomerInfo(recordData.customerInfo);
    setBallName(recordData.ballName || '');
    setLayoutInfo(recordData.layoutInfo || '');
    setIntent(recordData.intent || '');
    setSaveDate(record.timestamp || record.createdAt || '');
    
    setViewingRecord({ 
      id: record.id, 
      name: record.name || '불러온 기록', 
      timestamp: record.timestamp || record.createdAt 
    });
    setSessionRecordId(record.id);
    setSessionRecordName(record.name || '불러온 기록');
    
    setIsEditMode(false);
    setHasUnsavedChanges(false);
    setHasWarnedModify(false);

    setTimeout(() => {
      setMemos(recordData.memos || []);
    }, 100);
  };

  const handleDeleteRecord = async (id) => {
    const result = await deleteRecord(id);
    if (!result.ok) {
      setFeedback({
        message: '저장 기록 삭제를 브라우저 저장공간에 반영하지 못했습니다.',
        title: '삭제 실패',
        tone: 'danger',
      });
      return;
    }

    if (refreshChartCount) await refreshChartCount();

    setFeedback({ message: '저장 기록을 삭제했습니다.', tone: 'success' });
  };

  const handleRenameRecord = async (nextName) => {
    if (!renameRequest) return;

    const result = await renameRecord(renameRequest.id, nextName);
    if (!result.ok) {
      setFeedback({
        message: '저장 기록 이름 변경을 브라우저 저장공간에 반영하지 못했습니다.',
        title: '이름 변경 실패',
        tone: 'danger',
      });
      return;
    }

    if (viewingRecord && viewingRecord.id === renameRequest.id) {
      setViewingRecord(prev => ({ ...prev, name: nextName }));
    }

    setRenameRequest(null);
    setFeedback({ message: '저장 기록 이름을 변경했습니다.', tone: 'success' });
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
      return;
    }
    onBack();
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSave(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleSave]);

  const handleShare = async () => {
    if (isEditMode) {
      setFeedback({ message: '차트 보기 모드에서만 공유할 수 있습니다.', tone: 'warning' });
      setUtilityState('collapsed');
      return;
    }

    if (!exportRef.current) return;
    setUtilityState('collapsed');
    setFeedback({ message: '차트 이미지를 생성하고 있습니다...', tone: 'info' });

    const node = exportRef.current;
    
    const styleEl = document.createElement('style');
    styleEl.innerHTML = '[data-exporting="true"] * { box-shadow: none !important; }';
    document.head.appendChild(styleEl);
    node.setAttribute('data-exporting', 'true');

    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const htmlToImage = await import('html-to-image');
      
      const blob = await htmlToImage.toBlob(node, {
        backgroundColor: '#f8fafc',
        pixelRatio: 3,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: { 
          margin: '0', 
          transform: 'scale(0.96)', 
          transformOrigin: 'top center' 
        }
      });

      if (!blob) throw new Error('Blob 생성 실패');

      setSharePreview(blob);
      setShareFilename(`${customer.name}_지공차트`);
      setFeedback(null);
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      setFeedback({ message: '이미지 생성 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      node.removeAttribute('data-exporting');
      document.head.removeChild(styleEl);
    }
  };

  const executeShare = async () => {
    if (!sharePreview) return;
    
    const finalFilename = shareFilename.trim() || `${customer.name}_지공차트`;
    const file = new File([sharePreview], `${finalFilename}.png`, { type: 'image/png' });
    
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `${customer.name} 지공차트`, files: [file] });
        setFeedback({ message: '공유가 완료되었습니다.', tone: 'success' });
      } else {
        downloadBlob(sharePreview, `${finalFilename}.png`);
      }
    } catch (error) {
      console.warn('공유가 취소되었거나 지원하지 않아 다운로드로 대체합니다.', error);
      downloadBlob(sharePreview, `${finalFilename}.png`);
    } finally {
      setSharePreview(null);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ message: '차트 이미지가 다운로드되었습니다.', tone: 'success' });
  };

  if (loading) {
    return (
      <PageShell>
         <div className="flex justify-center items-center h-full text-slate-500 font-bold animate-pulse pt-20">
            차트 데이터를 불러오는 중입니다...
         </div>
      </PageShell>
    )
  }

  return (
    <PageShell bottomPadding="pb-40">
      {isPlacingMemo && <div className="fixed inset-0 z-[30] bg-black/5 touch-none" onClick={() => setIsPlacingMemo(false)} />}

      {isPlacingMemo && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 max-w-[calc(100%-24px)] bg-indigo-600/80 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-2xl z-[100] font-bold text-sm flex items-center gap-2 animate-fade-in">
          <span className="min-w-0 text-center leading-snug">원하는 위치를 터치하세요</span>
          <Button className="ml-1 border-transparent bg-white/20 text-white hover:bg-white/30" onClick={() => setIsPlacingMemo(false)} size="xs" variant="plain">✕</Button>
        </div>
      )}

      <ChartTopBar
        isEditMode={isEditMode}
        utilityState={utilityState}
        viewingRecord={viewingRecord}
        onStartMemo={() => setIsPlacingMemo(true)}
        onBack={handleBackClick}
        onSave={handleSave}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        onToggleUtility={() => setUtilityState(utilityState === 'expanded' ? 'collapsed' : 'expanded')}
      />

      <div ref={exportRef} className="flex flex-col">
        {!isEditMode && (
          <BowlerSpecCard
            chartData={chartData}
            customer={customer}
            customerInfo={customerInfo}
            innerRef={specRef}
            isOpen={isDetailOpen}
            memoOverlay={renderMemoOverlay('spec', specRef)}
            memosRenderer={renderMemos('spec', specRef)}
            onCustomerInfoChange={updateCustomerInfo}
            onToggleOpen={() => setIsDetailOpen(!isDetailOpen)}
          />
        )}

        {isEditMode ? (
          <Card className="w-full p-2 pb-6 sm:p-6 sm:pb-8 mt-1 sm:mt-1.5 mb-4 sm:mb-6 relative z-40 overflow-hidden animate-fade-in transform-gpu [backface-visibility:hidden]" data-testid="chart-edit-surface">
            <div ref={formRef} className="relative w-full h-full">
              {renderMemoOverlay('form', formRef)}
              {renderMemos('form', formRef)}
              <ChartInputForm customer={customer} data={chartData} onChange={handleChartDataChange} />
            </div>
          </Card>
        ) : (
          <ChartBlueprintView
            customer={customer}
            data={chartData}
            innerRef={chartRef}
            memoOverlay={renderMemoOverlay('chart', chartRef)}
            memosRenderer={renderMemos('chart', chartRef)}
            isMemoActive={isMemoActive}
          />
        )}

        {!isEditMode && (
          <TaskDetailsCard
            ballName={ballName}
            innerRef={taskRef}
            intent={intent}
            isOpen={isTaskOpen}
            layoutInfo={layoutInfo}
            memoOverlay={renderMemoOverlay('task', taskRef)}
            memosRenderer={renderMemos('task', taskRef)}
            onBallNameChange={updateWorkField(setBallName)}
            onIntentChange={updateWorkField(setIntent)}
            onLayoutInfoChange={updateWorkField(setLayoutInfo)}
            onToggleOpen={() => setIsTaskOpen(!isTaskOpen)}
          />
        )}
      </div>

      {activeMemoId && (
        <MemoModal
          memo={memos.find(m => m.id === activeMemoId)}
          onSave={saveActiveMemoText}
          onDelete={deleteActiveMemo}
        />
      )}

      <UtilitySheet
        utilityState={utilityState}
        setUtilityState={setUtilityState}
        pullStartYRef={pullStartY}
        isLocked={isMemoActive || activeMemoId !== null}
        currentChartsCount={currentChartsCount}
        maxChartsAllowed={maxChartsAllowed}
        userTier={userTier}
        onStartBackup={() => {
          setShowSettingsModal(true);
          setUtilityState('collapsed');
        }}
        onStartDrilling={() => {
          setShowDrillingGuide(true);
          setUtilityState('collapsed');
        }}
        onStartShare={handleShare}
        onShowHistory={() => {
          setShowHistoryModal(true);
          setUtilityState('collapsed');
        }}
      />

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

      {showModifyWarning && (
        <ConfirmModal
          cancelLabel="취소"
          confirmLabel="확인"
          message={"수정 시 새로운 차트로 저장됩니다.\n(원본 보존)"}
          onCancel={() => {
            const originalRecord = history.find(r => r.id === viewingRecord.id);
            if (originalRecord) {
              loadRecord(originalRecord);
            }
            setShowModifyWarning(false);
          }}
          onConfirm={() => {
            setShowModifyWarning(false);
            setViewingRecord(null);
            setSessionRecordId(null);
            setSessionRecordName('');
          }}
          title="기록 수정 안내"
          titleId="modify-warning-title"
        />
      )}

      {showExitConfirm && (
        <ExitConfirmModal
          onClose={() => setShowExitConfirm(false)}
          onSaveAndExit={async () => {
            const isSaved = await handleSave();
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

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onFeedback={setFeedback}
        />
      )}

      <FeedbackToast
        message={feedback?.message}
        onDismiss={() => setFeedback(null)}
        title={feedback?.title}
        tone={feedback?.tone}
      />
    </PageShell>
  );
}