import { cn } from '../ui/classNames.js';

const PAGE_MAX_WIDTH_PX = 768;
const PAGE_PADDING_X_PX = { base: 16, sm: 32 };
const PAGE_CONTENT_MAX_WIDTH_PX = PAGE_MAX_WIDTH_PX - PAGE_PADDING_X_PX.sm;
const PAGE_MAX_WIDTH_CLASS = 'max-w-[768px]';
const PAGE_CONTENT_MAX_WIDTH_CLASS = 'max-w-[736px]';
const PAGE_INLINE_PADDING_CLASS = 'p-2 sm:p-4';
const PAGE_BOTTOM_PADDING_CLASS = 'pb-24';
const PAGE_SURFACE_CLASS = cn('w-full', PAGE_MAX_WIDTH_CLASS, 'mx-auto');
const FIXED_SURFACE_WIDTH_CLASS = cn('left-1/2 -translate-x-1/2 w-[calc(100%-16px)] sm:w-[calc(100%-32px)]', PAGE_CONTENT_MAX_WIDTH_CLASS);
const GPU_SURFACE_CLASS = 'transform-gpu [backface-visibility:hidden]';
const LAYER_CLASS = {
  content: 'relative z-40',
  stickyTopBar: 'z-[50]',
  utilityScrim: 'z-[90]',
  utilitySheet: 'z-[100]',
  topBar: 'z-[110]',
};

function PageShell({
  children,
  className = '',
  contentPadding = PAGE_INLINE_PADDING_CLASS,
  bottomPadding = PAGE_BOTTOM_PADDING_CLASS,
  style,
}) {
  return (
    <div
      className={cn(PAGE_SURFACE_CLASS, 'bg-slate-50 min-h-screen relative', contentPadding, bottomPadding, className)}
      style={style}
    >
      {children}
    </div>
  );
}

PageShell.tokens = {
  FIXED_SURFACE_WIDTH_CLASS,
  GPU_SURFACE_CLASS,
  LAYER_CLASS,
  PAGE_BOTTOM_PADDING_CLASS,
  PAGE_CONTENT_MAX_WIDTH_CLASS,
  PAGE_CONTENT_MAX_WIDTH_PX,
  PAGE_INLINE_PADDING_CLASS,
  PAGE_MAX_WIDTH_CLASS,
  PAGE_MAX_WIDTH_PX,
  PAGE_PADDING_X_PX,
  PAGE_SURFACE_CLASS,
};

export default PageShell;
