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

export const MemoModal = ({ memo, onSave, onDelete }) => {
  const [text, setText] = useState(memo?.text || '');
  const [color, setColor] = useState(memo?.color || 'yellow');
  const [shape, setShape] = useState(memo?.shape || 'memo');

  const handleSaveAndClose = (e) => {
    e?.stopPropagation();
    onSave(text, color, shape);
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
          <div className="flex items-center justify-between w-full">
            <Button onClick={(e) => { e.stopPropagation(); onDelete(); }} size="sm" variant="danger">삭제</Button>
            <Button onClick={handleSaveAndClose} size="sm" variant="primary">저장</Button>
          </div>
        </>
      )}
      footerClassName="bg-slate-100 px-4 py-3 flex flex-col gap-2 border-t border-slate-200"
      icon="memo"
      initialFocusSelector="textarea"
      onClose={handleSaveAndClose}
      size="sm"
      title="메모 작성"
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

export const HistoryModal = ({ history, onSelect, onClose, onDelete, onRename }) => {
  return (
    <ModalShell bodyClassName="p-3 max-h-[60vh] overflow-y-auto bg-slate-50" icon="history" onClose={onClose} size="sm" title="저장 기록" titleId="history-modal-title">
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
  <ModalShell bodyClassName="p-5 flex flex-col gap-4 bg-slate-50" icon="warning" onClose={onClose} size="sm" title="주의" titleId="exit-confirm-title" zClassName="z-[150]">
    <p className="text-sm font-bold text-slate-700 text-center">
      저장되지 않은 변경 사항이 있습니다.<br />어떻게 하시겠습니까?
    </p>
    <div className="flex flex-col gap-2 mt-2">
      <Button className="w-full" onClick={onSaveAndExit} size="lg" variant="primary">저장하고 나가기</Button>
      <Button className="w-full" onClick={onExitWithoutSave} size="lg" variant="danger">저장하지 않고 나가기</Button>
      <Button className="w-full" onClick={onClose} size="lg" variant="secondary">취소</Button>
    </div>
  </ModalShell>
);
