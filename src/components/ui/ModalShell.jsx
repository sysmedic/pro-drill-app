import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { IconButton } from './Button.jsx';
import { cn } from './classNames.js';

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-[540px]',
  xl: 'max-w-[768px]',
};

const headerVariants = {
  dark: 'bg-slate-800 text-white',
  light: 'bg-white text-slate-800 border-b border-slate-200',
  memo: 'bg-yellow-200 text-yellow-800 border-b border-yellow-300',
};

export default function ModalShell({
  align = 'center',
  bodyClassName = '',
  children,
  className = '',
  footer,
  footerClassName = '',
  headerClassName = '',
  icon,
  initialFocusSelector,
  onClose,
  size = 'sm',
  title,
  titleId,
  variant = 'dark',
  zClassName = 'z-[120]',
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previousFocusableElement = document.activeElement;

    const focusTimer = setTimeout(() => {
      if (!panelRef.current) return;
      const initialElement = initialFocusSelector ? panelRef.current.querySelector(initialFocusSelector) : null;
      const firstFocusableElement = panelRef.current.querySelector(focusableSelector);
      const target = initialElement || firstFocusableElement;
      if (target) target.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = [...panelRef.current.querySelectorAll(focusableSelector)];
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusableElement && typeof previousFocusableElement.focus === 'function') {
        previousFocusableElement.focus();
      }
    };
  }, [initialFocusSelector, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 flex justify-center bg-black/60 backdrop-blur-sm animate-fade-in',
        align === 'bottom' ? 'items-end sm:items-center p-0 sm:p-4' : 'items-center px-4',
        zClassName,
      )}
      onClick={onClose}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn('w-full overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-scale-up border border-slate-200', sizes[size], className)}
        onClick={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
      >
        <div className={cn('flex items-center justify-between px-5 py-4', headerVariants[variant], headerClassName)}>
          <span id={titleId} className="font-black text-lg flex items-center gap-2">
            {icon && <Icon name={icon} size={18} />}
            {title}
          </span>
          <IconButton
            aria-label={`${title} 닫기`}
            className={variant === 'dark' ? 'text-slate-400 hover:text-white' : ''}
            icon="close"
            onClick={onClose}
            size="xs"
            variant="plain"
          />
        </div>

        <div className={bodyClassName}>{children}</div>
        {footer && <div className={footerClassName}>{footer}</div>}
      </div>
    </div>
  );
}
