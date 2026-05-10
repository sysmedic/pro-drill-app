import { useId } from 'react';
import Icon from './Icon.jsx';
import { cn } from './classNames.js';

export default function DisclosureSection({
  children,
  className = '',
  id,
  isOpen,
  onToggle,
  summary,
  title,
}) {
  const contentId = useId();

  return (
    <section className={cn('transition duration-300 rounded-xl overflow-hidden border', isOpen ? 'shadow-md border-indigo-300' : 'shadow-sm border-slate-200', className)} id={id}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex justify-between items-center p-4 focus:outline-none transition-colors border-b',
          isOpen
            ? 'bg-indigo-50 border-indigo-100'
            : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border-transparent hover:border-slate-200',
        )}
        onClick={onToggle}
        type="button"
      >
        <h3 className={cn('font-bold text-lg shrink-0', isOpen ? 'text-indigo-900' : 'text-slate-800')}>
          {title}
        </h3>
        <div className="flex items-center justify-end gap-2 overflow-hidden ml-3">
          {!isOpen && summary && (
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
              {summary}
            </span>
          )}
          <Icon className={cn('text-slate-400 transform transition-transform duration-300', isOpen && 'rotate-180')} name="chevronDown" size={18} />
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
          <div className="p-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
