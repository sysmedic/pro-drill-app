import { useState } from 'react';
import DisclosureSection from '../../components/ui/DisclosureSection.jsx';
import KeypadField from '../../components/ui/KeypadField.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
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

const FORM_DENSITY = 'compact';

function ChartSelectField(props) {
  return <SelectField density={FORM_DENSITY} {...props} />;
}

function ChartKeypadField(props) {
  return <KeypadField density={FORM_DENSITY} {...props} />;
}

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5"><ChartSelectField label="Reverse (▲)" value={firstPitch.up} onChange={v => updateFirst('up', v)} options={PITCH_OPTIONS} /><ChartSelectField label="Forward (▼)" value={firstPitch.down} onChange={v => updateFirst('down', v)} options={PITCH_OPTIONS} /><ChartSelectField label="Lateral" value={firstPitch.lat} onChange={v => updateFirst('lat', v)} options={PITCH_OPTIONS} /><ChartSelectField label="Lateral 방향" value={firstPitch.latDir} onChange={v => updateFirst('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
          <div className="grid grid-cols-2 gap-2.5"><ChartSelectField allowCustom label="인서트 사이즈" value={firstPitch.insertSize} onChange={v => updateFirst('insertSize', v)} options={FINGER_INSERT_OPTIONS} /><ChartSelectField allowCustom label="팁 종류" value={firstPitch.tipType} onChange={v => updateFirst('tipType', v)} options={TIP_OPTIONS} /></div>
        </>
      ))}

      {renderSection('second', secondLabel, getFingerSummary(secondPitch), (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5"><ChartSelectField label="Reverse (▲)" value={secondPitch.up} onChange={v => updateSecond('up', v)} options={PITCH_OPTIONS} /><ChartSelectField label="Forward (▼)" value={secondPitch.down} onChange={v => updateSecond('down', v)} options={PITCH_OPTIONS} /><ChartSelectField label="Lateral" value={secondPitch.lat} onChange={v => updateSecond('lat', v)} options={PITCH_OPTIONS} /><ChartSelectField label="Lateral 방향" value={secondPitch.latDir} onChange={v => updateSecond('latDir', v)} options={LATERAL_DIR_OPTIONS} /></div>
          <div className="grid grid-cols-2 gap-2.5"><ChartSelectField allowCustom label="인서트 사이즈" value={secondPitch.insertSize} onChange={v => updateSecond('insertSize', v)} options={FINGER_INSERT_OPTIONS} /><ChartSelectField allowCustom label="팁 종류" value={secondPitch.tipType} onChange={v => updateSecond('tipType', v)} options={TIP_OPTIONS} /></div>
        </>
      ))}

      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${!isThumbless ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0 flex flex-col gap-2.5">
        {renderSection('span', 'Span', getSpanSummary(), (
          <>
          <div className="mb-2.5"><ChartSelectField label="Span 타입" value={spanType} onChange={v => onChange({ ...data, spanType: v })} options={SPAN_TYPE_OPTIONS} /></div>
          <div className="grid grid-cols-2 gap-2.5">
            <ChartKeypadField label={`${firstLabel} Span`} onOpen={() => openKeypad('spanLeft', spanLeft, `${firstLabel} Span`)} value={spanLeft} />
            <ChartKeypadField label={`${secondLabel} Span`} onOpen={() => openKeypad('spanRight', spanRight, `${secondLabel} Span`)} value={spanRight} />
          </div>
          </>
        ))}

        {renderSection('thumb', 'Thumb', getThumbSummary(thumbPitch, thumbDetails, ovalAngle), (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <ChartSelectField label="Forward (▲)" value={thumbPitch.up} onChange={v => updateThumb('up', v)} options={PITCH_OPTIONS} />
            <ChartSelectField label="Reverse (▼)" value={thumbPitch.down} onChange={v => updateThumb('down', v)} options={PITCH_OPTIONS} />
            <ChartSelectField label="Left (◀)" value={thumbPitch.left} onChange={v => updateThumb('left', v)} options={PITCH_OPTIONS} />
            <ChartSelectField label="Right (▶)" value={thumbPitch.right} onChange={v => updateThumb('right', v)} options={PITCH_OPTIONS} />
          </div>
          <h4 className="font-bold text-sm mb-2 text-slate-700">상세 사이즈 및 각도</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ChartSelectField allowCustom label="원홀" value={thumbDetails.holeSize} onChange={v => updateThumbDetails('holeSize', v)} options={HOLE_OPTIONS} />
            <ChartSelectField allowCustom label="오발 사이즈" value={thumbDetails.ovalSize} onChange={v => updateThumbDetails('ovalSize', v)} options={OVAL_OPTIONS} />
            <ChartKeypadField label="오발 각도" onOpen={() => openKeypad('ovalAngle', ovalAngle, '오발 각도')} placeholder="숫자만" value={ovalAngle} />
            <ChartSelectField allowCustom label="덤 타입" value={thumbDetails.slugType} onChange={v => updateThumbDetails('slugType', v)} options={THUMB_TYPE_OPTIONS} />
          </div>
          </>
        ))}
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
