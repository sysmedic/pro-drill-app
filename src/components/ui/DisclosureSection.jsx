import { useId } from 'react';
import Icon from './Icon.jsx';
import { cn } from './classNames.js';

const densityClasses = {
  default: {
    section: 'rounded-xl',
    trigger: 'p-4',
    title: 'text-lg',
    summary: 'text-[11px] px-2 py-1 max-w-[150px] sm:max-w-[200px]',
    iconSize: 18,
    body: 'p-4',
  },
  compact: {
    section: 'rounded-lg',
    trigger: 'px-3 py-2.5',
    title: 'text-base',
    summary: 'text-[10px] px-1.5 py-0.5 max-w-[130px] sm:max-w-[180px]',
    iconSize: 16,
    body: 'p-3',
  },
};

export default function DisclosureSection({
  children,
  className = '',
  density = 'default',
  id,
  isOpen,
  onToggle,
  summary,
  title,
}) {
  const contentId = useId();
  const styles = densityClasses[density] || densityClasses.default;

  return (
    <section className={cn('transition duration-300 overflow-hidden border', styles.section, isOpen ? 'shadow-md border-indigo-300' : 'shadow-sm border-slate-200', className)} id={id}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex justify-between items-center focus:outline-none transition-colors border-b',
          styles.trigger,
          isOpen
            ? 'bg-indigo-50 border-indigo-100'
            : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border-transparent hover:border-slate-200',
        )}
        onClick={onToggle}
        type="button"
      >
        <h3 className={cn('font-bold shrink-0', styles.title, isOpen ? 'text-indigo-900' : 'text-slate-800')}>
          {title}
        </h3>
        <div className="flex items-center justify-end gap-2 overflow-hidden ml-3">
          {!isOpen && summary && (
            <span className={cn('font-bold text-slate-500 bg-white rounded-md border border-slate-200 truncate', styles.summary)}>
              {summary}
            </span>
          )}
          <Icon className={cn('text-slate-400 transform transition-transform duration-300', isOpen && 'rotate-180')} name="chevronDown" size={styles.iconSize} />
        </div>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
        id={contentId}
      >
        <div className="overflow-hidden min-h-0 bg-white">
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </section>
  );
}
