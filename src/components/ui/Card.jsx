import { forwardRef } from 'react';
import PageShell from '../layout/PageShell.jsx';
import { cn } from './classNames.js';

const { GPU_SURFACE_CLASS, PAGE_SURFACE_CLASS, LAYER_CLASS } = PageShell.tokens;

const elevationClasses = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  none: '',
};

const paddingClasses = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  chart: 'p-2 pb-6 sm:p-6 sm:pb-8',
};

const radiusClasses = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

const Card = forwardRef(function Card({
  as: Component = 'div',
  children,
  className = '',
  constrained = false,
  elevation = 'sm',
  gpu = false,
  interactive = false,
  layer = 'none',
  onClick,
  onKeyDown,
  padding = 'none',
  radius = '2xl',
  role,
  tabIndex,
  ...props
}, ref) {
  const isKeyboardInteractive = interactive && Component === 'div' && typeof onClick === 'function';
  const handleKeyDown = (event) => {
    if (onKeyDown) onKeyDown(event);
    if (!isKeyboardInteractive || event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event);
    }
  };
  const componentProps = Component === 'button' && props.type === undefined ? { type: 'button' } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        'bg-white border border-slate-200',
        constrained && PAGE_SURFACE_CLASS,
        radiusClasses[radius],
        elevationClasses[elevation],
        paddingClasses[padding],
        LAYER_CLASS[layer],
        gpu && GPU_SURFACE_CLASS,
        interactive && 'cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md active:scale-[0.98]',
        className,
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role ?? (isKeyboardInteractive ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isKeyboardInteractive ? 0 : undefined)}
      {...props}
      {...componentProps}
    >
      {children}
    </Component>
  );
});

export default Card;
