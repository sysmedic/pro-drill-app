import { useState } from 'react';
import Button, { IconButton } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';

const MEMO_COLORS = [
  { id: 'yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-400' },
  { id: 'red', bg: 'bg-red-400', ring: 'ring-red-400' },
  { id: 'blue', bg: 'bg-blue-400', ring: 'ring-blue-400' },
  { id: 'green', bg: 'bg-emerald-400', ring: 'ring-emerald-400' },
  { id: 'purple', bg: 'bg-purple-400', ring: 'ring-purple-400' },
];

const MEMO_SHAPES = [
  { id: 'memo', icon: 'memo' },
  { id: 'checkSquare', icon: 'checkSquare' },
  { id: 'star', icon: 'star' },
];

// 🟢 [프롭스 수령]: 상위 ChartModalManager가 연산하여 토스한 등급 권한(isBetaTester) 수령
export const MemoModal = ({ title, memo, onSave, onDelete, isBetaTester }) => {
  const [text, setText] = useState(memo?.text || '');
  const [color, setColor] = useState(memo?.color || 'yellow');
  const [shape, setShape] = useState(memo?.shape || 'memo');
  
  // 기존의 고정 상태 기억
  const [isPinned] = useState(memo?.isPinned || false);

  const handleSaveAndClose = (e) => {
    e?.stopPropagation();
    onSave(text, color, shape, isPinned);
  };

  const handlePinAndClose = (e) => {
    e?.stopPropagation();
    onSave(text, color, shape, true);
  };

  return (
    <ModalShell
      bodyClassName="bg-slate-50 p-4"
      footer={(
        <>
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex gap-1">
              {MEMO_SHAPES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShape(s.id); }}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${shape === s.id ? 'bg-slate-300 text-slate-800' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                >
                  <Icon name={s.icon} size={16} />
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <div className="flex gap-2">
              {MEMO_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setColor(c.id); }}
                  className={`w-6 h-6 rounded-full shadow-sm ${c.bg} transition-transform ${color === c.id ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'hover:scale-110'}`}
                />
              ))}
            </div>
          </div>
          
          {/* 버튼 레이아웃 개편: 3분할 그리드로 정중앙 배치 구현 */}
          <div className="grid grid-cols-3 items-center w-full mt-1">
            <div className="flex justify-start">
              <Button onClick={(e) => { e.stopPropagation(); onDelete(); }} size="sm" variant="danger">삭제</Button>
            </div>
            
            <div className="flex justify-center">
              {/* 모든 사용자가 메모를 차트에 고정할 수 있도록 개방 */}
              {!isPinned && (
                <Button 
                  onClick={handlePinAndClose} 
                  size="sm" 
                  className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold whitespace-nowrap px-4 py-2 rounded-lg transition-colors"
                >
                  차트에 고정 하기
                </Button>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSaveAndClose} size="sm" variant="primary">저장</Button>
            </div>
          </div>
        </>
      )}
      footerClassName="bg-slate-100 px-4 py-3 flex flex-col gap-2 border-t border-slate-200"
      icon="memo"
      initialFocusSelector="textarea"
      onClose={handleSaveAndClose}
      size="sm"
      title={title || "메모 작성"}
      titleId="memo-modal-title"
      variant="light"
      zClassName="z-[120]"
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="내용을 입력하세요..."
        className="w-full h-32 bg-transparent border-0 outline-none resize-none text-slate-800 text-base font-semibold"
      />
    </ModalShell>
  );
};

export const HistoryModal = ({ history, onSelect, onClose, onDelete, onRename, maxChartsAllowed, currentChartsCount }) => {
  // 🎯 [원형 사수] 원래의 (5/20개) 수량 표기 방식으로 회귀하고 흰색 투과도 작은 글씨 스타일(text-white/60 text-xs font-medium) 적용
  const modalTitle = (
    <span className="flex items-center gap-1">
      저장 기록
      <span className="text-white/60 text-xs font-medium ml-1">
        ({currentChartsCount}{maxChartsAllowed !== Infinity ? `/${maxChartsAllowed}` : ''}개)
      </span>
    </span>
  );

  return (
    <ModalShell bodyClassName="p-3 max-h-[60vh] overflow-y-auto bg-slate-50" icon="history" onClose={onClose} size="sm"
      title={modalTitle} titleId="history-modal-title">
      {history.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center gap-2">
          <Icon name="history" className="text-slate-300" size={42} />
          <span className="text-slate-400 font-bold">저장된 기록이 없습니다.</span>
        </div>
      ) : (
        history.map((record, index) => (
          <div key={record.id} className="w-full flex items-center justify-between p-3 mb-2 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-400 group">
            <button
              className="flex flex-col items-start flex-1 min-w-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => { onSelect(record); onClose(); }}
              type="button"
            >
              <span className="text-sm font-black text-indigo-600 mb-1 group-hover:text-indigo-700">
                {record.name || (index === 0 ? "최근 버전" : `Version ${history.length - index}`)}
              </span>
              <span className="text-xs font-bold text-slate-500">{record.timestamp}</span>
            </button>

            <div className="flex gap-1 ml-2 shrink-0">
              <IconButton aria-label="기록 이름 변경" icon="edit" onClick={(e) => { e.stopPropagation(); onRename(record.id, record.name || `Version ${history.length - index}`); }} size="xs" variant="plain" />
              <IconButton aria-label="기록 삭제" icon="trash" onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} size="xs" variant="plain" />
            </div>
          </div>
        ))
      )}
    </ModalShell>
  );
};

export const ExitConfirmModal = ({ onClose, onSaveAndExit, onExitWithoutSave }) => (
  <ModalShell 
    onClose={onClose} 
    size="sm" 
    title={"\u26A0\uFE0F 주의"} 
    titleId="exit-confirm-title" 
    zClassName="z-[150]"
  >
    <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
      {/* 설명 단락 */}
      <p className="text-xs text-slate-500 leading-relaxed pl-1">
        현재 작성 중인 지공 차트에 저장되지 않은 변경 사항이 감지되었습니다.
      </p>

      {/* 경고 영역 컨테이너 (AI 설정 모달 디자인 기준 일치화) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{"\u26A0\uFE0F"}</span>
          <h3 className="text-sm font-black text-slate-800">이탈 경고</h3>
        </div>
        
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 leading-normal">
            작업 중인 지공 데이터를 저장하지 않고 이탈하시면 수정한 변경 사항이 모두 유실됩니다. 어떻게 진행하시겠습니까?
          </p>
        </div>
      </div>

      {/* 액션 버튼 영역 */}
      <div className="flex flex-col gap-2 pt-2">
        <Button className="w-full" onClick={onSaveAndExit} size="sm" variant="primary">
          저장하고 나가기
        </Button>
        <button 
          onClick={onExitWithoutSave}
          type="button"
          className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors active:scale-95 text-center"
        >
          저장하지 않고 나가기
        </button>
        <button 
          onClick={onClose} 
          type="button"
          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-xs font-black transition-colors active:scale-95 text-center"
        >
          취소하고 편집 계속하기
        </button>
      </div>
    </div>
  </ModalShell>
);