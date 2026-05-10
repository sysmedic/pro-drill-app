import { useId } from 'react';
import { cn } from './classNames.js';

export const selectFieldControlClass = 'h-[46px] w-full border border-slate-300 rounded-lg bg-white p-2.5 text-base text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500';

const getOptionValue = (option) => (typeof option === 'object' ? option.value : option);
const getOptionLabel = (option) => (typeof option === 'object' ? option.label : option);

export default function SelectField({
  allowCustom = false,
  className = '',
  controlClassName = '',
  customLabel = '+ 직접 입력',
  customPrompt,
  label,
  labelClassName = '',
  onChange,
  options,
  value,
  ...props
}) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const currentValue = value || '';
  const hasCurrentOption = options.some((option) => getOptionValue(option) === currentValue);

  const handleChange = (event) => {
    const nextValue = event.target.value;

    if (allowCustom && nextValue === 'CUSTOM') {
      const customValue = window.prompt(customPrompt || `${label || '항목'} 수치를 직접 입력하세요:`);
      if (customValue && customValue.trim() !== '') {
        onChange(customValue);
      }
      return;
    }

    onChange(nextValue);
  };

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {label && (
        <label className={cn('text-sm font-bold text-slate-600 mb-1.5', labelClassName)} htmlFor={id}>
          {label}
        </label>
      )}
      <select className={cn(selectFieldControlClass, controlClassName)} id={id} onChange={handleChange} value={currentValue} {...props}>
        <option value=""></option>
        {options.map((option) => {
          const optionValue = getOptionValue(option);
          const optionLabel = getOptionLabel(option);
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
        {allowCustom && currentValue && !hasCurrentOption && currentValue !== 'CUSTOM' && <option value={currentValue} hidden>{currentValue}</option>}
        {allowCustom && <option value="CUSTOM">{customLabel}</option>}
      </select>
    </div>
  );
}
