import Icon from './Icon.jsx';
import { cn } from './classNames.js';

const variants = {
  primary: 'bg-indigo-600 text-white border-indigo-600 shadow-sm hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 active:bg-slate-100',
  subtle: 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm hover:bg-slate-200 active:bg-slate-200',
  danger: 'bg-red-50 text-red-600 border-red-200 shadow-sm hover:bg-red-100 active:bg-red-200',
  plain: 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-800',
};

const sizes = {
  xs: 'h-8 px-2 text-xs rounded-lg gap-1',
  sm: 'h-9 px-2.5 sm:px-3 text-xs sm:text-sm rounded-lg gap-1.5',
  md: 'h-10 px-3 sm:px-4 text-sm sm:text-base rounded-lg gap-1.5',
  lg: 'h-12 px-4 text-base rounded-xl gap-2',
};

export default function Button({
  children,
  className = '',
  icon,
  iconPosition = 'left',
  size = 'md',
  variant = 'secondary',
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap border font-bold leading-none transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      type="button"
      {...props}
    >
      {icon && iconPosition === 'left' && <Icon name={icon} size={size === 'xs' ? 14 : 16} />}
      {children && <span className="leading-none">{children}</span>}
      {icon && iconPosition === 'right' && <Icon name={icon} size={size === 'xs' ? 14 : 16} />}
    </button>
  );
}

export function IconButton({ 'aria-label': ariaLabel, className = '', icon, size = 'md', variant = 'subtle', ...props }) {
  const boxSizes = {
    xs: 'h-8 w-8 rounded-lg',
    sm: 'h-9 w-9 sm:h-10 sm:w-10 rounded-xl',
    md: 'h-10 w-10 rounded-xl',
  };

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap border font-bold leading-none transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        boxSizes[size],
        className,
      )}
      type="button"
      {...props}
    >
      <Icon name={icon} size={size === 'xs' ? 14 : 18} />
    </button>
  );
}
