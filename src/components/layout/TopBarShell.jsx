import { cn } from '../ui/classNames.js';
import PageShell from './PageShell.jsx';

const topBarClass = 'bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 border-b-[4px] border-b-slate-300';
const { FIXED_SURFACE_WIDTH_CLASS, LAYER_CLASS } = PageShell.tokens;

export default function TopBarShell({ children, className = '', fixed = false }) {
  const bar = (
    <div
      className={cn(
        topBarClass,
        fixed
          ? cn('fixed top-2 p-3 sm:p-4', FIXED_SURFACE_WIDTH_CLASS, LAYER_CLASS.topBar)
          : cn('sticky top-2 mb-4 sm:mb-6 w-full p-3 sm:p-4', LAYER_CLASS.stickyTopBar),
        className,
      )}
    >
      {children}
    </div>
  );

  if (!fixed) return bar;

  return (
    <>
      <div className="h-[64px] sm:h-[76px] mb-4 sm:mb-6 w-full shrink-0" aria-hidden="true" />
      {bar}
    </>
  );
}
