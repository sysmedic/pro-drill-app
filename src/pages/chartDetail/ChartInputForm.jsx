import { useState, useMemo, useEffect, useRef } from 'react';
import DisclosureSection from '../../components/ui/DisclosureSection.jsx';
import KeypadField from '../../components/ui/KeypadField.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TaskbarHelpBalloon from '../../components/ui/TaskbarHelpBalloon.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

const styleManualSections = [
  {
    items: [
      { title: "투구 스타일 선택", desc: "쓰리핑거 및 덤리스(투핸드) 스타일을 전환합니다." },
      { title: "덤리스 자동화", desc: "덤리스 선택 시 엄지 수치 입력 구역이 자동으로 숨김 처리됩니다." }
    ]
  }
];

const bridgeManualSections = [
  {
    items: [
      { title: "브릿지 간격", desc: "중지와 약지 홀 사이의 브릿지 이격 거리를 의미합니다." },
      { title: "수치 선택 및 커스텀 입력", desc: "주요 지정 간격(1/8, 3/16, 1/4 등)을 선택하거나 원하는 수치를 직접 입력할 수 있습니다." }
    ]
  }
];

const handCondManualSections = [
  {
    items: [
      { title: "건/습 상태", desc: "고객의 손 피부 땀 및 습윤 상태를 기록하여 핑거 그립 및 부착 팁 선택 시 참고합니다." },
      { title: "중약지 및 엄지 경직도", desc: "손가락의 유연성/경직도(상/중/하)를 관찰하여 스팬 및 피치 설정 시 반영합니다." }
    ]
  }
];

const bowlerSpecManualSections = [
  {
    items: [
      { title: "볼러 스펙 기록", desc: "트랙 플레어, 틸트, RPM, 구속, PAP(Over/Up/Down) 수치를 입력합니다." },
      { title: "차트 카드 연동", desc: "입력된 수치는 상세 차트 상단의 볼러스펙 카드에 실시간 연동 표시됩니다." }
    ]
  }
];

const spanManualSections = [
  {
    items: [
      { title: "Span 타입", desc: "Actual Span, Cut to Cut, Center to Center 등 Span 타입을 선택합니다." },
      { title: "중지 / 약지 Span", desc: "정밀 숫자 키패드로 중지 및 약지 스팬 치수를 각각 입력합니다." }
    ]
  }
];

const midFingerManualSections = [
  {
    items: [
      { title: "중지 피치 (Pitch)", desc: "Reverse/Forward 및 Lateral(좌/우) 피치 수치와 방향을 입력합니다. (16분 / 32분 단위 토글 지원)" },
      { title: "인서트 및 팁 정보", desc: "인서트 사이즈, 팁 종류, 제조사 브랜드 및 홀컷 사이즈를 세밀하게 지정합니다." }
    ]
  }
];

const ringFingerManualSections = [
  {
    items: [
      { title: "약지 피치 (Pitch)", desc: "Reverse/Forward 및 Lateral(좌/우) 피치 수치와 방향을 입력합니다." },
      { title: "인서트 및 팁 정보", desc: "인서트 사이즈, 팁 종류, 제조사 브랜드 및 홀컷 사이즈를 세밀하게 지정합니다." }
    ]
  }
];

const thumbManualSections = [
  {
    items: [
      { title: "엄지 피치 (Pitch)", desc: "Forward/Reverse 및 Left/Right 피치 수치를 설정합니다." },
      { title: "Offset 수치 구역", desc: "엄지 좌/우 Offset 수치를 독립 설정합니다." },
      { title: "원홀, 오발 & 베벨", desc: "원홀 사이즈, 오발 크기 및 각도, 슬러그 타입, 베벨 수치를 세밀하게 입력합니다." }
    ]
  }
];

// 🟢 외부 분리 모듈 직통 임포트 연동
import BevelField from './BevelField.jsx';
import {
  PITCH_OPTIONS_32,
  getBevelOptions,
  getDynamicOvalOptions,
  getDefaultHoleCutSize,
  getDefaultThumbHoleCutSize,
} from './chartUtils.js';

import {
  FINGER_INSERT_OPTIONS,
  HOLE_OPTIONS,
  LATERAL_DIR_OPTIONS,
  MOISTURE_OPTIONS,
  OVAL_OPTIONS,
  SPAN_TYPE_OPTIONS,
  STIFFNESS_OPTIONS,
  THUMB_TYPE_OPTIONS,
  TIP_OPTIONS,
} from './chartOptions.js';

const FORM_DENSITY = 'compact';

const FINGER_HOLE_CUT_OPTIONS = ['31/32', '1 1/32'];
const THUMB_HOLE_CUT_OPTIONS = ['1 1/8', '1 1/4', '1 3/8', '1 1/2'];
const BEVEL_DEPTH_OPTIONS = [
  '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16', '1/2',
  '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16', '1'
];
const OFFSET_OPTIONS = [
  '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16', '1/2',
  '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16', '1'
];

const MANUFACTURER_OPTIONS = ['G & S', '로드필드', '텐스프레임', 'Turbo', 'Master'];

// 🟢 [이식]: 드릴링 가이드의 오발 컷 연산 정의 함수 정의
const parseFraction = (str) => {
  if (!str) return 0;
  const cleanStr = String(str).split('(')[0].trim();
  const parts = cleanStr.split(' ');
  if (parts.length === 2 && parts[1].includes('/')) {
    const whole = parseFloat(parts[0]);
    const frac = parts[1].split('/');
    return whole + (parseFloat(frac[0]) / parseFloat(frac[1]));
  } else if (parts.length === 1) {
    if (parts[0].includes('/')) {
      const frac = parts[0].split('/');
      return parseFloat(frac[0]) / parseFloat(frac[1]);
    }
    return parseFloat(parts[0]);
  }
  return 0;
};

const toFraction64 = (num) => {
  if (num <= 0) return '';
  const totalNumerator = Math.round(num * 64);
  const whole = Math.floor(totalNumerator / 64);
  const numerator = totalNumerator % 64;

  if (numerator === 0) return String(whole);

  let n = numerator;
  let d = 64;
  while (n % 2 === 0 && d % 2 === 0) {
    n /= 2;
    d /= 2;
  }

  if (whole > 0) {
    return `${whole} ${n}/${d}`;
  }
  return `${n}/${d}`;
};

function ChartSelectField(props) {
  return <SelectField density={FORM_DENSITY} {...props} />;
}

function ChartKeypadField(props) {
  return <KeypadField density={FORM_DENSITY} {...props} />;
}

export default function ChartInputForm({ 
  data = {}, 
  customer = {}, 
  customerInfo = {}, 
  onCustomerInfoChange = (() => {}), 
  historyData = [], 
  onChange 
}) {
  const isThumbless = data?.isThumbless || false;
  const handedness = data?.handedness || 'right';
  const handCondition = data?.handCondition || {};
  const midPitch = data?.midPitch || {};
  const ringPitch = data?.ringPitch || {};
  const thumbPitch = data?.thumbPitch || {};
  const thumbOffset = data?.thumbOffset || { left: '', right: '' };
  const thumbDetails = data?.thumbDetails || {};
  const bridge = data?.bridge || '';
  const spanType = data?.spanType || '';
  const spanLeft = data?.spanLeft || '';
  const spanRight = data?.spanRight || '';
  const ovalAngle = data?.ovalAngle || '';

  const bevelOptions = useMemo(() => getBevelOptions(thumbDetails?.holeSize), [thumbDetails?.holeSize]);
  const dynamicOvalOptions = useMemo(() => getDynamicOvalOptions(thumbDetails?.holeSize, OVAL_OPTIONS), [thumbDetails?.holeSize]);

  // 🟢 [이식]: 원홀 기준 드릴 비트(64분법 감산) 선택 옵션 실시간 동적 생성
  const baseHoleSizeNum = useMemo(() => parseFraction(thumbDetails?.holeSize), [thumbDetails?.holeSize]);
  const ovalCutOptions = useMemo(() => {
    if (!baseHoleSizeNum) return [];
    const options = [];
    for (let i = 0; i <= 10; i++) {
      const val = baseHoleSizeNum - (i / 64);
      if (val > 0) options.push(toFraction64(val));
    }
    return options;
  }, [baseHoleSizeNum]);

  const [openAccordions, setOpenAccordions] = useState(() => {
    const expandAll = localStorage.getItem('expandInputAccordions') === 'true';
    if (expandAll) {
      return { bridge: true, hand: true, bowlerSpec: true, span: true, first: true, second: true, thumb: true };
    }
    return {};
  });
  const toggleAccordion = (id) => setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));

  const [keypad, setKeypad] = useState({ isOpen: false, field: null, value: '', title: '', mode: 'fraction' });
  const [activeHelpSection, setActiveHelpSection] = useState(null);
  const [showManualHelpSetting, setShowManualHelpSetting] = useState(true);

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

  const syncedPingStyle = useSyncedPingStyle();

  const renderHelpBtn = (sectionKey, helpTitle, sections) => {
    if (!showManualHelpSetting) return null;
    const isOpen = activeHelpSection === sectionKey;
    return (
      <span 
        className="relative inline-flex shrink-0 ml-1.5 align-middle z-20"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setActiveHelpSection(prev => prev === sectionKey ? null : sectionKey);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              setActiveHelpSection(prev => prev === sectionKey ? null : sectionKey);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200/60 hover:bg-slate-200/90 text-slate-700 border border-slate-300/50 backdrop-blur-xs shadow-xs flex items-center justify-center font-black text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer focus:outline-none select-none"
          aria-label={`${helpTitle} 안내`}
          title={`${helpTitle} 안내`}
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
          ?
        </span>
        <TaskbarHelpBalloon 
          isOpen={isOpen} 
          onClose={() => setActiveHelpSection(null)} 
          title={helpTitle}
          sections={sections}
        />
      </span>
    );
  };
  
  const lastChart = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;
    const sorted = [...historyData].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return sorted[0];
  }, [historyData]);

  const [pitchPrecision, setPitchPrecision] = useState(() => {
    if (lastChart) {
      const has32nd = (p) => p && [p.up, p.down, p.lat].some(v => v && String(v).includes('/32'));
      if (has32nd(lastChart.midPitch) || has32nd(lastChart.ringPitch)) {
        return '32';
      }
      return '16';
    }
    return '16';
  });

  const filteredPitchOptions = useMemo(() => {
    if (pitchPrecision === '32') return PITCH_OPTIONS_32;
    return PITCH_OPTIONS_32.filter(opt => !opt.includes('/32'));
  }, [pitchPrecision]);

  const openKeypad = (field, value, title, extraKeys = [], mode = 'fraction') => {
    let initialValue = value;
    if (!value && (field === 'spanLeft' || field === 'spanRight')) {
      initialValue = field === 'spanLeft' ? spanRight : spanLeft;
    }
    setKeypad({ isOpen: true, field, value: initialValue, title, extraKeys, mode });
  };

  const handleKeypadConfirm = (newValue) => {
    if (keypad.field?.startsWith('customerInfo.')) {
      const key = keypad.field.split('.')[1];
      onCustomerInfoChange(p => ({ ...p, [key]: newValue }));
    } else if (keypad.field?.startsWith('thumbDetails.')) {
      const key = keypad.field.split('.')[1];
      onChange({ ...data, thumbDetails: { ...thumbDetails, [key]: newValue } });
    } else {
      onChange({ ...data, [keypad.field]: newValue });
    }
  };

  const isLeft = handedness === 'left';
  const firstLabel = "중지 (Middle)";
  const secondLabel = "약지 (Ring)";

  const updateCondition = (key, val) => onChange({ ...data, handCondition: { ...handCondition, [key]: val } });

  const updateMid = (key, val) => {
    let nextMid = { ...midPitch, [key]: val };
    if (key === 'up') nextMid.down = '';
    if (key === 'down') nextMid.up = '';
    if (key === 'lat') {
      if (val !== '' && !nextMid.latDir) nextMid.latDir = isLeft ? 'right' : 'left';
      if (val === '') nextMid.latDir = '';
    }
    if (key === 'insertSize') {
      nextMid.holeCutSize = getDefaultHoleCutSize(val);
    }
    
    let updatedData = { ...data, midPitch: nextMid };

    if (key === 'tipType' && val && !ringPitch.tipType) {
      updatedData.ringPitch = { ...ringPitch, tipType: val };
    }
    if (key === 'extraLine' && val && !ringPitch.extraLine) {
      updatedData.ringPitch = { ...ringPitch, extraLine: val };
    }

    onChange(updatedData);
  };

  const updateRing = (key, val) => {
    let nextRing = { ...ringPitch, [key]: val };
    if (key === 'up') nextRing.down = '';
    if (key === 'down') nextRing.up = '';
    if (key === 'lat') {
      if (val !== '' && !nextRing.latDir) nextRing.latDir = isLeft ? 'left' : 'right';
      if (val === '') nextRing.latDir = '';
    }
    if (key === 'insertSize') {
      nextRing.holeCutSize = getDefaultHoleCutSize(val);
    }
    
    let updatedData = { ...data, ringPitch: nextRing };

    if (key === 'tipType' && val && !midPitch.tipType) {
      updatedData.midPitch = { ...midPitch, tipType: val };
    }
    if (key === 'extraLine' && val && !midPitch.extraLine) {
      updatedData.midPitch = { ...midPitch, extraLine: val };
    }

    onChange(updatedData);
  };

  const updateThumb = (key, val) => {
    let next = { ...thumbPitch, [key]: val };
    if (key === 'up') next.down = '';
    if (key === 'down') next.up = '';
    if (key === 'left') next.right = '';
    if (key === 'right') next.left = '';
    onChange({ ...data, thumbPitch: next });
  };

  const updateThumbOffset = (key, val) => {
    let next = { ...thumbOffset, [key]: val };
    if (key === 'left') next.right = '';
    if (key === 'right') next.left = '';
    onChange({ ...data, thumbOffset: next });
  };

  const updateThumbDetails = (key, val) => {
    const next = { ...thumbDetails, [key]: val };
    if (key === 'slugType') {
      next.holeCutSize = getDefaultThumbHoleCutSize(val, customer?.gender);
    }
    onChange({ ...data, thumbDetails: next });
  };

  const getHandCondSummary = (cond = {}) => {
    const p = [];
    if (cond.moisture) p.push(`습윤 ${cond.moisture}`);
    if (cond.fingerStiffness) p.push(`중약지 ${cond.fingerStiffness}`);
    if (cond.thumbStiffness) p.push(`엄지 ${cond.thumbStiffness}`);
    return p.length > 0 ? p.join(' / ') : '';
  };

  const getBowlerSpecSummary = (info = {}) => {
    const p = [];
    if (info.trackFlare) p.push(`플레어 ${info.trackFlare}`);
    if (info.tilt) p.push(`틸트 ${info.tilt}`);
    if (info.rpm) p.push(`${info.rpm}r`);
    if (info.ballSpeed) p.push(`${info.ballSpeed}k`);
    if (info.papX || info.papY) p.push(`PAP ${info.papX || '-'}:${info.papY || '-'}`);
    return p.length > 0 ? p.join(' / ') : '';
  };

  const getFingerSummary = (pitch) => {
    if (!pitch) return '';
    const parts = [];
    if (pitch.up) parts.push(`Rev ${pitch.up}`);
    else if (pitch.down) parts.push(`Fwd ${pitch.down}`);
    if (pitch.lat) parts.push(`${pitch.latDir === 'left' ? 'L' : 'R'} ${pitch.lat}`);
    if (pitch.insertSize) parts.push(String(pitch.insertSize).split(' ')[0]);
    if (pitch.tipType) parts.push(pitch.tipType);
    if (pitch.extraLine) parts.push(pitch.extraLine); 
    if (pitch.holeCutSize) parts.push(`H/C ${pitch.holeCutSize}`);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const getSpanSummary = () => {
    const parts = [];
    if (spanLeft) parts.push(`중지 ${spanLeft}`);
    if (spanRight) parts.push(`약지 ${spanRight}`);
    if (spanType) parts.push(spanType);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const getThumbSummary = (pitch, details, angle, offset) => {
    const parts = [];
    if (pitch?.up) parts.push(`Fwd ${pitch.up}`);
    else if (pitch?.down) parts.push(`Rev ${pitch.down}`);
    if (pitch?.left) parts.push(`L ${pitch.left}`);
    else if (pitch?.right) parts.push(`R ${pitch.right}`);
    if (offset?.left) parts.push(`Offset Left ${offset.left}`);
    else if (offset?.right) parts.push(`Offset Right ${offset.right}`);
    if (details?.holeSize) parts.push(`원홀 ${details.holeSize}`);
    if (details?.ovalSize) parts.push(`오발 ${details.ovalSize}`);
    if (angle) parts.push(`${angle}°`);
    if (details?.slugType) parts.push(details.slugType);
    if (details?.holeCutSize) parts.push(`H/C ${details.holeCutSize}`);
    if (details?.bevel1) parts.push(`B1 ${details.bevel1.replace(/\|/g, '/')}`);
    if (details?.bevel2) parts.push(`B2 ${details.bevel2.replace(/\|/g, '/')}`);
    if (details?.bevel3) parts.push(`B3 ${details.bevel3.replace(/\|/g, '/')}`);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const renderSection = (id, title, summary, children) => (
    <DisclosureSection density={FORM_DENSITY} id={id} isOpen={!!openAccordions[id]} onToggle={() => toggleAccordion(id)} summary={summary} title={title}>
      {children}
    </DisclosureSection>
  );

  const renderMidTitleBar = (isOpen) => {
    return (
      <div className="flex items-center justify-between w-full pr-2 text-left gap-4 sm:gap-6">
        <span className="font-bold shrink-0 inline-flex items-center gap-1">
          <span>{firstLabel}</span>
          {renderHelpBtn('first', '📖 중지', midFingerManualSections)}
        </span>
        {isOpen && (
          <div 
            className="flex items-center gap-3.5 sm:gap-5 ml-auto shrink-0"
            onClick={(e) => e.stopPropagation()} 
          >
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input 
                type="radio" 
                name="pitchPrecision" 
                value="16" 
                checked={pitchPrecision === '16'} 
                onChange={() => setPitchPrecision('16')}
                className="text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
              />
              16분
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input 
                type="radio" 
                name="pitchPrecision" 
                value="32" 
                checked={pitchPrecision === '32'} 
                onChange={() => setPitchPrecision('32')}
                className="text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
              />
              32분
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-2 pb-1.5">
      {/* 0. 투구 스타일 박스 (사용손 / 쓰리핑거 · 덤리스) */}
      <div className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50/40 border border-indigo-300 shadow-sm rounded-lg relative">
        <h3 className="font-bold text-base text-indigo-900 shrink-0 flex items-center gap-1">
          <span>{isLeft ? '왼손' : '오른손'}</span>
          {renderHelpBtn('style', '📖 투구 스타일', styleManualSections)}
        </h3>
        <div className="flex bg-slate-200/80 rounded-md p-1 border border-slate-300/80">
          <button 
            type="button"
            className={`px-3 py-1 text-xs sm:text-sm font-extrabold rounded transition-colors ${!isThumbless ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} 
            onClick={() => onChange({ ...data, isThumbless: false })}
          >
            쓰리핑거
          </button>
          <button 
            type="button"
            className={`px-3 py-1 text-xs sm:text-sm font-extrabold rounded transition-colors ${isThumbless ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} 
            onClick={() => onChange({ ...data, isThumbless: true })}
          >
            덤리스
          </button>
        </div>
      </div>

      {/* 1. Bridge 박스 */}
      <div className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50/40 border border-indigo-300 shadow-sm rounded-lg">
        <h3 className="font-bold text-base text-indigo-900 shrink-0 flex items-center gap-1">
          <span>Bridge</span>
          {renderHelpBtn('bridge', '📖 브릿지 (Bridge)', bridgeManualSections)}
        </h3>
        <ChartSelectField
          aria-label="브릿지 간격"
          allowCustom
          className="max-w-[180px] sm:max-w-[200px]"
          customPrompt="브릿지 수치를 직접 입력하세요:"
          label=""
          options={['1/8', '3/16', '1/4']}
          value={bridge || ''}
          onChange={(v) => onChange({ ...data, bridge: v })}
        />
      </div>

      {/* 2. 핸드 컨디션 박스 */}
      {renderSection('hand', (
        <span className="inline-flex items-center gap-1">
          <span>핸드 컨디션</span>
          {renderHelpBtn('hand', '📖 핸드 컨디션', handCondManualSections)}
        </span>
      ), getHandCondSummary(handCondition), (
        <div className="grid grid-cols-3 gap-2">
          <ChartSelectField label="건/습 상태" value={handCondition.moisture} onChange={v => updateCondition('moisture', v)} options={MOISTURE_OPTIONS} />
          <ChartSelectField label="중약지 경직도" value={handCondition.fingerStiffness} onChange={v => updateCondition('fingerStiffness', v)} options={STIFFNESS_OPTIONS} />
          <ChartSelectField label="엄지 경직도" value={handCondition.thumbStiffness} onChange={v => updateCondition('thumbStiffness', v)} options={STIFFNESS_OPTIONS} />
        </div>
      ))}

      {/* 2.5 볼러 스펙 박스 */}
      {renderSection('bowlerSpec', (
        <span className="inline-flex items-center gap-1">
          <span>볼러 스펙</span>
          {renderHelpBtn('bowlerSpec', '📖 볼러 스펙', bowlerSpecManualSections)}
        </span>
      ), getBowlerSpecSummary(customerInfo), (
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <ChartSelectField 
            label="트랙 플레어" 
            value={customerInfo.trackFlare || ''} 
            onChange={v => onCustomerInfoChange(p => ({ ...p, trackFlare: v }))} 
            options={["High", "Medium", "Low"]} 
          />
          <ChartSelectField 
            label="틸트" 
            value={customerInfo.tilt || ''} 
            onChange={v => onCustomerInfoChange(p => ({ ...p, tilt: v }))} 
            options={["Low", "Medium", "High"]} 
          />
          <ChartKeypadField 
            label="RPM" 
            onOpen={() => openKeypad('customerInfo.rpm', customerInfo.rpm, 'RPM', [], 'number')} 
            value={customerInfo.rpm || ''} 
          />
          <ChartKeypadField 
            label="구속 (km/h)" 
            onOpen={() => openKeypad('customerInfo.ballSpeed', customerInfo.ballSpeed, '구속 (km/h)', [], 'number')} 
            value={customerInfo.ballSpeed || ''} 
          />
          <ChartKeypadField 
            label="PAP (Over)" 
            onOpen={() => openKeypad('customerInfo.papX', customerInfo.papX, 'PAP (Over)')} 
            value={customerInfo.papX || ''} 
          />
          <ChartKeypadField 
            label={
              <span className="whitespace-nowrap">
                <span className="hidden min-[354px]:inline">PAP (Up/Down)</span>
                <span className="inline min-[354px]:hidden">(Up/Down)</span>
              </span>
            } 
            onOpen={() => openKeypad('customerInfo.papY', customerInfo.papY, 'PAP (Up/Down)', ['Up', 'Down'])} 
            value={customerInfo.papY || ''} 
          />
        </div>
      ))}

      {/* 3. Span 박스 */}
      {renderSection('span', (
        <span className="inline-flex items-center gap-1">
          <span>Span</span>
          {renderHelpBtn('span', '📖 Span', spanManualSections)}
        </span>
      ), getSpanSummary(), (
        <>
        <div className="mb-2.5"><ChartSelectField label="Span 타입" value={spanType} onChange={v => onChange({ ...data, spanType: v })} options={SPAN_TYPE_OPTIONS} /></div>
        <div className="grid grid-cols-2 gap-2.5">
          <ChartKeypadField label="중지 Span" onOpen={() => openKeypad('spanLeft', spanLeft, "중지 Span", [], 'span')} value={spanLeft} />
          <ChartKeypadField label="약지 Span" onOpen={() => openKeypad('spanRight', spanRight, "약지 Span", [], 'span')} value={spanRight} />
        </div>
        </>
      ))}

      {/* 4. 중지 박스 */}
      <DisclosureSection 
        density={FORM_DENSITY} 
        id="first" 
        isOpen={!!openAccordions['first']} 
        onToggle={() => toggleAccordion('first')} 
        summary={getFingerSummary(midPitch)} 
        title={renderMidTitleBar(!!openAccordions['first'])}
      >
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5"><ChartSelectField label="Reverse (▲)" value={midPitch.up} onChange={v => updateMid('up', v)} options={filteredPitchOptions} /><ChartSelectField label="Forward (▼)" value={midPitch.down} onChange={v => updateMid('down', v)} options={filteredPitchOptions} /><ChartSelectField label="Lateral" value={midPitch.lat} onChange={v => updateMid('lat', v)} options={filteredPitchOptions} /><ChartSelectField label="Lateral 방향" value={midPitch.latDir} onChange={v => updateMid('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ChartSelectField allowCustom label="인서트 사이즈" value={midPitch.insertSize} onChange={v => updateMid('insertSize', v)} options={FINGER_INSERT_OPTIONS} />
            <ChartSelectField allowCustom label="팁 종류" value={midPitch.tipType} onChange={v => updateMid('tipType', v)} options={TIP_OPTIONS} />
            <ChartSelectField allowCustom label="제조사" value={midPitch.extraLine} onChange={v => updateMid('extraLine', v)} options={MANUFACTURER_OPTIONS} />
            <ChartSelectField allowCustom label="홀컷 사이즈" value={midPitch.holeCutSize} onChange={v => updateMid('holeCutSize', v)} options={FINGER_HOLE_CUT_OPTIONS} />
          </div>
        </>
      </DisclosureSection>

      {/* 5. 약지 박스 */}
      <DisclosureSection 
        density={FORM_DENSITY} 
        id="second" 
        isOpen={!!openAccordions['second']} 
        onToggle={() => toggleAccordion('second')} 
        summary={getFingerSummary(ringPitch)} 
        title={(
          <span className="inline-flex items-center gap-1">
            <span>{secondLabel}</span>
            {renderHelpBtn('second', '📖 약지', ringFingerManualSections)}
          </span>
        )}
      >
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5"><ChartSelectField label="Reverse (▲)" value={ringPitch.up} onChange={v => updateRing('up', v)} options={filteredPitchOptions} /><ChartSelectField label="Forward (▼)" value={ringPitch.down} onChange={v => updateRing('down', v)} options={filteredPitchOptions} /><ChartSelectField label="Lateral" value={ringPitch.lat} onChange={v => updateRing('lat', v)} options={filteredPitchOptions} /><ChartSelectField label="Lateral 방향" value={ringPitch.latDir} onChange={v => updateRing('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ChartSelectField allowCustom label="인서트 사이즈" value={ringPitch.insertSize} onChange={v => updateRing('insertSize', v)} options={FINGER_INSERT_OPTIONS} />
            <ChartSelectField allowCustom label="팁 종류" value={ringPitch.tipType} onChange={v => updateRing('tipType', v)} options={TIP_OPTIONS} />
            <ChartSelectField allowCustom label="제조사" value={ringPitch.extraLine} onChange={v => updateRing('extraLine', v)} options={MANUFACTURER_OPTIONS} />
            <ChartSelectField allowCustom label="홀컷 사이즈" value={ringPitch.holeCutSize} onChange={v => updateRing('holeCutSize', v)} options={FINGER_HOLE_CUT_OPTIONS} />
          </div>
        </>
      </DisclosureSection>

      {/* 6. 엄지 박스 (최하단) */}
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${!isThumbless ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0 flex flex-col gap-2.5">
        
        <DisclosureSection 
          density={FORM_DENSITY} 
          id="thumb" 
          isOpen={!!openAccordions['thumb']} 
          onToggle={() => toggleAccordion('thumb')} 
          summary={getThumbSummary(thumbPitch, thumbDetails, ovalAngle, thumbOffset)} 
          title={(
            <span className="inline-flex items-center gap-1">
              <span>엄지 (Thumb)</span>
              {renderHelpBtn('thumb', '📖 엄지', thumbManualSections)}
            </span>
          )}
        >
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <ChartSelectField label="Forward (▲)" value={thumbPitch.up} onChange={v => updateThumb('up', v)} options={filteredPitchOptions} />
            <ChartSelectField label="Reverse (▼)" value={thumbPitch.down} onChange={v => updateThumb('down', v)} options={filteredPitchOptions} />
            <ChartSelectField label="Left (◀)" value={thumbPitch.left} onChange={v => updateThumb('left', v)} options={filteredPitchOptions} />
            <ChartSelectField label="Right (▶)" value={thumbPitch.right} onChange={v => updateThumb('right', v)} options={filteredPitchOptions} />
          </div>

          {/* 💡 Offset 구분선 배지 */}
          <div className="relative my-3.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-indigo-200/90" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-indigo-50 text-indigo-900 text-xs font-black px-3 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                Offset
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <ChartSelectField label="Left" value={thumbOffset.left} onChange={v => updateThumbOffset('left', v)} options={OFFSET_OPTIONS} />
            <ChartSelectField label="Right" value={thumbOffset.right} onChange={v => updateThumbOffset('right', v)} options={OFFSET_OPTIONS} />
          </div>

          {/* 💡 상세 사이즈 및 각도 구분선 배지 */}
          <div className="relative my-3.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-indigo-200/90" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-indigo-50 text-indigo-900 text-xs font-black px-3 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                상세 사이즈 및 각도
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ChartSelectField allowCustom label="원홀" value={thumbDetails.holeSize} onChange={v => updateThumbDetails('holeSize', v)} options={HOLE_OPTIONS} />
            <ChartSelectField allowCustom label="오발 사이즈" value={thumbDetails.ovalSize} onChange={v => updateThumbDetails('ovalSize', v)} options={dynamicOvalOptions} />
            <ChartSelectField 
              allowCustom 
              label="오발 컷" 
              value={thumbDetails.ovalCut || thumbDetails.holeSize || ''} 
              onChange={v => updateThumbDetails('ovalCut', v)} 
              options={ovalCutOptions} 
            />
            <ChartKeypadField label="오발 각도" onOpen={() => openKeypad('ovalAngle', ovalAngle, '오발 각도', [], 'number')} placeholder="" value={ovalAngle} />
            <ChartSelectField allowCustom label="덤 타입" value={thumbDetails.slugType} onChange={v => updateThumbDetails('slugType', v)} options={THUMB_TYPE_OPTIONS} />
            <ChartSelectField allowCustom label="홀컷 사이즈" value={thumbDetails.holeCutSize} onChange={v => updateThumbDetails('holeCutSize', v)} options={THUMB_HOLE_CUT_OPTIONS} />
          </div>

          {/* 💡 Bevel (드릴 사이즈/깊이) 구분선 배지 */}
          <div className="relative my-3.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-indigo-200/90" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-indigo-50 text-indigo-900 text-xs font-black px-3 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                Bevel (드릴 사이즈/깊이)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-2.5">
            <BevelField label="Bevel 1" value={thumbDetails.bevel1} onChange={v => updateThumbDetails('bevel1', v)} sizeOptions={bevelOptions} depthOptions={BEVEL_DEPTH_OPTIONS} />
            <BevelField label="Bevel 2" value={thumbDetails.bevel2} onChange={v => updateThumbDetails('bevel2', v)} sizeOptions={bevelOptions} depthOptions={BEVEL_DEPTH_OPTIONS} />
            <BevelField label="Bevel 3" value={thumbDetails.bevel3} onChange={v => updateThumbDetails('bevel3', v)} sizeOptions={bevelOptions} depthOptions={BEVEL_DEPTH_OPTIONS} />
          </div>
          </>
        </DisclosureSection>
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
    </div>
  );
}