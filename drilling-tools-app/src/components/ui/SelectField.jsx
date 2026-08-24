import React, { useId } from 'react';
import { cn } from './classNames.js';

const controlClasses = {
  default: 'h-[46px] w-full rounded-lg p-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-all disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:border-slate-200',
  compact: 'h-10 w-full rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-all disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:border-slate-200',
};

const labelClasses = {
  default: 'text-sm font-bold text-slate-600 mb-1.5',
  compact: 'text-xs font-bold text-slate-600 mb-1',
};

const getOptionValue = (option) => (typeof option === 'object' ? option.value : option);
const getOptionLabel = (option) => (typeof option === 'object' ? option.label : option);

export default function SelectField({
  className = '',
  controlClassName = '',
  density = 'default',
  isRequiredMissing = false,
  isAutoShaded = false,
  label,
  labelClassName = '',
  onChange,
  options = [],
  placeholder = '',
  value,
  style = {},
  disabled = false,
  ...props
}) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const currentValue = value || '';
  const baseControlClass = controlClasses[density] || controlClasses.default;
  const labelClass = labelClasses[density] || labelClasses.default;

  const handleChange = (event) => {
    onChange(event.target.value);
  };

  // 📌 [삼항 분리 완전 완치]: border-slate-300와 border-amber-300의 Tailwind CSS 덮어쓰기 충돌 100% 제거
  // 데스크탑/iOS/안드로이드 크로스플랫폼 100% 동일하게 부드럽고 선명한 은은한 파스텔 주황 피팅
  const stateBorderAndBgStyle = isRequiredMissing && !disabled
    ? 'border border-amber-300 bg-amber-50'
    : 'border border-slate-300 bg-white';

  const isPlaceholderActive = !currentValue && Boolean(placeholder);

  const textStyleClass = (isAutoShaded || isPlaceholderActive || disabled)
    ? 'text-slate-400 font-normal'
    : 'text-slate-900 font-semibold';

  const combinedStyle = (isAutoShaded || isPlaceholderActive || disabled)
    ? { color: '#94a3b8', fontWeight: '400', ...style }
    : { color: '#0f172a', fontWeight: '600', ...style };

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {label && (
        <label className={cn(labelClass, labelClassName, isRequiredMissing && !disabled && 'text-amber-800 font-extrabold')} htmlFor={id}>
          {label}
        </label>
      )}
      <select
        className={cn(baseControlClass, stateBorderAndBgStyle, textStyleClass, controlClassName)}
        disabled={disabled}
        id={id}
        onChange={handleChange}
        style={combinedStyle}
        value={currentValue}
        {...props}
      >
        <option value="" className="text-slate-400 font-normal bg-white">
          {placeholder || ''}
        </option>
        {options.map((option) => {
          const optionValue = getOptionValue(option);
          const optionLabel = getOptionLabel(option);
          return (
            <option key={optionValue} value={optionValue} className="text-slate-900 font-semibold bg-white">
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}
