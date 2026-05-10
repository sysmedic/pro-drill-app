import { useCallback, useEffect, useRef, useState } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { ConfirmModal, FeedbackToast, TextInputModal } from '../components/ui/Dialogs.jsx';
import BowlerSpecCard from './chartDetail/BowlerSpecCard.jsx';
import ChartBlueprintView from './chartDetail/ChartBlueprintView.jsx';
import ChartInputForm from './chartDetail/ChartInputForm.jsx';
import { ExitConfirmModal, HistoryModal, MemoModal } from './chartDetail/ChartModals.jsx';
import ChartTopBar from './chartDetail/ChartTopBar.jsx';
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
  midPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '' },
  ringPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '' },
  thumbPitch: { up: '', down: '', left: '', right: '' },
  thumbDetails: { holeSize: '', ovalSize: '', slugType: '' },
  bridge: '3/16',
  spanLeft: '',
  spanRight: '',
  spanType: '',
  ovalAngle: '',
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
        ballName: loadedBallName,
        layoutInfo: loadedLayoutInfo,
        intent: loadedIntent,
        memos: loadedMemos,
      } = parsedHistory[0].data;

      if (loadedChart) {
        setChartData({
          ...loadedChart,
          handedness: profile.handedness,
          isThumbless: profile.isThumbless,
        });
      }
      if (loadedCust) setCustomerInfo(loadedCust);
      setBallName(loadedBallName || '');
      setLayoutInfo(loadedLayoutInfo || '');
      setIntent(loadedIntent || '');
      setMemos(loadedMemos || []);
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
        handedness: profile.handedness,
        isThumbless: profile.isThumbless,
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

  return (
    <PageShell bottomPadding="pb-40">
      {isPlacingMemo && <div className="fixed inset-0 z-[30] bg-black/5" onClick={() => setIsPlacingMemo(false)} />}

      {isPlacingMemo && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 max-w-[calc(100%-24px)] bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl z-[100] font-bold text-sm flex items-center gap-2 animate-fade-in">
          <span className="min-w-0 text-center leading-snug">원하는 카드(스펙, 차트/수정, 작업)를 터치하세요</span>
          <Button className="ml-1 border-indigo-900 bg-indigo-800 text-white hover:bg-indigo-900" onClick={() => setIsPlacingMemo(false)} size="xs" variant="plain">취소</Button>
        </div>
      )}

      <ChartTopBar
        isEditMode={isEditMode}
        utilityState={utilityState}
        onBack={handleBackClick}
        onSave={handleSave}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        onToggleUtility={() => setUtilityState(utilityState === 'expanded' ? 'collapsed' : 'expanded')}
      />

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
            <ChartInputForm data={chartData} onChange={handleChartDataChange} />
          </div>
        </Card>
      ) : (
        <ChartBlueprintView
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
        onStartMemo={() => {
          setIsPlacingMemo(true);
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

      <FeedbackToast
        message={feedback?.message}
        onDismiss={() => setFeedback(null)}
        title={feedback?.title}
        tone={feedback?.tone}
      />
    </PageShell>
  );
}
