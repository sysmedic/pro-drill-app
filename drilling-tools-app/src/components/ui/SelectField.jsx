import React, { useId } from 'react';
import { cn } from './classNames.js';

const controlClasses = {
  default: 'h-[46px] w-full rounded-lg p-2.5 text-base focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs transition-all disabled:cursor-not-allowed disabled:text-slate-400',
  compact: 'h-10 w-full rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs transition-all disabled:cursor-not-allowed disabled:text-slate-400',
};

const labelClasses = {
  default: 'text-sm font-bold text-slate-600 mb-1.5',
  compact: 'text-xs font-bold text-slate-600 mb-1',
};

const getOptionValue = (option) => (typeof option === 'object' ? option.value : option);
const getOptionLabel = (option) => (typeof option === 'object' ? option.label : option);

function SelectField({
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
  displayValue = null,
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
  // disabled 상태여도 필수 누락(isRequiredMissing)인 경우 황색 알림 배경과 테두리를 일관되게 유지
  const stateBorderAndBgStyle = isRequiredMissing
    ? 'border border-amber-300 bg-amber-50'
    : disabled
    ? 'border border-slate-200 bg-slate-100'
    : 'border border-slate-300 bg-white';

  const isPlaceholderActive = !currentValue && Boolean(placeholder);

  const textStyleClass = (isAutoShaded || isPlaceholderActive || disabled)
    ? 'text-slate-400 font-normal'
    : 'text-slate-900 font-semibold';

  const combinedStyle = (isAutoShaded || isPlaceholderActive || disabled)
    ? { color: '#94a3b8', fontWeight: '400', ...style }
    : { color: '#0f172a', fontWeight: '600', ...style };

  const hasDisplayValue = displayValue !== null && displayValue !== undefined;

  return (
    <div className={cn('flex flex-col w-full relative', className)}>
      {label && (
        <label className={cn(labelClass, labelClassName, isRequiredMissing && 'text-amber-800 font-extrabold')} htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative w-full">
        {hasDisplayValue && (
          <div
            className={cn(
              baseControlClass,
              textStyleClass,
              controlClassName,
              'absolute inset-0 pointer-events-none flex items-center justify-center pr-6 bg-transparent border-transparent shadow-none'
            )}
            style={combinedStyle}
          >
            <span className="truncate">{displayValue}</span>
          </div>
        )}
        <select
          className={cn(
            baseControlClass,
            stateBorderAndBgStyle,
            hasDisplayValue ? 'text-transparent' : textStyleClass,
            controlClassName
          )}
          disabled={disabled}
          id={id}
          onChange={handleChange}
          style={hasDisplayValue ? { ...combinedStyle, color: 'transparent' } : combinedStyle}
          value={currentValue}
          {...props}
        >
          {/* 📌 [지공사님 핵심 지침 100% 반영]: 팝업 스크롤 오픈 시 빈칸 상태 유지를 위한 상단 빈칸/공란 옵션 상시 제공 */}
          {placeholder !== false && (
            <option value="" className="text-slate-400 font-normal bg-white">
              {placeholder || ''}
            </option>
          )}
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
    </div>
  );
}

export default React.memo(SelectField);
