import { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import FractionKeypad from './FractionKeypad.jsx';

const InfoSelect = ({ label, value, options, onChange }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 flex flex-col items-center justify-center relative hover:bg-slate-100 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
    <span className="text-[10px] sm:text-[11px] text-black font-bold tracking-tighter pointer-events-none whitespace-nowrap">{label}</span>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`appearance-none bg-transparent w-full text-center text-base font-bold outline-none cursor-pointer ${value ? 'text-black' : 'text-slate-400'}`}
      style={{ textAlignLast: 'center' }}
    >
      <option value="" disabled hidden>선택</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default function BowlerSpecCard({
  chartData,
  customer,
  customerInfo,
  innerRef,
  isOpen,
  memoOverlay,
  memosRenderer,
  onCustomerInfoChange,
  onToggleOpen,
}) {
  const [keypad, setKeypad] = useState({ isOpen: false, field: null, value: '', title: '', extraKeys: [], mode: 'fraction' });
  const openKeypad = (field, value, title, extraKeys = [], mode = 'fraction') => setKeypad({ isOpen: true, field, value, title, extraKeys, mode });
  const handleKeypadConfirm = (newValue) => {
    onCustomerInfoChange(p => ({ ...p, [keypad.field]: newValue }));
  };

  return (
    /* 🟢 수정 위치: 음수 마진(-mt-3)을 주어 fixed 상태로 둥둥 떠 있는 네비게이션 바 밑으로 카드를 바짝 끌어올림 */
    <Card ref={innerRef} className="-mt-1 sm:-mt-2.5 mb-0" constrained elevation="md" gpu layer="content" padding="md">
      {memoOverlay}
      {memosRenderer}

      <button
        type="button"
        aria-expanded={isOpen}
        className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between select-none relative z-10 gap-1.5 sm:gap-2 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        onClick={onToggleOpen}
      >
        {/* 1행: 고객 이름 및 라벨 (좌) & 화살표 버튼 (모바일 우측) */}
        <div className="flex items-center justify-between w-full sm:w-auto shrink-0 gap-2">
          <span className="text-xl sm:text-2xl font-black text-slate-800 flex items-center flex-wrap gap-1.5 min-w-0">
            {customer.name}
            {(customer.gender || customer.hand || customer.style || customer.style2) && (
              <span className="text-slate-500 text-sm sm:text-base font-bold">
                {customer.gender && (
                  <>
                    <span className={customer.gender === '남' ? 'text-blue-400' : customer.gender === '여' ? 'text-red-400' : ''}>
                      {customer.gender}
                    </span>
                    {(customer.hand || customer.style || customer.style2) && ' '}
                  </>
                )}
                {[customer.hand, customer.style, customer.style2].filter(Boolean).join(' ')}
              </span>
            )}
          </span>

          {/* 모바일 전용 화살표 아이콘 */}
          <span className="sm:hidden flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-400 shrink-0">
            <Icon name="chevronDown" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={15} strokeWidth={3} />
          </span>
        </div>

        {/* 2행(모바일 전용 앞단/왼쪽 정렬) / 1행 우측(데스크톱) */}
        {isOpen ? (
          <div className="flex items-center justify-start sm:justify-end animate-fade-in gap-3 sm:gap-4 w-full sm:w-auto mt-1.5 sm:mt-0 pt-1.5 sm:pt-0 border-t border-slate-100/80 sm:border-t-0 whitespace-nowrap overflow-x-auto px-0.5">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <span className="text-[10px] bg-slate-200 text-slate-500 px-1 rounded font-black">중약지</span>
              <span className="text-slate-800 font-extrabold">{chartData.handCondition?.fingerStiffness || '-'}</span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <span className="text-[10px] bg-slate-200 text-slate-500 px-1 rounded font-black">엄지</span>
              <span className="text-slate-800 font-extrabold">{chartData.handCondition?.thumbStiffness || '-'}</span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <span className="text-[10px] bg-slate-200 text-slate-500 px-1 rounded font-black">건/습</span>
              <span className="text-slate-800 font-extrabold">{chartData.handCondition?.moisture || '-'}</span>
            </span>
          </div>
        ) : (
          <span className="flex items-center justify-start sm:justify-end animate-fade-in overflow-hidden w-full sm:w-auto mt-1 sm:mt-0 pt-1 sm:pt-0 border-t border-slate-100/80 sm:border-t-0">
            {(customerInfo.papX || customerInfo.papY || customerInfo.ballSpeed || customerInfo.rpm) && (
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200 shadow-sm inline-block truncate max-w-full">
                {customerInfo.papX || customerInfo.papY ? <span>{customerInfo.papX || '-'} : {customerInfo.papY || '-'}</span> : null}
                {(customerInfo.papX || customerInfo.papY) && customerInfo.ballSpeed ? <span className="opacity-40 mx-0.5">|</span> : null}
                {customerInfo.ballSpeed ? <span>{customerInfo.ballSpeed}k</span> : null}
                {((customerInfo.papX || customerInfo.papY || customerInfo.ballSpeed) && customerInfo.rpm) ? <span className="opacity-40 mx-0.5">|</span> : null}
                {customerInfo.rpm ? <span>{customerInfo.rpm}r</span> : null}
              </span>
            )}
          </span>
        )}

        {/* 데스크톱 전용 화살표 아이콘 */}
        <span className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors shrink-0 ml-auto">
          <Icon name="chevronDown" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={16} strokeWidth={3} />
        </span>
      </button>

      <div className={`grid transition-[grid-template-rows,opacity,margin] duration-400 ease-in-out relative z-10 ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3 sm:mt-4' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0">

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <InfoSelect
            label="트랙 플레어"
            value={customerInfo.trackFlare}
            options={["High", "Medium", "Low"]}
            onChange={v => onCustomerInfoChange(p => ({ ...p, trackFlare: v }))}
          />
          <InfoSelect
            label="틸트"
            value={customerInfo.tilt}
            options={["Low", "Medium", "High"]}
            onChange={v => onCustomerInfoChange(p => ({ ...p, tilt: v }))}
          />

          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-black font-bold mb-0.5 tracking-tighter pointer-events-none">RPM</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-base font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
              onClick={() => openKeypad('rpm', customerInfo.rpm, 'RPM', [], 'number')}
            >
              {customerInfo.rpm || <span className="text-slate-400 font-normal">입력</span>}
            </button>
          </div>
          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-black font-bold mb-0.5 tracking-tighter pointer-events-none">구속 (km/h)</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-base font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
              onClick={() => openKeypad('ballSpeed', customerInfo.ballSpeed, '구속 (km/h)', [], 'number')}
            >
              {customerInfo.ballSpeed || <span className="text-slate-400 font-normal">입력</span>}
            </button>
          </div>

          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-black font-bold mb-0.5 tracking-tighter pointer-events-none">PAP (Over)</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-base font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
              onClick={() => openKeypad('papX', customerInfo.papX, 'PAP (Over)')}
            >
              {customerInfo.papX || <span className="text-slate-400 font-normal">입력</span>}
            </button>
          </div>

          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-black font-bold mb-0.5 tracking-tighter pointer-events-none">PAP (Up/Down)</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-base font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
              onClick={() => openKeypad('papY', customerInfo.papY, 'PAP (Up/Down)', ['Up', 'Down'])}
            >
              {customerInfo.papY || <span className="text-slate-400 font-normal">입력</span>}
            </button>
          </div>
        </div>
        </div>
      </div>

      <FractionKeypad 
        isOpen={keypad.isOpen}
        initialValue={keypad.value}
        title={keypad.title}
        extraKeys={keypad.extraKeys}
        mode={keypad.mode}
        onClose={() => setKeypad(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleKeypadConfirm}
      />
    </Card>
  );
}