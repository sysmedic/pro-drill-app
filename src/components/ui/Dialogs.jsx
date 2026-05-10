import { useEffect, useState } from 'react';
import Button from './Button.jsx';
import Field from './Field.jsx';
import Icon from './Icon.jsx';
import ModalShell from './ModalShell.jsx';
import { cn } from './classNames.js';

const toastVariants = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-slate-200 bg-white text-slate-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

const toastIcons = {
  success: 'check',
  danger: 'warning',
  info: 'memo',
  warning: 'warning',
};

export function FeedbackToast({ message, onDismiss, title, tone = 'info' }) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined;
    const timer = window.setTimeout(onDismiss, 2600);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div
      className={cn(
        'fixed left-1/2 top-4 z-[200] flex w-[calc(100%-24px)] max-w-sm -translate-x-1/2 items-start gap-2 rounded-xl border px-4 py-3 shadow-lg animate-fade-in',
        toastVariants[tone] || toastVariants.info,
      )}
      role={role}
    >
      <Icon className="mt-0.5 shrink-0" name={toastIcons[tone] || toastIcons.info} size={17} strokeWidth={2.5} />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-black leading-tight">{title}</p>}
        <p className="text-sm font-bold leading-snug">{message}</p>
      </div>
      {onDismiss && (
        <button
          aria-label="알림 닫기"
          className="ml-1 rounded-md p-1 text-current opacity-60 hover:bg-white/60 hover:opacity-100"
          onClick={onDismiss}
          type="button"
        >
          <Icon name="close" size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export function ConfirmModal({
  cancelLabel = '취소',
  confirmLabel = '확인',
  danger = false,
  message,
  onCancel,
  onConfirm,
  title = '확인',
  titleId = 'confirm-modal-title',
}) {
  return (
    <ModalShell
      bodyClassName="p-5 flex flex-col gap-4 bg-slate-50"
      icon={danger ? 'warning' : 'memo'}
      onClose={onCancel}
      size="sm"
      title={title}
      titleId={titleId}
      zClassName="z-[150]"
    >
      <p className="text-sm font-bold text-slate-700 text-center whitespace-pre-line">{message}</p>
      <div className="flex flex-col gap-2 mt-1">
        <Button className="w-full" onClick={onConfirm} size="lg" variant={danger ? 'danger' : 'primary'}>
          {confirmLabel}
        </Button>
        <Button className="w-full" onClick={onCancel} size="lg" variant="secondary">
          {cancelLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

export function TextInputModal({
  cancelLabel = '취소',
  confirmLabel = '확인',
  initialValue = '',
  label,
  onCancel,
  onConfirm,
  placeholder,
  title = '입력',
  titleId = 'text-input-modal-title',
}) {
  const [value, setValue] = useState(initialValue);
  const trimmedValue = value.trim();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!trimmedValue) return;
    onConfirm(trimmedValue);
  };

  return (
    <ModalShell
      bodyClassName="p-5 bg-slate-50"
      icon="edit"
      initialFocusSelector="input"
      onClose={onCancel}
      size="sm"
      title={title}
      titleId={titleId}
      variant="light"
      zClassName="z-[150]"
    >
      <form onSubmit={handleSubmit}>
        <Field
          label={label}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button className="w-full" onClick={onCancel} size="lg" variant="secondary">
            {cancelLabel}
          </Button>
          <Button className="w-full" disabled={!trimmedValue} size="lg" type="submit" variant="primary">
            {confirmLabel}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
