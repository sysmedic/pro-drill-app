import { useId } from 'react';
import { cn } from './classNames.js';

export const fieldControlClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-[16px] sm:text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:font-medium placeholder:text-slate-400 shadow-sm transition-all';

export default function Field({
  as = 'input',
  children,
  className = '',
  controlClassName = '',
  label,
  labelClassName = '',
  ...props
}) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const Component = as;

  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <label className={cn('block text-xs font-bold text-slate-500 mb-1.5 ml-1', labelClassName)} htmlFor={id}>
          {label}
        </label>
      )}
      <Component className={cn(fieldControlClass, controlClassName)} id={id} {...props}>
        {children}
      </Component>
    </div>
  );
}
