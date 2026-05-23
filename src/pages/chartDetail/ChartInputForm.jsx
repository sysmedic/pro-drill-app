import { useState, useMemo } from 'react';
import DisclosureSection from '../../components/ui/DisclosureSection.jsx';
import KeypadField from '../../components/ui/KeypadField.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { TextInputModal } from '../../components/ui/Dialogs.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import Icon from '../../components/ui/Icon.jsx';
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

// ✨ 제조사 옵션 배열 추가
const MANUFACTURER_OPTIONS = ['G & S', '로드필드', '텐스프레임', 'Turbo', 'Master'];

// 🟢 1/32 기약분수 자동 생성 로직 (0 ~ 1인치 범위, 직접입력 삭제)
const getGCD = (a, b) => (b === 0 ? a : getGCD(b, a % b));
const getReducedFraction = (num, den) => {
  if (num === 0) return '0';
  const gcd = getGCD(num, den);
  const reducedNum = num / gcd;
  const reducedDen = den / gcd;
  if (reducedDen === 1) return String(reducedNum);
  if (reducedNum > reducedDen) {
    const whole = Math.floor(reducedNum / reducedDen);
    const rem = reducedNum % reducedDen;
    return `${whole} ${rem}/${reducedDen}`;
  }
  return `${reducedNum}/${reducedDen}`;
};
// 0부터 32(1인치)까지 1/32 단위 배열 생성
const PITCH_OPTIONS_32 = Array.from({ length: 33 }, (_, i) => getReducedFraction(i, 32));


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

const getDefaultHoleCutSize = (insertSize) => {
  if (!insertSize) return '31/32';
  const num = parseFraction(insertSize);
  if (num >= 55 / 64) return '1 1/32';
  return '31/32';
};

const getDefaultThumbHoleCutSize = (slugType, gender) => {
  const type = String(slugType || '').trim().toUpperCase();
  if (type.includes('IT')) return '1 3/8';
  if (type.includes('스위치') || type.includes('조포')) return '1 1/2';
  if (gender === '여') return '1 1/8';
  return '1 1/4';
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

const getBevelOptions = (holeSize) => {
  const baseNum = parseFraction(holeSize);
  if (!baseNum) return [];
  const maxNum = 1.125; // 1 1/8
  const options = [];
  let currentNum = baseNum + 1 / 64;
  while (Math.round(currentNum * 64) <= Math.round(maxNum * 64)) {
    options.push(toFraction64(currentNum));
    currentNum += 1 / 64;
  }
  return options;
};

const getDynamicOvalOptions = (holeSize, defaultOptions) => {
  const baseNum = parseFraction(holeSize);
  if (!baseNum) return defaultOptions;
  const maxNum = 1.25; // 1 1/4
  const options = [];
  let currentNum = baseNum;
  while (Math.round(currentNum * 64) <= Math.round(maxNum * 64)) {
    options.push(toFraction64(currentNum));
    currentNum += 1 / 64;
  }
  return options;
};

function ChartSelectField(props) {
  return <SelectField density={FORM_DENSITY} {...props} />;
}

function ChartKeypadField(props) {
  return <KeypadField density={FORM_DENSITY} {...props} />;
}

function BevelField({ label, value, onChange, sizeOptions, depthOptions }) {
  let size = '';
  let depth = '';
  if (value) {
    if (value.includes('|')) {
      [size, depth] = value.split('|');
    } else if (value.includes('/')) {
      const parts = value.split('/');
      if (parts.length > 2) {
        depth = parts.pop();
        size = parts.join('/');
      } else {
        [size, depth] = parts;
      }
    } else {
      size = value;
    }
  }
  const [customTarget, setCustomTarget] = useState(null);

  const handleSizeChange = (newSize) => {
    if (!newSize && !depth) onChange('');
    else onChange(`${newSize}|${depth}`);
  };

  const handleDepthChange = (newDepth) => {
    if (!size && !newDepth) onChange('');
    else onChange(`${size}|${newDepth}`);
  };

  const handleSelectChange = (e, type) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setCustomTarget(type);
    } else {
      if (type === 'size') handleSizeChange(val);
      else handleDepthChange(val);
    }
  };

  const hasSizeOption = sizeOptions.includes(size);
  const hasDepthOption = depthOptions.includes(depth);

  return (
    <>
      <div className="flex flex-col w-full">
        <label className="text-xs font-bold text-slate-600 mb-1">{label}</label>
        <div className="relative flex items-center w-full border border-slate-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden h-10">
          {/* 시각적 레이어 (가운데 정렬 및 드롭다운 아이콘) */}
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <div className="flex-1 flex items-center justify-center px-1">
              <span className="text-[16px] sm:text-sm text-black font-semibold truncate">{size}</span>
              <Icon name="chevronDown" className="text-slate-400 ml-0.5" size={14} />
            </div>
            <span className="text-slate-300 font-bold shrink-0">/</span>
            <div className="flex-1 flex items-center justify-center px-1">
              <span className="text-[16px] sm:text-sm text-black font-semibold truncate">{depth}</span>
              <Icon name="chevronDown" className="text-slate-400 ml-0.5" size={14} />
            </div>
          </div>
          {/* 상호작용 레이어 (투명한 실제 select) */}
          <select
            className="flex-1 w-1/2 h-full opacity-0 cursor-pointer appearance-none outline-none"
            value={size}
            onChange={(e) => handleSelectChange(e, 'size')}
          >
            <option value=""></option>
            {sizeOptions.map(o => <option key={o} value={o}>{o}</option>)}
            {size && !hasSizeOption && <option value={size} hidden>{size}</option>}
            <option value="CUSTOM">+ 직접 입력</option>
          </select>
          <select
            className="flex-1 w-1/2 h-full opacity-0 cursor-pointer appearance-none outline-none"
            value={depth}
            onChange={(e) => handleSelectChange(e, 'depth')}
          >
            <option value=""></option>
            {depthOptions.map(o => <option key={o} value={o}>{o}</option>)}
            {depth && !hasDepthOption && <option value={depth} hidden>{depth}</option>}
            <option value="CUSTOM">+ 직접 입력</option>
          </select>
        </div>
      </div>
      {customTarget && (
        <TextInputModal
          confirmLabel="적용"
          initialValue={customTarget === 'size' ? (hasSizeOption ? '' : size) : (hasDepthOption ? '' : depth)}
          label={customTarget === 'size' ? '드릴 사이즈 입력' : '깊이 입력'}
          onCancel={() => setCustomTarget(null)}
          onConfirm={(val) => {
            if (customTarget === 'size') handleSizeChange(val);
            else handleDepthChange(val);
            setCustomTarget(null);
          }}
          placeholder="수치를 직접 입력하세요"
          title="직접 입력"
          titleId={`custom-input-${customTarget}`}
        />
      )}
    </>
  );
}

export default function ChartInputForm({ data = {}, customer = {}, onChange }) {
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

  const [activeAccordion, setActiveAccordion] = useState(null);
  const toggleAccordion = (id) => setActiveAccordion(prev => prev === id ? null : id);

  // 분수 키패드 상태 관리
  const [keypad, setKeypad] = useState({ isOpen: false, field: null, value: '', title: '', mode: 'fraction' });
  const openKeypad = (field, value, title, mode = 'fraction') => {
    setKeypad({ isOpen: true, field, value, title, mode });
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
  const firstLabel = isLeft ? "약지" : "중지";
  const secondLabel = isLeft ? "중지" : "약지";
  const firstPitch = isLeft ? ringPitch : midPitch;
  const secondPitch = isLeft ? midPitch : ringPitch;

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

    // ✨ 중지(Middle)를 먼저 입력할 때: 약지(Ring)가 비어있다면 자동 완성
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

    // ✨ 약지(Ring)를 먼저 입력할 때: 중지(Middle)가 비어있다면 자동 완성
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

  const updateFirst = isLeft ? updateRing : updateMid;
  const updateSecond = isLeft ? updateMid : updateRing;

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
    if (pitch.extraLine) parts.push(pitch.extraLine); // ✨ 제조사 요약 추가
    if (pitch.holeCutSize) parts.push(`H/C ${pitch.holeCutSize}`);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const getSpanSummary = () => {
    const parts = [];
    if (spanLeft) parts.push(`${firstLabel} ${spanLeft}`);
    if (spanRight) parts.push(`${secondLabel} ${spanRight}`);
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

  return (
    <div className="w-full flex flex-col gap-2.5 pb-6">
      <div className="relative flex items-center justify-center p-2.5 bg-slate-50 rounded-lg shadow-sm border border-slate-200 min-h-[50px]">
        <div className="absolute left-3 flex items-center"><h3 className="font-bold text-base text-indigo-900 shrink-0 whitespace-nowrap">{isLeft ? '왼손' : '오른손'}</h3></div>
        <div className="flex bg-slate-200 rounded-md p-1 border border-slate-300">
          <button className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${!isThumbless ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => onChange({ ...data, isThumbless: false })}>쓰리핑거</button>
          <button className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${isThumbless ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => onChange({ ...data, isThumbless: true })}>덤리스</button>
        </div>
      </div>

      {renderSection('hand', '핸드 컨디션', getHandCondSummary(handCondition), (
        <div className="grid grid-cols-3 gap-2">
          <ChartSelectField label="건/습" value={handCondition.moisture} onChange={v => updateCondition('moisture', v)} options={MOISTURE_OPTIONS} />
          <ChartSelectField label="중약지" value={handCondition.fingerStiffness} onChange={v => updateCondition('fingerStiffness', v)} options={STIFFNESS_OPTIONS} />
          <ChartSelectField label="엄지" value={handCondition.thumbStiffness} onChange={v => updateCondition('thumbStiffness', v)} options={STIFFNESS_OPTIONS} />
        </div>
      ))}

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

      {renderSection('first', firstLabel, getFingerSummary(firstPitch), (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5"><ChartSelectField label="Reverse (▲)" value={firstPitch.up} onChange={v => updateFirst('up', v)} options={PITCH_OPTIONS_32} /><ChartSelectField label="Forward (▼)" value={firstPitch.down} onChange={v => updateFirst('down', v)} options={PITCH_OPTIONS_32} /><ChartSelectField label="Lateral" value={firstPitch.lat} onChange={v => updateFirst('lat', v)} options={PITCH_OPTIONS_32} /><ChartSelectField label="Lateral 방향" value={firstPitch.latDir} onChange={v => updateFirst('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
          {/* ✨ 제조사 필드 추가 및 4열(sm:grid-cols-4) 그리드로 확장 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ChartSelectField allowCustom label="인서트 사이즈" value={firstPitch.insertSize} onChange={v => updateFirst('insertSize', v)} options={FINGER_INSERT_OPTIONS} />
            <ChartSelectField allowCustom label="팁 종류" value={firstPitch.tipType} onChange={v => updateFirst('tipType', v)} options={TIP_OPTIONS} />
            <ChartSelectField allowCustom label="제조사" value={firstPitch.extraLine} onChange={v => updateFirst('extraLine', v)} options={MANUFACTURER_OPTIONS} />
            <ChartSelectField allowCustom label="홀컷 사이즈" value={firstPitch.holeCutSize} onChange={v => updateFirst('holeCutSize', v)} options={FINGER_HOLE_CUT_OPTIONS} />
          </div>
        </>
      ))}

      {renderSection('second', secondLabel, getFingerSummary(secondPitch), (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5"><ChartSelectField label="Reverse (▲)" value={secondPitch.up} onChange={v => updateSecond('up', v)} options={PITCH_OPTIONS_32} /><ChartSelectField label="Forward (▼)" value={secondPitch.down} onChange={v => updateSecond('down', v)} options={PITCH_OPTIONS_32} /><ChartSelectField label="Lateral" value={secondPitch.lat} onChange={v => updateSecond('lat', v)} options={PITCH_OPTIONS_32} /><ChartSelectField label="Lateral 방향" value={secondPitch.latDir} onChange={v => updateSecond('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
          {/* ✨ 제조사 필드 추가 및 4열(sm:grid-cols-4) 그리드로 확장 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ChartSelectField allowCustom label="인서트 사이즈" value={secondPitch.insertSize} onChange={v => updateSecond('insertSize', v)} options={FINGER_INSERT_OPTIONS} />
            <ChartSelectField allowCustom label="팁 종류" value={secondPitch.tipType} onChange={v => updateSecond('tipType', v)} options={TIP_OPTIONS} />
            <ChartSelectField allowCustom label="제조사" value={secondPitch.extraLine} onChange={v => updateSecond('extraLine', v)} options={MANUFACTURER_OPTIONS} />
            <ChartSelectField allowCustom label="홀컷 사이즈" value={secondPitch.holeCutSize} onChange={v => updateSecond('holeCutSize', v)} options={FINGER_HOLE_CUT_OPTIONS} />
          </div>
        </>
      ))}

        {renderSection('span', 'Span', getSpanSummary(), (
          <>
          <div className="mb-2.5"><ChartSelectField label="Span 타입" value={spanType} onChange={v => onChange({ ...data, spanType: v })} options={SPAN_TYPE_OPTIONS} /></div>
          <div className="grid grid-cols-2 gap-2.5">
            <ChartKeypadField label={`${firstLabel} Span`} onOpen={() => openKeypad('spanLeft', spanLeft, `${firstLabel} Span`)} value={spanLeft} />
            <ChartKeypadField label={`${secondLabel} Span`} onOpen={() => openKeypad('spanRight', spanRight, `${secondLabel} Span`)} value={spanRight} />
          </div>
          </>
        ))}

      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${!isThumbless ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0 flex flex-col gap-2.5">
        {renderSection('thumb', 'Thumb', getThumbSummary(thumbPitch, thumbDetails, ovalAngle, thumbOffset), (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <ChartSelectField label="Forward (▲)" value={thumbPitch.up} onChange={v => updateThumb('up', v)} options={PITCH_OPTIONS_32} />
            <ChartSelectField label="Reverse (▼)" value={thumbPitch.down} onChange={v => updateThumb('down', v)} options={PITCH_OPTIONS_32} />
            <ChartSelectField label="Left (◀)" value={thumbPitch.left} onChange={v => updateThumb('left', v)} options={PITCH_OPTIONS_32} />
            <ChartSelectField label="Right (▶)" value={thumbPitch.right} onChange={v => updateThumb('right', v)} options={PITCH_OPTIONS_32} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <ChartSelectField label="Offset - Left" value={thumbOffset.left} onChange={v => updateThumbOffset('left', v)} options={OFFSET_OPTIONS} />
            <ChartSelectField label="Offset - Right" value={thumbOffset.right} onChange={v => updateThumbOffset('right', v)} options={OFFSET_OPTIONS} />
          </div>
          <h4 className="font-bold text-sm mb-2 text-slate-700">상세 사이즈 및 각도</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ChartSelectField allowCustom label="원홀" value={thumbDetails.holeSize} onChange={v => updateThumbDetails('holeSize', v)} options={HOLE_OPTIONS} />
            <ChartSelectField allowCustom label="오발 사이즈" value={thumbDetails.ovalSize} onChange={v => updateThumbDetails('ovalSize', v)} options={dynamicOvalOptions} />
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
        ))}
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