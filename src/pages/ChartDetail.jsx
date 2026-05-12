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

export default function ChartDetail({ customer, onBack }) {
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
  const [viewingRecord, setViewingRecord] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModifyWarning, setShowModifyWarning] = useState(false);
  const [hasWarnedModify, setHasWarnedModify] = useState(false);
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
      setViewingRecord(null);
      setHasWarnedModify(false);
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
          thumbOffset: loadedChart.thumbOffset || { left: '', right: '' },
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
      setViewingRecord(null);
      setIsEditMode(false);
      setHasWarnedModify(false);
    } else {
      initializeNewCustomer();
    }

    setHasUnsavedChanges(false);
  }, [customer, loadHistoryForCustomer, setMemos]);

  // 내용 수정 발생 시 첫 1회 안내/경고창 노출 로직
  useEffect(() => {
    if (hasUnsavedChanges && viewingRecord && !hasWarnedModify) {
      setShowModifyWarning(true);
      setHasWarnedModify(true);
    }
  }, [hasUnsavedChanges, viewingRecord, hasWarnedModify]);

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
    
    // 과거 기록을 불러온 상태에서 저장했을 때만 워터마크 정보를 새 기록으로 갱신하고,
    // 신규 차트 작성 중 저장했을 때는 워터마크를 띄우지 않습니다.
    if (viewingRecord) {
      setViewingRecord({ id: newRecord.id, name: recordName, timestamp: now });
    }
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
        thumbOffset: loadedChart.thumbOffset || { left: '', right: '' },
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
    setViewingRecord({ 
      id: record.id, 
      name: record.name || '불러온 기록', 
      timestamp: record.timestamp 
    });
    setHasUnsavedChanges(false);
    setHasWarnedModify(false);
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
    
    // 캡처 시 그림자 제거를 위한 임시 스타일 주입
    const styleEl = document.createElement('style');
    styleEl.innerHTML = '[data-exporting="true"] * { box-shadow: none !important; }';
    document.head.appendChild(styleEl);
    node.setAttribute('data-exporting', 'true');

    try {
      await new Promise(resolve => setTimeout(resolve, 50)); // 스타일 반영 대기
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

      // 이미지를 바로 공유하지 않고 미리보기 상태에 넘깁니다.
      setSharePreview(blob);
      setShareFilename(`${customer.name}_지공차트`);
      setFeedback(null);
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      setFeedback({ message: '이미지 생성 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      // 임시 스타일 복구
      node.removeAttribute('data-exporting');
      document.head.removeChild(styleEl);
    }
  };

  // 미리보기 확인 후 실제 공유/다운로드를 실행하는 함수
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
          message={"불러온 기록을 수정합니다.\n(저장 시 새로운 기록으로 만들어집니다.)"}
          onCancel={() => {
            // 취소 시: 수정한 내용을 버리고 원래 기록으로 되돌림
            const originalRecord = history.find(r => r.id === viewingRecord.id);
            if (originalRecord) {
              loadRecord(originalRecord);
            }
            setShowModifyWarning(false);
          }}
          onConfirm={() => setShowModifyWarning(false)}
          title="기록 수정 안내"
          titleId="modify-warning-title"
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
