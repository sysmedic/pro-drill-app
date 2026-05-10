import { useEffect, useRef, useState } from 'react';
import BowlerSpecCard from './chartDetail/BowlerSpecCard.jsx';
import ChartBlueprintView from './chartDetail/ChartBlueprintView.jsx';
import ChartInputForm from './chartDetail/ChartInputForm.jsx';
import { ExitConfirmModal, HistoryModal, MemoModal } from './chartDetail/ChartModals.jsx';
import ChartTopBar from './chartDetail/ChartTopBar.jsx';
import TaskDetailsCard from './chartDetail/TaskDetailsCard.jsx';
import UtilitySheet from './chartDetail/UtilitySheet.jsx';
import { getCustomerChartProfile } from '../lib/customerSchema.js';
import { loadChartHistory, saveChartHistory } from '../lib/chartHistoryStorage.js';

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
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [, setSaveDate] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [memos, setMemos] = useState([]);
  const [isPlacingMemo, setIsPlacingMemo] = useState(false);
  const [activeMemoId, setActiveMemoId] = useState(null);
  const [draggingMemo, setDraggingMemo] = useState(null);

  const chartRef = useRef(null);
  const specRef = useRef(null);
  const taskRef = useRef(null);
  const formRef = useRef(null);
  const dragMoved = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
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

    const parsedHistory = loadChartHistory(customer);
    setHistory(parsedHistory);

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
  }, [customer]);

  const handleSave = () => {
    const now = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const recordName = ballName ? ballName : `기록 ${history.length + 1}`;
    const newRecord = {
      id: Date.now(),
      timestamp: now,
      name: recordName,
      data: { chartData, customerInfo, ballName, layoutInfo, intent, memos },
    };
    const updatedHistory = [newRecord, ...history].slice(0, 20);

    setHistory(updatedHistory);
    setSaveDate(now);
    saveChartHistory(customer, updatedHistory);
    setHasUnsavedChanges(false);
    alert(`✅ ${customer.name} 고객님의 기록이 안전하게 저장되었습니다!`);
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

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
      return;
    }
    onBack();
  };

  const handleMemoPlace = (e, section, ref) => {
    if (!isPlacingMemo || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newMemo = { id: Date.now().toString(), x, y, text: '', section };

    setMemos([...memos, newMemo]);
    setIsPlacingMemo(false);
    setActiveMemoId(newMemo.id);
    setHasUnsavedChanges(true);
  };

  const renderMemoOverlay = (section, ref) => {
    if (!isPlacingMemo) return null;
    return <div className="absolute inset-0 z-[80] cursor-crosshair bg-indigo-500/10 rounded-2xl outline-dashed outline-2 outline-indigo-400 transition-all animate-pulse" onPointerDown={e => handleMemoPlace(e, section, ref)} />;
  };

  const renderMemos = (section, ref) => memos.filter(m => m.section === section || (!m.section && section === 'chart')).map(memo => (
    <div
      key={memo.id}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragMoved.current = false;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        setDraggingMemo({ id: memo.id, ref });
      }}
      onPointerMove={(e) => {
        if (draggingMemo?.id !== memo.id || !ref.current) return;
        
        const dist = Math.hypot(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
        if (dist > 5) dragMoved.current = true;

        const rect = ref.current.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        setMemos(prev => prev.map(m => m.id === memo.id ? { ...m, x, y } : m));
      }}
      onPointerUp={(e) => {
        if (draggingMemo?.id === memo.id) {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDraggingMemo(null);
          if (dragMoved.current) {
            setHasUnsavedChanges(true);
          } else if (!isPlacingMemo) {
            setActiveMemoId(memo.id);
          }
        }
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 z-[60] touch-none transition-transform ${draggingMemo?.id === memo.id ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105 active:scale-95'}`}
      style={{ left: `${memo.x}%`, top: `${memo.y}%` }}
    >
      <div className="bg-yellow-200 w-8 h-8 sm:w-10 sm:h-10 rounded-md shadow-md border border-yellow-400 flex items-center justify-center text-lg sm:text-xl pointer-events-none">📝</div>
      {memo.text && <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white/90 px-2 py-0.5 rounded shadow-sm text-[10px] sm:text-xs font-bold text-slate-700 whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis pointer-events-none">{memo.text}</div>}
    </div>
  ));

  const isMemoActive = isPlacingMemo || draggingMemo !== null;

  return (
    <div className="w-full p-2 sm:p-4 bg-slate-50 min-h-screen pb-40 relative">
      {isPlacingMemo && <div className="fixed inset-0 z-[30] bg-black/5" onClick={() => setIsPlacingMemo(false)} />}

      {isPlacingMemo && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-5 py-3 rounded-full shadow-2xl z-[100] font-bold text-sm flex items-center gap-3 animate-bounce whitespace-nowrap">
          <span>👇 원하는 카드(스펙, 차트/수정, 작업)를 터치하세요</span>
          <button onClick={() => setIsPlacingMemo(false)} className="ml-2 bg-indigo-800 hover:bg-indigo-900 px-3 py-1 rounded-md text-xs transition-colors">취소</button>
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
        <div className="w-full bg-white p-2 pb-6 sm:p-6 sm:pb-8 rounded-2xl shadow-md border border-slate-200 mt-2 mb-4 sm:mb-6 max-w-[768px] mx-auto relative z-40 overflow-hidden animate-fade-in transform-gpu [backface-visibility:hidden]">
          <div ref={formRef} className="relative w-full h-full">
            {renderMemoOverlay('form', formRef)}
            {renderMemos('form', formRef)}
            <ChartInputForm data={chartData} onChange={handleChartDataChange} />
          </div>
        </div>
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
          onSave={(text) => {
            if (!text.trim()) setMemos(memos.filter(m => m.id !== activeMemoId));
            else setMemos(memos.map(m => m.id === activeMemoId ? { ...m, text } : m));
            setActiveMemoId(null);
            setHasUnsavedChanges(true);
          }}
          onDelete={() => {
            setMemos(memos.filter(m => m.id !== activeMemoId));
            setActiveMemoId(null);
            setHasUnsavedChanges(true);
          }}
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
          onSelect={(record) => { if (window.confirm(`${record.timestamp} 기록을 불러오시겠습니까?`)) loadRecord(record); }}
          onClose={() => setShowHistoryModal(false)}
          onDelete={(id) => {
            const newHistory = history.filter(h => h.id !== id);
            setHistory(newHistory);
            saveChartHistory(customer, newHistory);
          }}
          onRename={(id, currentName) => {
            const newName = window.prompt('새로운 이름을 입력하세요:', currentName);
            if (newName && newName.trim() !== '') {
              const newHistory = history.map(h => h.id === id ? { ...h, name: newName.trim() } : h);
              setHistory(newHistory);
              saveChartHistory(customer, newHistory);
            }
          }}
        />
      )}

      {showExitConfirm && (
        <ExitConfirmModal
          onClose={() => setShowExitConfirm(false)}
          onSaveAndExit={() => {
            handleSave();
            setShowExitConfirm(false);
            onBack();
          }}
          onExitWithoutSave={() => {
            setShowExitConfirm(false);
            onBack();
          }}
        />
      )}
    </div>
  );
}
