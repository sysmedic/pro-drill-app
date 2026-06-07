import { useState, useMemo } from 'react';
import DisclosureSection from '../../components/ui/DisclosureSection.jsx';
import KeypadField from '../../components/ui/KeypadField.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import FractionKeypad from './FractionKeypad.jsx';

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

export default function ChartInputForm({ data = {}, customer = {}, historyData = [], onChange }) {
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

  const [activeAccordion, setActiveAccordion] = useState(null);
  const toggleAccordion = (id) => setActiveAccordion(prev => prev === id ? null : id);

  const [keypad, setKeypad] = useState({ isOpen: false, field: null, value: '', title: '', mode: 'fraction' });
  
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

  const openKeypad = (field, value, title, mode = 'fraction') => {
    let initialValue = value;
    if (!value && (field === 'spanLeft' || field === 'spanRight')) {
      initialValue = field === 'spanLeft' ? spanRight : spanLeft;
    }
    setKeypad({ isOpen: true, field, value: initialValue, title, mode });
  };

  const handleKeypadConfirm = (newValue) => {
    if (keypad.field?.startsWith('thumbDetails.')) {
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
    <DisclosureSection density={FORM_DENSITY} id={id} isOpen={activeAccordion === id} onToggle={() => toggleAccordion(id)} summary={summary} title={title}>
      {children}
    </DisclosureSection>
  );

  const renderMidTitleBar = (isOpen) => {
    if (!isOpen) {
      return <span className="font-bold">{firstLabel}</span>;
    }

    return (
      <div className="flex items-center justify-between w-full pr-4 text-left">
        <span className="font-bold">{firstLabel}</span>
        <div 
          className="flex items-center gap-4 bg-slate-100 p-1 rounded-md border border-slate-200"
          onClick={(e) => e.stopPropagation()} 
        >
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer px-1.5 py-0.5 rounded">
            <input 
              type="radio" 
              name="pitchPrecision" 
              value="16" 
              checked={pitchPrecision === '16'} 
              onChange={() => setPitchPrecision('16')}
              className="text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
            />
            16분 단위
          </label>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer px-1.5 py-0.5 rounded">
            <input 
              type="radio" 
              name="pitchPrecision" 
              value="32" 
              checked={pitchPrecision === '32'} 
              onChange={() => setPitchPrecision('32')}
              className="text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
            />
            32분 단위
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-2.5 pb-6">
      <div className="relative flex items-center justify-center p-2.5 bg-slate-50 rounded-lg shadow-sm border border-slate-200 min-h-[50px]">
        <div className="absolute left-3 flex items-center"><h3 className="font-bold text-base text-indigo-900 shrink-0 whitespace-nowrap">{isLeft ? '왼손' : '오른손'}</h3></div>
        <div className="flex bg-slate-200 rounded-md p-1 border border-slate-300">
          <button className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${!isThumbless ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => onChange({ ...data, isThumbless: false })}>쓰리핑거</button>
          <button className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${isThumbless ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => onChange({ ...data, isThumbless: true })}>덤리스</button>
        </div>
      </div>

      {/* 1. Bridge 박스 */}
      {renderSection('bridge', 'Bridge', bridge, (
        <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <label className="text-xs font-bold text-slate-600 whitespace-nowrap">브릿지 간격</label>
          <ChartSelectField
            aria-label="브릿지 간격"
            allowCustom
            className="max-w-[200px]"
            customPrompt="브릿지 수치를 직접 입력하세요:"
            label=""
            options={['1/8', '3/16', '1/4']}
            value={bridge || ''}
            onChange={(v) => onChange({ ...data, bridge: v })}
          />
        </div>
      ))}

      {/* 2. 핸드 컨디션 박스 */}
      {renderSection('hand', '핸드 컨디션', getHandCondSummary(handCondition), (
        <div className="grid grid-cols-3 gap-2">
          <ChartSelectField label="건/습" value={handCondition.moisture} onChange={v => updateCondition('moisture', v)} options={MOISTURE_OPTIONS} />
          <ChartSelectField label="중약지" value={handCondition.fingerStiffness} onChange={v => updateCondition('fingerStiffness', v)} options={STIFFNESS_OPTIONS} />
          <ChartSelectField label="엄지" value={handCondition.thumbStiffness} onChange={v => updateCondition('thumbStiffness', v)} options={STIFFNESS_OPTIONS} />
        </div>
      ))}

      {/* 3. Span 박스 */}
      {renderSection('span', 'Span', getSpanSummary(), (
        <>
        <div className="mb-2.5"><ChartSelectField label="Span 타입" value={spanType} onChange={v => onChange({ ...data, spanType: v })} options={SPAN_TYPE_OPTIONS} /></div>
        <div className="grid grid-cols-2 gap-2.5">
          <ChartKeypadField label="중지 Span" onOpen={() => openKeypad('spanLeft', spanLeft, "중지 Span", 'span')} value={spanLeft} />
          <ChartKeypadField label="약지 Span" onOpen={() => openKeypad('spanRight', spanRight, "약지 Span", 'span')} value={spanRight} />
        </div>
        </>
      ))}

      {/* 4. 중지 박스 */}
      <DisclosureSection 
        density={FORM_DENSITY} 
        id="first" 
        isOpen={activeAccordion === 'first'} 
        onToggle={() => toggleAccordion('first')} 
        summary={getFingerSummary(midPitch)} 
        title={renderMidTitleBar(activeAccordion === 'first')}
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
        isOpen={activeAccordion === 'second'} 
        onToggle={() => toggleAccordion('second')} 
        summary={getFingerSummary(ringPitch)} 
        title={secondLabel}
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
          isOpen={activeAccordion === 'thumb'} 
          onToggle={() => toggleAccordion('thumb')} 
          summary={getThumbSummary(thumbPitch, thumbDetails, ovalAngle, thumbOffset)} 
          title="Thumb"
        >
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <ChartSelectField label="Forward (▲)" value={thumbPitch.up} onChange={v => updateThumb('up', v)} options={filteredPitchOptions} />
            <ChartSelectField label="Reverse (▼)" value={thumbPitch.down} onChange={v => updateThumb('down', v)} options={filteredPitchOptions} />
            <ChartSelectField label="Left (◀)" value={thumbPitch.left} onChange={v => updateThumb('left', v)} options={filteredPitchOptions} />
            <ChartSelectField label="Right (▶)" value={thumbPitch.right} onChange={v => updateThumb('right', v)} options={filteredPitchOptions} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <ChartSelectField label="Offset - Left" value={thumbOffset.left} onChange={v => updateThumbOffset('left', v)} options={OFFSET_OPTIONS} />
            <ChartSelectField label="Offset - Right" value={thumbOffset.right} onChange={v => updateThumbOffset('right', v)} options={OFFSET_OPTIONS} />
          </div>
          <h4 className="font-bold text-sm mb-2 text-slate-700">상세 사이즈 및 각도</h4>
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
            <ChartKeypadField label="오발 각도" onOpen={() => openKeypad('ovalAngle', ovalAngle, '오발 각도', 'number')} placeholder="" value={ovalAngle} />
            <ChartSelectField allowCustom label="덤 타입" value={thumbDetails.slugType} onChange={v => updateThumbDetails('slugType', v)} options={THUMB_TYPE_OPTIONS} />
            <ChartSelectField allowCustom label="홀컷 사이즈" value={thumbDetails.holeCutSize} onChange={v => updateThumbDetails('holeCutSize', v)} options={THUMB_HOLE_CUT_OPTIONS} />
          </div>
          <h4 className="font-bold text-sm mb-2 mt-3 text-slate-700">Bevel (드릴 사이즈/깊이)</h4>
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
        mode={keypad.mode}
        onClose={() => setKeypad(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleKeypadConfirm}
      />
    </div>
  );
}