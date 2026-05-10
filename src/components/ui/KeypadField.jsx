import { useId } from 'react';
import { cn } from './classNames.js';

const buttonClasses = {
  default: 'h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base font-semibold text-black text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
  compact: 'h-10 w-full border border-slate-300 rounded-md bg-white px-2 py-1.5 text-[16px] sm:text-sm font-semibold text-black text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
};

const labelClasses = {
  default: 'text-sm font-bold text-slate-600 mb-1.5',
  compact: 'text-xs font-bold text-slate-600 mb-1',
};

export default function KeypadField({
  buttonClassName = '',
  className = '',
  density = 'default',
  label,
  labelClassName = '',
  onOpen,
  placeholder = '입력',
  value,
}) {
  const id = useId();
  const buttonClass = buttonClasses[density] || buttonClasses.default;
  const labelClass = labelClasses[density] || labelClasses.default;

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {label && (
        <label className={cn(labelClass, labelClassName)} htmlFor={id}>
          {label}
        </label>
      )}
      <button
        aria-label={label}
        className={cn(buttonClass, buttonClassName)}
        id={id}
        onClick={onOpen}
        type="button"
      >
        {value || <span className="text-slate-400 font-normal">{placeholder}</span>}
      </button>
    </div>
  );
}
