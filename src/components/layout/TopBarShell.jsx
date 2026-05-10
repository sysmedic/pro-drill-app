import { cn } from '../ui/classNames.js';
import PageShell from './PageShell.jsx';

const { FIXED_SURFACE_WIDTH_CLASS, LAYER_CLASS } = PageShell.tokens;

const variantClasses = {
  pageHeader: 'bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 border-b-[4px] border-b-slate-300',
  toolbar: 'bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200',
};

const layoutClasses = {
  pageHeader: {
    fixed: 'fixed top-2 p-3 sm:p-4',
    static: 'sticky top-2 mb-4 sm:mb-6 w-full p-3 sm:p-4',
    spacer: 'h-[64px] sm:h-[76px] mb-4 sm:mb-6',
  },
  toolbar: {
    fixed: 'fixed top-2 p-2.5 sm:p-3',
    static: 'sticky top-2 mb-3 sm:mb-4 w-full p-2.5 sm:p-3',
    spacer: 'h-[58px] sm:h-[64px] mb-3 sm:mb-4',
  },
};

export default function TopBarShell({ children, className = '', fixed = false, variant = 'pageHeader' }) {
  const layout = layoutClasses[variant] || layoutClasses.pageHeader;

  const bar = (
    <div
      className={cn(
        variantClasses[variant] || variantClasses.pageHeader,
        fixed
          ? cn(layout.fixed, FIXED_SURFACE_WIDTH_CLASS, LAYER_CLASS.topBar)
          : cn(layout.static, LAYER_CLASS.stickyTopBar),
        className,
      )}
    >
      {children}
    </div>
  );

  if (!fixed) return bar;

  return (
    <>
      <div className={cn(layout.spacer, 'w-full shrink-0')} aria-hidden="true" />
      {bar}
    </>
  );
}
