import { useState } from 'react';
import FractionKeypad from './FractionKeypad.jsx';

const InfoSelect = ({ label, value, options, onChange }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 flex flex-col items-center justify-center relative hover:bg-slate-100 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
    <span className="text-[10px] sm:text-[11px] text-black font-bold tracking-tighter pointer-events-none whitespace-nowrap">{label}</span>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`appearance-none bg-transparent w-full text-center text-[13px] sm:text-sm font-black outline-none cursor-pointer ${value ? 'text-black' : 'text-slate-400'}`}
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
  const [keypad, setKeypad] = useState({ isOpen: false, field: null, value: '', title: '', extraKeys: [] });
  const openKeypad = (field, value, title, extraKeys = []) => setKeypad({ isOpen: true, field, value, title, extraKeys });
  const handleKeypadConfirm = (newValue) => {
    onCustomerInfoChange(p => ({ ...p, [keypad.field]: newValue }));
  };

  return (
    <div ref={innerRef} className="w-full bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200 mt-2 mb-4 sm:mb-6 max-w-[768px] mx-auto relative z-40 transform-gpu [backface-visibility:hidden]">
      {memoOverlay}
      {memosRenderer}

      <div className="flex items-center justify-between cursor-pointer select-none relative z-10 gap-2" onClick={onToggleOpen}>
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center flex-wrap gap-1.5">
            {customer.name}
            {(customer.hand || customer.style) && (
              <span className="text-slate-500">
                {[customer.hand, customer.style].filter(Boolean).join(' ')}
              </span>
            )}
          </h2>
        </div>

        {!isOpen && (
          <div className="flex flex-1 items-center justify-end animate-fade-in overflow-hidden ml-auto px-1">
            {(customerInfo.papX || customerInfo.papY || customerInfo.ballSpeed || customerInfo.rpm) && (
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200 shadow-sm inline-block truncate max-w-full">
                {customerInfo.papX || customerInfo.papY ? <span>{customerInfo.papX || '-'} : {customerInfo.papY || '-'}</span> : null}
                {(customerInfo.papX || customerInfo.papY) && customerInfo.ballSpeed ? <span className="opacity-40 mx-0.5">|</span> : null}
                {customerInfo.ballSpeed ? <span>{customerInfo.ballSpeed}k</span> : null}
                {((customerInfo.papX || customerInfo.papY || customerInfo.ballSpeed) && customerInfo.rpm) ? <span className="opacity-40 mx-0.5">|</span> : null}
                {customerInfo.rpm ? <span>{customerInfo.rpm}r</span> : null}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors shrink-0">
          <span className={`transition-transform duration-300 font-bold text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows,opacity,margin] duration-400 ease-in-out relative z-10 ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3 sm:mt-4' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 flex items-center justify-start gap-4 flex-wrap">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1.5">
            <span className="text-[10px] bg-slate-200 text-slate-500 px-1 rounded">중약지 경직도</span>
            <span className="text-slate-800">{chartData.handCondition?.fingerStiffness || '-'}</span>
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1.5">
            <span className="text-[10px] bg-slate-200 text-slate-500 px-1 rounded">엄지 경직도</span>
            <span className="text-slate-800">{chartData.handCondition?.thumbStiffness || '-'}</span>
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1.5">
            <span className="text-[10px] bg-slate-200 text-slate-500 px-1 rounded">건/습</span>
            <span className="text-slate-800">{chartData.handCondition?.moisture || '-'}</span>
          </span>
        </div>

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
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full bg-transparent text-center text-sm sm:text-base font-black text-black outline-none placeholder:text-slate-400 placeholder:font-normal"
              value={customerInfo.rpm}
              onChange={e => onCustomerInfoChange(p => ({ ...p, rpm: e.target.value }))}
              placeholder="입력"
            />
          </div>
          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-black font-bold mb-0.5 tracking-tighter pointer-events-none">구속 (km/h)</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full bg-transparent text-center text-sm sm:text-base font-black text-black outline-none placeholder:text-slate-400 placeholder:font-normal"
              value={customerInfo.ballSpeed}
              onChange={e => onCustomerInfoChange(p => ({ ...p, ballSpeed: e.target.value }))}
              placeholder="입력"
            />
          </div>

          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-black font-bold mb-0.5 tracking-tighter pointer-events-none">PAP (Over)</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-sm sm:text-base font-black text-black outline-none min-h-[24px] flex items-center justify-center"
              onClick={() => openKeypad('papX', customerInfo.papX, 'PAP (Over)')}
            >
              {customerInfo.papX || <span className="text-slate-400 font-normal">입력</span>}
            </button>
          </div>

          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-black font-bold mb-0.5 tracking-tighter pointer-events-none">PAP (Up/Down)</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-sm sm:text-base font-black text-black outline-none min-h-[24px] flex items-center justify-center"
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
        onClose={() => setKeypad(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleKeypadConfirm}
      />
    </div>
  );
}
