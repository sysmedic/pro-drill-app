import React, { useId } from 'react';
import { cn } from './classNames.js';

const buttonClasses = {
  default: 'h-[46px] w-full rounded-lg p-2.5 text-base font-semibold text-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-all',
  compact: 'h-10 w-full rounded-md px-2 py-1.5 text-sm font-semibold text-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-all',
};

const labelClasses = {
  default: 'text-sm font-bold text-slate-600 mb-1.5',
  compact: 'text-xs font-bold text-slate-600 mb-1',
};

export default function KeypadField({
  buttonClassName = '',
  className = '',
  density = 'default',
  isRequiredMissing = false,
  label,
  labelClassName = '',
  onOpen,
  placeholder = '입력',
  value,
}) {
  const id = useId();
  const baseButtonClass = buttonClasses[density] || buttonClasses.default;
  const labelClass = labelClasses[density] || labelClasses.default;

  // 📌 [삼항 분리 완전 완치]: border-slate-300와 border-amber-300의 Tailwind CSS 덮어쓰기 충돌 100% 제거
  // 데스크탑/iOS/안드로이드 크로스플랫폼 100% 동일하게 부드럽고 선명한 은은한 파스텔 주황 피팅
  const stateBorderAndBgStyle = isRequiredMissing
    ? 'border border-amber-300 bg-amber-50 text-slate-900 font-semibold'
    : 'border border-slate-300 bg-white';

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {label && (
        <label className={cn(labelClass, labelClassName, isRequiredMissing && 'text-amber-800 font-extrabold')} htmlFor={id}>
          {label}
        </label>
      )}
      <button
        aria-label={label}
        className={cn(baseButtonClass, stateBorderAndBgStyle, buttonClassName)}
        id={id}
        onClick={onOpen}
        type="button"
      >
        {value || <span className="text-slate-400 font-normal">{placeholder}</span>}
      </button>
    </div>
  );
}
