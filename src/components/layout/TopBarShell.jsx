import { useEffect, useRef, useState } from 'react';
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
    spacerFallback: 'h-[64px] sm:h-[76px] mb-4 sm:mb-6',
    spacerGap: 'mb-4 sm:mb-6',
    topOffsetPx: 8,
  },
  toolbar: {
    fixed: 'fixed top-2 p-2.5 sm:p-3',
    static: 'sticky top-2 mb-3 sm:mb-4 w-full p-2.5 sm:p-3',
    spacerFallback: 'h-[58px] sm:h-[64px] mb-3 sm:mb-4',
    spacerGap: 'mb-3 sm:mb-4',
    topOffsetPx: 8,
  },
};

export default function TopBarShell({ children, className = '', fixed = false, variant = 'pageHeader', ...props }) {
  const layout = layoutClasses[variant] || layoutClasses.pageHeader;
  const barRef = useRef(null);
  const [measuredHeight, setMeasuredHeight] = useState(null);

  useEffect(() => {
    if (!fixed || !barRef.current) return undefined;

    const element = barRef.current;
    const updateHeight = () => {
      const nextHeight = Math.ceil(element.getBoundingClientRect().height);
      setMeasuredHeight(prev => prev === nextHeight ? prev : nextHeight);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [fixed, variant]);

  const bar = (
    <div
      className={cn(
        variantClasses[variant] || variantClasses.pageHeader,
        fixed
          ? cn(layout.fixed, FIXED_SURFACE_WIDTH_CLASS, LAYER_CLASS.topBar)
          : cn(layout.static, LAYER_CLASS.stickyTopBar),
        className,
      )}
      data-testid={`${variant}-${fixed ? 'fixed' : 'static'}-topbar`}
      ref={fixed ? barRef : undefined}
      {...props}
    >
      {children}
    </div>
  );

  if (!fixed) return bar;

  return (
    <>
      <div
        className={cn(measuredHeight === null ? layout.spacerFallback : layout.spacerGap, 'w-full shrink-0')}
        aria-hidden="true"
        style={measuredHeight === null ? undefined : { height: `${measuredHeight + layout.topOffsetPx}px` }}
      />
      {bar}
    </>
  );
}
