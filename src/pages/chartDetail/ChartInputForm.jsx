import { useState } from 'react';
import FractionKeypad from './FractionKeypad.jsx';
import {
  FINGER_INSERT_OPTIONS,
  HOLE_OPTIONS,
  LATERAL_DIR_OPTIONS,
  MOISTURE_OPTIONS,
  OVAL_OPTIONS,
  PITCH_OPTIONS,
  SPAN_TYPE_OPTIONS,
  STIFFNESS_OPTIONS,
  THUMB_TYPE_OPTIONS,
  TIP_OPTIONS,
} from './chartOptions.js';

const InputSelect = ({ label, value, onChange, options }) => (
  <div className="flex flex-col w-full">
    {label && <label className="text-sm font-bold text-slate-600 mb-1.5">{label}</label>}
    <select className="h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value=""></option>
      {options.map(o => {
        const val = typeof o === 'object' ? o.value : o;
        const text = typeof o === 'object' ? o.label : o;
        return <option key={val} value={val}>{text}</option>;
      })}
    </select>
  </div>
);

const InputSelectWithCustom = ({ label, value, onChange, options }) => (
  <div className="flex flex-col w-full">
    {label && <label className="text-sm font-bold text-slate-600 mb-1.5">{label}</label>}
    <select className="h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" value={value || ''} onChange={(e) => { if (e.target.value === 'CUSTOM') { const customVal = window.prompt(`${label || "항목"} 수치를 직접 입력하세요:`); if (customVal && customVal.trim() !== '') onChange(customVal); } else { onChange(e.target.value); } }}>
      <option value=""></option>
      {options.map(o => {
        const val = typeof o === 'object' ? o.value : o;
        const text = typeof o === 'object' ? o.label : o;
        return <option key={val} value={val}>{text}</option>;
      })}
      {value && !options.some(o => (typeof o === 'object' ? o.value : o) === value) && value !== 'CUSTOM' && <option value={value} hidden>{value}</option>}
      <option value="CUSTOM">+ 직접 입력</option>
    </select>
  </div>
);

export default function ChartInputForm({ data = {}, onChange }) {
  const isThumbless = data?.isThumbless || false;
  const handedness = data?.handedness || 'right';
  const handCondition = data?.handCondition || {};
  const midPitch = data?.midPitch || {};
  const ringPitch = data?.ringPitch || {};
  const thumbPitch = data?.thumbPitch || {};
  const thumbDetails = data?.thumbDetails || {};
  const bridge = data?.bridge || '';
  const spanType = data?.spanType || '';
  const spanLeft = data?.spanLeft || '';
  const spanRight = data?.spanRight || '';
  const ovalAngle = data?.ovalAngle || '';

  const [activeAccordion, setActiveAccordion] = useState(null);
  const toggleAccordion = (id) => setActiveAccordion(prev => prev === id ? null : id);

  // 분수 키패드 상태 관리
  const [keypad, setKeypad] = useState({ isOpen: false, field: null, value: '', title: '' });
  const openKeypad = (field, value, title) => {
    setKeypad({ isOpen: true, field, value, title });
  };
  const handleKeypadConfirm = (newValue) => {
    onChange({ ...data, [keypad.field]: newValue });
  };

  const isLeft = handedness === 'left';
  const firstLabel = isLeft ? "약지" : "중지";
  const secondLabel = isLeft ? "중지" : "약지";
  const firstPitch = isLeft ? ringPitch : midPitch;
  const secondPitch = isLeft ? midPitch : ringPitch;

  const updateCondition = (key, val) => onChange({ ...data, handCondition: { ...handCondition, [key]: val } });

  const updateMid = (key, val) => {
    let next = { ...midPitch, [key]: val };
    if (key === 'up') next.down = '';
    if (key === 'down') next.up = '';
    if (key === 'lat') {
      if (val !== '' && !next.latDir) next.latDir = isLeft ? 'right' : 'left';
      if (val === '') next.latDir = '';
    }
    onChange({ ...data, midPitch: next });
  };

  const updateRing = (key, val) => {
    let next = { ...ringPitch, [key]: val };
    if (key === 'up') next.down = '';
    if (key === 'down') next.up = '';
    if (key === 'lat') {
      if (val !== '' && !next.latDir) next.latDir = isLeft ? 'left' : 'right';
      if (val === '') next.latDir = '';
    }
    onChange({ ...data, ringPitch: next });
  };

  const updateThumb = (key, val) => {
    let next = { ...thumbPitch, [key]: val };
    if (key === 'up') next.down = '';
    if (key === 'down') next.up = '';
    if (key === 'left') next.right = '';
    if (key === 'right') next.left = '';
    onChange({ ...data, thumbPitch: next });
  };

  const updateThumbDetails = (key, val) => onChange({ ...data, thumbDetails: { ...thumbDetails, [key]: val } });

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
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const getSpanSummary = () => {
    const parts = [];
    if (spanLeft) parts.push(`${firstLabel} ${spanLeft}`);
    if (spanRight) parts.push(`${secondLabel} ${spanRight}`);
    if (spanType) parts.push(spanType);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const getThumbSummary = (pitch, details, angle) => {
    const parts = [];
    if (pitch?.up) parts.push(`Fwd ${pitch.up}`);
    else if (pitch?.down) parts.push(`Rev ${pitch.down}`);
    if (pitch?.left) parts.push(`L ${pitch.left}`);
    else if (pitch?.right) parts.push(`R ${pitch.right}`);
    if (details?.holeSize) parts.push(`원홀 ${details.holeSize}`);
    if (details?.ovalSize) parts.push(`오발 ${details.ovalSize}`);
    if (angle) parts.push(`${angle}°`);
    if (details?.slugType) parts.push(details.slugType);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const AccordionBox = ({ id, title, summary, children }) => (
    <div className={`transition duration-300 rounded-xl overflow-hidden border ${
      activeAccordion === id
        ? 'shadow-md border-indigo-300'
        : 'shadow-sm border-slate-200'
    }`}>
      <button
        className={`w-full flex justify-between items-center p-4 focus:outline-none transition-colors border-b ${
          activeAccordion === id
            ? 'bg-indigo-50 border-indigo-100'
            : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border-transparent hover:border-slate-200'
        }`}
        onClick={() => toggleAccordion(id)}
      >
        <h3 className={`font-bold text-lg shrink-0 ${activeAccordion === id ? 'text-indigo-900' : 'text-slate-800'}`}>
          {title}
        </h3>
        <div className="flex items-center justify-end gap-2 overflow-hidden ml-3">
          {activeAccordion !== id && summary && (
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
              {summary}
            </span>
          )}
          <span className={`text-slate-400 transform transition-transform duration-300 ${activeAccordion === id ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
        activeAccordion === id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}>
        <div className="overflow-hidden min-h-0 bg-white">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-3 pb-8">
      <div className="relative flex items-center justify-center p-3 bg-slate-50 rounded-xl shadow-sm border border-slate-200 min-h-[58px]">
        <div className="absolute left-4 flex items-center"><h3 className="font-bold text-lg text-indigo-900 shrink-0 whitespace-nowrap">{isLeft ? '왼손' : '오른손'}</h3></div>
        <div className="flex bg-slate-200 rounded-md p-1 border border-slate-300">
          <button className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${!isThumbless ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => onChange({ ...data, isThumbless: false })}>쓰리핑거</button>
          <button className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${isThumbless ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => onChange({ ...data, isThumbless: true })}>덤리스</button>
        </div>
      </div>

      <AccordionBox id="hand" title="핸드 컨디션" summary={getHandCondSummary(handCondition)}>
        <div className="grid grid-cols-3 gap-2">
          <InputSelect label="건/습" value={handCondition.moisture} onChange={v => updateCondition('moisture', v)} options={MOISTURE_OPTIONS} />
          <InputSelect label="중약지" value={handCondition.fingerStiffness} onChange={v => updateCondition('fingerStiffness', v)} options={STIFFNESS_OPTIONS} />
          <InputSelect label="엄지" value={handCondition.thumbStiffness} onChange={v => updateCondition('thumbStiffness', v)} options={STIFFNESS_OPTIONS} />
        </div>
      </AccordionBox>

      <AccordionBox id="bridge" title="Bridge" summary={bridge}>
        <div className="flex items-center justify-between gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <label className="text-sm font-bold text-slate-600 whitespace-nowrap">브릿지 간격</label>
          <select
            className="h-[46px] w-full max-w-[200px] border border-slate-300 rounded-lg bg-white p-2.5 text-base text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={bridge || ''}
            onChange={(e) => {
              if (e.target.value === 'CUSTOM') {
                const customVal = window.prompt(`브릿지 수치를 직접 입력하세요:`);
                if (customVal && customVal.trim() !== '') onChange({ ...data, bridge: customVal });
              } else onChange({ ...data, bridge: e.target.value });
            }}
          >
            <option value=""></option>
            {['1/8', '3/16', '1/4'].map(v => <option key={v} value={v}>{v}</option>)}
            {bridge && !['1/8', '3/16', '1/4'].includes(bridge) && bridge !== 'CUSTOM' && <option value={bridge} hidden>{bridge}</option>}
            <option value="CUSTOM">+ 직접 입력</option>
          </select>
        </div>
      </AccordionBox>

      <AccordionBox id="first" title={firstLabel} summary={getFingerSummary(firstPitch)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3"><InputSelect label="Reverse (▲)" value={firstPitch.up} onChange={v => updateFirst('up', v)} options={PITCH_OPTIONS} /><InputSelect label="Forward (▼)" value={firstPitch.down} onChange={v => updateFirst('down', v)} options={PITCH_OPTIONS} /><InputSelect label="Lateral" value={firstPitch.lat} onChange={v => updateFirst('lat', v)} options={PITCH_OPTIONS} /><InputSelect label="Lateral 방향" value={firstPitch.latDir} onChange={v => updateFirst('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
        <div className="grid grid-cols-2 gap-3"><InputSelectWithCustom label="인서트 사이즈" value={firstPitch.insertSize} onChange={v => updateFirst('insertSize', v)} options={FINGER_INSERT_OPTIONS} /><InputSelectWithCustom label="팁 종류" value={firstPitch.tipType} onChange={v => updateFirst('tipType', v)} options={TIP_OPTIONS} /></div>
      </AccordionBox>

      <AccordionBox id="second" title={secondLabel} summary={getFingerSummary(secondPitch)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3"><InputSelect label="Reverse (▲)" value={secondPitch.up} onChange={v => updateSecond('up', v)} options={PITCH_OPTIONS} /><InputSelect label="Forward (▼)" value={secondPitch.down} onChange={v => updateSecond('down', v)} options={PITCH_OPTIONS} /><InputSelect label="Lateral" value={secondPitch.lat} onChange={v => updateSecond('lat', v)} options={PITCH_OPTIONS} /><InputSelect label="Lateral 방향" value={secondPitch.latDir} onChange={v => updateSecond('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
        <div className="grid grid-cols-2 gap-3"><InputSelectWithCustom label="인서트 사이즈" value={secondPitch.insertSize} onChange={v => updateSecond('insertSize', v)} options={FINGER_INSERT_OPTIONS} /><InputSelectWithCustom label="팁 종류" value={secondPitch.tipType} onChange={v => updateSecond('tipType', v)} options={TIP_OPTIONS} /></div>
      </AccordionBox>

      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${!isThumbless ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0 flex flex-col gap-3">
        <AccordionBox id="span" title="Span" summary={getSpanSummary()}>
          <div className="mb-3"><InputSelect label="Span 타입" value={spanType} onChange={v => onChange({ ...data, spanType: v })} options={SPAN_TYPE_OPTIONS} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col"><label className="text-sm font-bold text-slate-600 mb-1.5">{firstLabel} Span</label><button type="button" className="h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base font-semibold text-black text-left focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={() => openKeypad('spanLeft', spanLeft, `${firstLabel} Span`)}>{spanLeft || <span className="text-slate-400 font-normal">입력</span>}</button></div>
            <div className="flex flex-col"><label className="text-sm font-bold text-slate-600 mb-1.5">{secondLabel} Span</label><button type="button" className="h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base font-semibold text-black text-left focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={() => openKeypad('spanRight', spanRight, `${secondLabel} Span`)}>{spanRight || <span className="text-slate-400 font-normal">입력</span>}</button></div>
          </div>
        </AccordionBox>

        <AccordionBox id="thumb" title="Thumb" summary={getThumbSummary(thumbPitch, thumbDetails, ovalAngle)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <InputSelect label="Forward (▲)" value={thumbPitch.up} onChange={v => updateThumb('up', v)} options={PITCH_OPTIONS} />
            <InputSelect label="Reverse (▼)" value={thumbPitch.down} onChange={v => updateThumb('down', v)} options={PITCH_OPTIONS} />
            <InputSelect label="Left (◀)" value={thumbPitch.left} onChange={v => updateThumb('left', v)} options={PITCH_OPTIONS} />
            <InputSelect label="Right (▶)" value={thumbPitch.right} onChange={v => updateThumb('right', v)} options={PITCH_OPTIONS} />
          </div>
          <h4 className="font-bold text-base mb-2 text-slate-700">상세 사이즈 및 각도</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InputSelectWithCustom label="원홀" value={thumbDetails.holeSize} onChange={v => updateThumbDetails('holeSize', v)} options={HOLE_OPTIONS} />
            <InputSelectWithCustom label="오발 사이즈" value={thumbDetails.ovalSize} onChange={v => updateThumbDetails('ovalSize', v)} options={OVAL_OPTIONS} />
            <div className="flex flex-col w-full">
              <label className="text-sm font-bold text-slate-600 mb-1.5">오발 각도</label>
              <button type="button" className="h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base font-semibold text-black text-left focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={() => openKeypad('ovalAngle', ovalAngle, '오발 각도')}>{ovalAngle || <span className="text-slate-400 font-normal">숫자만</span>}</button>
            </div>
            <InputSelectWithCustom label="덤 타입" value={thumbDetails.slugType} onChange={v => updateThumbDetails('slugType', v)} options={THUMB_TYPE_OPTIONS} />
          </div>
        </AccordionBox>
        </div>
      </div>

      <FractionKeypad 
        isOpen={keypad.isOpen}
        initialValue={keypad.value}
        title={keypad.title}
        onClose={() => setKeypad(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleKeypadConfirm}
      />
    </div>
  );
}
