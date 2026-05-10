import { useId, useState } from 'react';
import { TextInputModal } from './Dialogs.jsx';
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
  const [customInputOpen, setCustomInputOpen] = useState(false);

  const handleChange = (event) => {
    const nextValue = event.target.value;

    if (allowCustom && nextValue === 'CUSTOM') {
      setCustomInputOpen(true);
      return;
    }

    onChange(nextValue);
  };

  return (
    <>
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
      {customInputOpen && (
        <TextInputModal
          confirmLabel="적용"
          initialValue={hasCurrentOption ? '' : currentValue}
          label={label || '직접 입력'}
          onCancel={() => setCustomInputOpen(false)}
          onConfirm={(customValue) => {
            onChange(customValue);
            setCustomInputOpen(false);
          }}
          placeholder={customPrompt || `${label || '항목'} 수치를 직접 입력하세요`}
          title={label ? `${label} 직접 입력` : '직접 입력'}
          titleId={`${id}-custom-input-title`}
        />
      )}
    </>
  );
}
