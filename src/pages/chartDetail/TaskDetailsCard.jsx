import Card from '../../components/ui/Card.jsx';
import Field from '../../components/ui/Field.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function TaskDetailsCard({
  ballName,
  innerRef,
  intent,
  isOpen,
  layoutInfo,
  memoOverlay,
  memosRenderer,
  onBallNameChange,
  onIntentChange,
  onLayoutInfoChange,
  onToggleOpen,
}) {
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
            <Field as="textarea" controlClassName="text-base text-slate-700 resize-none" label="상담 내용 및 지공 의도" onChange={e => onIntentChange(e.target.value)} placeholder="특이사항, 지공 변경 이유, 고객 요청사항 등을 자유롭게 기록하세요." rows="5" value={intent} />
          </div>
        </div>
      </div>
    </Card>
  );
}
