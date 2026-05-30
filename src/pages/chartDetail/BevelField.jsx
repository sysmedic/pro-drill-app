import { useState } from 'react';
import { TextInputModal } from '../../components/ui/Dialogs.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function BevelField({ label, value, onChange, sizeOptions, depthOptions }) {
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