import { useState } from 'react';
import Button, { IconButton } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';

export const MemoModal = ({ memo, onSave, onDelete }) => {
  const [text, setText] = useState(memo?.text || '');

  const handleSaveAndClose = (e) => {
    e?.stopPropagation();
    onSave(text);
  };

  return (
    <ModalShell
      bodyClassName="bg-yellow-50 p-4"
      footer={(
        <>
          <Button onClick={(e) => { e.stopPropagation(); onDelete(); }} size="sm" variant="danger">삭제</Button>
          <Button className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500" onClick={handleSaveAndClose} size="sm" variant="secondary">저장</Button>
        </>
      )}
      footerClassName="bg-yellow-100/50 px-4 py-3 flex justify-between items-center border-t border-yellow-200"
      icon="memo"
      initialFocusSelector="textarea"
      onClose={handleSaveAndClose}
      size="sm"
      title="메모 작성"
      titleId="memo-modal-title"
      variant="memo"
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
          <div key={record.id} className="w-full flex items-center justify-between p-4 mb-2 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-indigo-400 group">
            <div className="flex flex-col items-start flex-1 cursor-pointer" onClick={() => { onSelect(record); onClose(); }}>
              <span className="text-sm font-black text-indigo-600 mb-1 group-hover:text-indigo-700">
                {record.name || (index === 0 ? "최근 버전" : `Version ${history.length - index}`)}
              </span>
              <span className="text-xs font-bold text-slate-500">{record.timestamp}</span>
            </div>

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
