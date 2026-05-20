import { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Field from '../../components/ui/Field.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';

const getFormattedDate = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  let hh = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ampm = hh >= 12 ? '오후' : '오전';
  hh = hh % 12 || 12;
  return `${yy}. ${MM}. ${dd}. ${ampm} ${hh}:${mm}:${ss}`;
};

export default function TaskDetailsCard({
  ballName, innerRef, intent, isOpen, layoutInfo,
  memoOverlay, memosRenderer, onBallNameChange, onIntentChange, onLayoutInfoChange, onToggleOpen,
  chartData, onChartDataChange, setHasUnsavedChanges, isNewChart, handleSave, currentRecordId,
}) {
  const [logInput, setLogInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetLogId, setTargetLogId] = useState(null);
  
  const logs = Array.isArray(chartData?.maintenanceLogs) ? chartData.maintenanceLogs : [];

  const commitLogs = (nextLogs) => {
    const updatedChartData = { ...(chartData || {}), maintenanceLogs: nextLogs };
    onChartDataChange(updatedChartData);
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  const handleIntentChange = (e) => {
    const val = e.target.value;
    onIntentChange(val); 
  };

  const handleAddLogTrigger = (e) => {
    if (e.key && e.key !== 'Enter') return;
    e.preventDefault();
    
    const trimmed = logInput.trim();
    if (!trimmed) return;
    
    const newLog = { id: Date.now().toString(), text: trimmed, date: getFormattedDate() };
    commitLogs([...logs, newLog]);
    
    setLogInput('');
  };

  const triggerRemoveLogModal = (idToRemove) => {
    setTargetLogId(idToRemove);
    setIsDeleteModalOpen(true);
  };

  const confirmRemoveLog = () => {
    if (targetLogId) {
      commitLogs(logs.filter((log) => log.id !== targetLogId));
    }
    setIsDeleteModalOpen(false);
    setTargetLogId(null);
  };

  return (
    <Card ref={innerRef} className="mt-4" elevation="md" layer="content" padding="md">
      {memoOverlay}
      {memosRenderer}

      <button
        type="button"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between select-none relative z-10 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        onClick={onToggleOpen}
      >
        <span className="font-black text-slate-800 text-sm sm:text-base pl-1 flex items-center gap-1.5">
          <Icon name="ball" className="text-slate-700" size={20} />
          작업내용
        </span>
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
          <Icon name="chevronDown" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={16} strokeWidth={3} />
        </span>
      </button>

      <div className={`grid transition-[grid-template-rows,opacity,margin] duration-400 ease-in-out relative z-10 ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3 sm:mt-4' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0 p-1 -m-1">
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="볼링공 모델명 / 작업" onChange={e => onBallNameChange(e.target.value)} placeholder="예: 페이즈 4" type="text" value={ballName} />
              <Field label="레이아웃 (Dual Angle 등)" onChange={e => onLayoutInfoChange(e.target.value)} placeholder="예: 50 x 4 x 30" type="text" value={layoutInfo} />
            </div>
            
            <Field as="textarea" controlClassName="text-base text-slate-700 resize-none" label="상담 내용 및 지공 의도" onChange={handleIntentChange} placeholder="특이사항, 지공 변경 이유, 고객 요청사항 등을 자유롭게 기록하세요." rows="3" value={intent} />
            
            {/* 🟢 기획 반영: 새 차트가 아닐 때(기존 차트 열람 및 수정 시)에만 관리 내역 영역 표시 */}
            {!isNewChart && (
              <div className="pt-2 space-y-4">
                
                {logs.length > 0 && (
                  <div className="space-y-2 w-full">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm animate-fade-in"
                      >
                        <span className="font-bold text-slate-800 text-sm truncate mr-4">{log.text}</span>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-slate-400 text-[11px] font-medium whitespace-nowrap">
                            {log.date}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => triggerRemoveLogModal(log.id)} 
                            className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-0.5 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-1 w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-2 pl-1">
                    관리 내역 <span className="text-slate-400 font-normal text-xs ml-1">(정비 내역을 추가 하세요)</span>
                  </label>
                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      value={logInput}
                      onChange={(e) => setLogInput(e.target.value)}
                      onKeyDown={handleAddLogTrigger}
                      placeholder="내역을 입력하고 추가 버튼을 누르세요"
                      className="w-full flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddLogTrigger}
                      className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition flex-shrink-0"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <ConfirmModal
          cancelLabel="취소"
          confirmLabel="삭제"
          danger={true}
          message="선택하신 관리 내역을 정말 삭제하시겠습니까?"
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setTargetLogId(null);
          }}
          onConfirm={confirmRemoveLog}
          title="관리 내역 삭제"
          titleId="maintenance-log-delete-title"
        />
      )}
    </Card>
  );
}