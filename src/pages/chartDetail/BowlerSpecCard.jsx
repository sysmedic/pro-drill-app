import { useState, useEffect, useRef } from 'react';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import TaskbarHelpBalloon from '../../components/ui/TaskbarHelpBalloon.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

const bowlerSpecManualSections = [
  {
    items: [
      { title: "트랙 플레어 & 틸트", desc: "볼의 플레어 이격 거리 와 틸트 각도를 입력합니다." },
      { title: "RPM & 구속", desc: "볼러의 평균 회전수(RPM)와 투구 속도를 입력합니다." },
      { title: "PAP (Right/Left & Up/Down)", desc: "볼러의 회전축(Positive Axis Point) 이격 거리를 입력합니다." },
      { title: "미입력 시 표준 대입", desc: "수치가 비어있는 경우 AI 및 연산 엔진이 표준 기본값(300RPM, 25km/h, 5\" Right 1\" Up, 13°, 4.5\")을 자동으로 대입하여 정밀 연산합니다." }
    ]
  }
];

const InfoSelect = ({ label, value, options, onChange }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 flex flex-col items-center justify-center relative hover:bg-slate-100 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
    <span className="text-[12px] text-slate-500 font-bold tracking-tighter pointer-events-none whitespace-nowrap">{label}</span>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`appearance-none bg-transparent w-full text-center text-[16px] font-bold outline-none cursor-pointer ${value ? 'text-black' : 'text-slate-400 font-normal'}`}
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
  const [showHelp, setShowHelp] = useState(false);
  const [showManualHelpSetting, setShowManualHelpSetting] = useState(true);
  const syncedPingStyle = useSyncedPingStyle();

  useEffect(() => {
    const handleUpdateSetting = () => {
      setShowManualHelpSetting(localStorage.getItem('show_manual_help') !== 'false');
    };
    handleUpdateSetting();
    window.addEventListener('manual_help_setting_changed', handleUpdateSetting);
    window.addEventListener('storage', handleUpdateSetting);
    return () => {
      window.removeEventListener('manual_help_setting_changed', handleUpdateSetting);
      window.removeEventListener('storage', handleUpdateSetting);
    };
  }, []);

  const openKeypad = (field, value, title, extraKeys = [], mode = 'fraction') => setKeypad({ isOpen: true, field, value, title, extraKeys, mode });
  const handleKeypadConfirm = (newValue) => {
    onCustomerInfoChange(p => ({ ...p, [keypad.field]: newValue }));
  };

  return (
    /* 🟢 수정 위치: 음수 마진(-mt-3)을 주어 fixed 상태로 둥둥 떠 있는 네비게이션 바 밑으로 카드를 바짝 끌어올림 */
    <Card ref={innerRef} className={`-mt-1 sm:-mt-2.5 mb-0 transition-all ${showHelp ? 'relative z-50 overflow-visible' : ''}`} constrained elevation="md" gpu layer="content" padding="md">
      {memoOverlay}
      {memosRenderer}

      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between select-none relative z-10 gap-1.5 sm:gap-2 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer"
          onClick={onToggleOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleOpen();
            }
          }}
        >
          {/* 1행: 고객 이름 및 라벨 (좌) & 화살표 버튼 (모바일 우측) */}
          <div className="flex items-center justify-between w-full sm:w-auto shrink-0 gap-2">
            <span className="text-[20px] font-black text-slate-800 flex items-center flex-wrap gap-1.5 min-w-0">
              {customer.name}
              {(customer.gender || customer.hand || customer.style || customer.style2) && (
                <span className="text-slate-500 text-[20px] font-bold">
                  {customer.gender && (
                    <>
                      <span className={customer.gender === '남' ? 'text-blue-500' : customer.gender === '여' ? 'text-red-500' : ''}>
                        {customer.gender}
                      </span>
                      {(customer.hand || customer.style || customer.style2) && ' '}
                    </>
                  )}
                  {[customer.hand, customer.style, customer.style2].filter(Boolean).join(' ')}
                </span>
              )}
            {/* 💡 [볼러스펙 반투명 3초 맥동 도움말 버튼 - 이름 바로 옆 원상 복귀 및 카드 반전 완전 방지] */}
            {showManualHelpSetting && (
              <span 
                className="relative inline-flex shrink-0 ml-1 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowHelp(prev => !prev);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200/60 hover:bg-slate-200/90 text-slate-700 border border-slate-300/50 backdrop-blur-xs shadow-xs flex items-center justify-center font-black text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer focus:outline-none"
                  aria-label="볼러스펙 가이드"
                  title="볼러스펙 가이드"
                >
                  <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                  ?
                </button>
                <TaskbarHelpBalloon 
                  isOpen={showHelp} 
                  onClose={() => setShowHelp(false)} 
                  title="📖 볼러스펙"
                  sections={bowlerSpecManualSections}
                />
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
              <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
                <span className="max-[330px]:text-[clamp(9px,3.3vw,11px)] text-[12px] sm:text-[14px] bg-slate-200 text-slate-500 px-1 rounded font-bold sm:bg-transparent sm:px-0">중약지 경직도</span>
                <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800">{chartData.handCondition?.fingerStiffness || '-'}</span>
              </span>
              <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
                <span className="max-[330px]:text-[clamp(9px,3.3vw,11px)] text-[12px] sm:text-[14px] bg-slate-200 text-slate-500 px-1 rounded font-bold sm:bg-transparent sm:px-0">엄지 경직도</span>
                <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800">{chartData.handCondition?.thumbStiffness || '-'}</span>
              </span>
              <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
                <span className="max-[330px]:text-[clamp(9px,3.3vw,11px)] text-[12px] sm:text-[14px] bg-slate-200 text-slate-500 px-1 rounded font-bold sm:bg-transparent sm:px-0">건/습</span>
                <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800">{chartData.handCondition?.moisture || '-'}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-start sm:justify-end animate-fade-in gap-3 sm:gap-4 w-full sm:w-auto mt-1.5 sm:mt-0 pt-1.5 sm:pt-0 border-t border-slate-100/80 sm:border-t-0 whitespace-nowrap overflow-x-auto px-0.5">
              {(customerInfo.papX || customerInfo.papY) && (
                <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
                  <span className="max-[330px]:text-[clamp(9px,3.3vw,11px)] text-[12px] sm:text-[14px] bg-slate-200 text-slate-500 px-1 rounded font-bold sm:bg-transparent sm:px-0">PAP</span>
                  <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800">{customerInfo.papX || '-'} : {customerInfo.papY || '-'}</span>
                </span>
              )}
              {customerInfo.ballSpeed && (
                <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
                  <span className="max-[330px]:text-[clamp(9px,3.3vw,11px)] text-[12px] sm:text-[14px] bg-slate-200 text-slate-500 px-1 rounded font-bold sm:bg-transparent sm:px-0">구속</span>
                  <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800">{customerInfo.ballSpeed} km/h</span>
                </span>
              )}
              {customerInfo.rpm && (
                <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
                  <span className="max-[330px]:text-[clamp(9px,3.3vw,11px)] text-[12px] sm:text-[14px] bg-slate-200 text-slate-500 px-1 rounded font-bold sm:bg-transparent sm:px-0">RPM</span>
                  <span className="max-[330px]:text-[clamp(11px,3.9vw,13px)] text-[14px] font-bold text-slate-800">{customerInfo.rpm}</span>
                </span>
              )}
            </div>
          )}

          {/* 데스크톱 전용 화살표 아이콘 */}
          <span className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors shrink-0 ml-auto">
            <Icon name="chevronDown" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={16} strokeWidth={3} />
          </span>
      </div>

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
            <span className="text-[12px] text-slate-500 font-bold mb-0.5 tracking-tighter pointer-events-none">RPM</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-[16px] font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
              onClick={() => openKeypad('rpm', customerInfo.rpm, 'RPM', [], 'number')}
            >
              {customerInfo.rpm || <span className="text-slate-400 font-normal text-[16px]">입력</span>}
            </button>
          </div>
          <div className="border rounded-lg py-1 px-2 flex flex-col items-center justify-center bg-slate-50 border-slate-200 focus-within:border-indigo-500 focus-within:bg-indigo-50 transition-colors">
            <span className="text-[12px] text-slate-500 font-bold mb-0.5 tracking-tighter pointer-events-none">구속 (km/h)</span>
            <button
              type="button"
              className="w-full bg-transparent text-center text-[16px] font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
              onClick={() => openKeypad('ballSpeed', customerInfo.ballSpeed, '구속 (km/h)', [], 'number')}
            >
              {customerInfo.ballSpeed || <span className="text-slate-400 font-normal text-[16px]">입력</span>}
            </button>
          </div>

          {/* PAP 통합 외곽 박스 (col-span-2): PAP (Over) 및 PAP (Up / Down)를 하나의 결합된 박스로 표현 */}
          <div className="col-span-2 border border-slate-200 bg-slate-50 rounded-lg flex overflow-hidden focus-within:border-indigo-500 focus-within:bg-indigo-50/50 transition-colors">
            <div className="flex-1 py-1 px-1.5 flex flex-col items-center justify-center">
              <span className="text-[12px] text-slate-500 font-bold mb-0.5 tracking-tighter pointer-events-none">PAP (Over)</span>
              <button
                type="button"
                className="w-full bg-transparent text-center text-[16px] font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
                onClick={() => openKeypad('papX', customerInfo.papX, 'PAP (Over)')}
              >
                {customerInfo.papX || <span className="text-slate-400 font-normal text-[16px]">입력</span>}
              </button>
            </div>

            <div className="flex-1 py-1 px-1.5 flex flex-col items-center justify-center">
              <span className="text-[12px] text-slate-500 font-bold mb-0.5 tracking-tighter pointer-events-none whitespace-nowrap">(Up / Down)</span>
              <button
                type="button"
                className="w-full bg-transparent text-center text-[16px] font-bold text-black outline-none min-h-[24px] flex items-center justify-center"
                onClick={() => openKeypad('papY', customerInfo.papY, 'PAP (Up/Down)', ['Up', 'Down'])}
              >
                {customerInfo.papY || <span className="text-slate-400 font-normal text-[16px]">입력</span>}
              </button>
            </div>
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