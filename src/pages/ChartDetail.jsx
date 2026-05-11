import { useCallback, useEffect, useRef, useState } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { ConfirmModal, FeedbackToast, TextInputModal } from '../components/ui/Dialogs.jsx';
import BowlerSpecCard from './chartDetail/BowlerSpecCard.jsx';
import ChartBlueprintView from './chartDetail/ChartBlueprintView.jsx';
import ChartInputForm from './chartDetail/ChartInputForm.jsx';
import DrillingGuideView from './chartDetail/DrillingGuideView.jsx';
import { ExitConfirmModal, HistoryModal, MemoModal } from './chartDetail/ChartModals.jsx';
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

export default function ChartDetail({ customer, onBack }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [utilityState, setUtilityState] = useState('hidden');
  const [showDrillingGuide, setShowDrillingGuide] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [historyConfirm, setHistoryConfirm] = useState(null);
  const [renameRequest, setRenameRequest] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [, setSaveDate] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const markDirty = useCallback(() => setHasUnsavedChanges(true), []);
  const {
    history,
    showHistoryModal,
    setShowHistoryModal,
    loadHistoryForCustomer,
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
    };

    const parsedHistory = loadHistoryForCustomer();

    if (parsedHistory.length > 0) {
      const {
        chartData: loadedChart,
        customerInfo: loadedCust,
      } = parsedHistory[0].data;

      if (loadedChart) {
        setChartData({
          ...loadedChart,
          drillingGuide: loadedChart.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
          handedness: loadedChart.handedness ?? profile.handedness,
          isThumbless: loadedChart.isThumbless ?? profile.isThumbless,
        });
      }
      if (loadedCust) setCustomerInfo(loadedCust);
      setBallName('');
      setLayoutInfo('');
      setIntent('');
      setMemos([]);
      setSaveDate(parsedHistory[0].timestamp);
      setIsEditMode(false);
    } else {
      initializeNewCustomer();
    }

    setHasUnsavedChanges(false);
  }, [customer, loadHistoryForCustomer, setMemos]);

  const handleSave = () => {
    const now = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const recordName = ballName ? ballName : `기록 ${history.length + 1}`;
    const newRecord = {
      id: createLocalId('record'),
      timestamp: now,
      name: recordName,
      data: { chartData, customerInfo, ballName, layoutInfo, intent, memos },
    };

    const result = saveRecord(newRecord);
    if (!result.ok) {
      setFeedback({
        message: '브라우저 저장공간에 차트 기록을 쓰지 못했습니다. 저장 상태를 유지하고 다시 시도해주세요.',
        title: '저장 실패',
        tone: 'danger',
      });
      return false;
    }

    setSaveDate(now);
    setHasUnsavedChanges(false);
    setFeedback({ message: `${customer.name} 고객님의 기록이 안전하게 저장되었습니다.`, tone: 'success' });
    return true;
  };

  const loadRecord = (record) => {
    const {
      chartData: loadedChart,
      customerInfo: loadedCust,
      ballName: loadedBallName,
      layoutInfo: loadedLayoutInfo,
      intent: loadedIntent,
      memos: loadedMemos,
    } = record.data;
    const profile = getCustomerChartProfile(customer);

    if (loadedChart) {
      setChartData({
        ...loadedChart,
        drillingGuide: loadedChart.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
        handedness: loadedChart.handedness ?? profile.handedness,
        isThumbless: loadedChart.isThumbless ?? profile.isThumbless,
      });
    }
    if (loadedCust) setCustomerInfo(loadedCust);
    setBallName(loadedBallName || '');
    setLayoutInfo(loadedLayoutInfo || '');
    setIntent(loadedIntent || '');
    setMemos(loadedMemos || []);
    setSaveDate(record.timestamp);
    setHasUnsavedChanges(true);
  };

  const handleDeleteRecord = (id) => {
    const result = deleteRecord(id);
    if (!result.ok) {
      setFeedback({
        message: '저장 기록 삭제를 브라우저 저장공간에 반영하지 못했습니다.',
        title: '삭제 실패',
        tone: 'danger',
      });
      return;
    }

    setFeedback({ message: '저장 기록을 삭제했습니다.', tone: 'success' });
  };

  const handleRenameRecord = (nextName) => {
    if (!renameRequest) return;

    const result = renameRecord(renameRequest.id, nextName);
    if (!result.ok) {
      setFeedback({
        message: '저장 기록 이름 변경을 브라우저 저장공간에 반영하지 못했습니다.',
        title: '이름 변경 실패',
        tone: 'danger',
      });
      return;
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

  const handleShare = async () => {
    if (isEditMode) {
      setFeedback({ message: '차트 보기 모드에서만 공유할 수 있습니다.', tone: 'warning' });
      setUtilityState('collapsed');
      return;
    }

    if (!exportRef.current) return;
    setUtilityState('collapsed');
    setFeedback({ message: '차트 이미지를 생성하고 있습니다...', tone: 'info' });

    try {
      const htmlToImage = await import('html-to-image');
      const node = exportRef.current;
      
      const blob = await htmlToImage.toBlob(node, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: { 
          margin: '0', 
          transform: 'scale(0.96)', 
          transformOrigin: 'top left' 
        }
      });

      if (!blob) throw new Error('Blob 생성 실패');
      const file = new File([blob], `${customer.name}_지공차트.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: `${customer.name} 지공차트`, files: [file] });
          setFeedback(null);
        } catch (shareError) {
          console.warn('공유가 취소되었거나 지원하지 않아 다운로드로 대체합니다.', shareError);
          downloadBlob(blob, `${customer.name}_지공차트.png`);
        }
      } else {
        downloadBlob(blob, `${customer.name}_지공차트.png`);
      }
    } catch (error) {
      console.error('공유 실패:', error);
      setFeedback({ message: '이미지 공유 중 오류가 발생했습니다.', tone: 'danger' });
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

  const isBetaExpired = new Date() > new Date('2026-06-30T23:59:59+09:00');
  if (isBetaExpired) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md text-center border border-slate-200 w-full max-w-sm">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 font-black text-xl">!</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-800 mb-2">베타 테스트 기간 만료</h1>
            <p className="text-sm font-bold text-slate-500 leading-relaxed">
              2026년 6월 30일부로<br/>베타 서비스가 종료되었습니다.<br/>정식 버전을 이용해 주세요.
            </p>
          </div>
        </div>
      </PageShell>
    );
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
          <Card className="w-full p-2 pb-6 sm:p-6 sm:pb-8 mt-2 mb-4 sm:mb-6 relative z-40 overflow-hidden animate-fade-in transform-gpu [backface-visibility:hidden]" data-testid="chart-edit-surface">
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
        onStartBackup={() => {
          setFeedback({ message: '베타 버전에서는 제한된 기능입니다.', tone: 'warning' });
          setUtilityState('collapsed');
        }}
        onStartDrilling={() => {
          setShowDrillingGuide(true);
          setUtilityState('collapsed');
        }}
        onStartShare={() => {
          setFeedback({ message: '베타 버전에서는 제한된 기능입니다.', tone: 'warning' });
          setUtilityState('collapsed');
        }}
        onShowHistory={() => {
          setShowHistoryModal(true);
          setUtilityState('collapsed');
        }}
      />

      {showHistoryModal && (
        <HistoryModal
          history={history}
          onSelect={(record) => setHistoryConfirm(record)}
          onClose={() => setShowHistoryModal(false)}
          onDelete={handleDeleteRecord}
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

      {showExitConfirm && (
        <ExitConfirmModal
          onClose={() => setShowExitConfirm(false)}
          onSaveAndExit={() => {
            if (handleSave()) {
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

      {showDrillingGuide && (
        <DrillingGuideView
          data={chartData}
          customer={customer}
          onClose={() => setShowDrillingGuide(false)}
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
