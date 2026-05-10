import { useId } from 'react';
import { cn } from './classNames.js';

export const keypadFieldButtonClass = 'h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base font-semibold text-black text-left focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function KeypadField({
  buttonClassName = '',
  className = '',
  label,
  labelClassName = '',
  onOpen,
  placeholder = '입력',
  value,
}) {
  const id = useId();

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {label && (
        <label className={cn('text-sm font-bold text-slate-600 mb-1.5', labelClassName)} htmlFor={id}>
          {label}
        </label>
      )}
      <button
        aria-label={label}
        className={cn(keypadFieldButtonClass, buttonClassName)}
        id={id}
        onClick={onOpen}
        type="button"
      >
        {value || <span className="text-slate-400 font-normal">{placeholder}</span>}
      </button>
    </div>
  );
}
