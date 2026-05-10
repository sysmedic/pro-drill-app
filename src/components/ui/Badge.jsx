import { cn } from './classNames.js';

const variants = {
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  accent: 'bg-indigo-50 text-indigo-600 border-indigo-100',
};

export default function Badge({ children, className = '', variant = 'neutral' }) {
  return (
    <span className={cn('rounded-md border px-2 py-1 text-[10px] sm:text-xs font-bold shadow-sm', variants[variant], className)}>
      {children}
    </span>
  );
}
