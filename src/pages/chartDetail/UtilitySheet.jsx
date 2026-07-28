import PageShell from '../../components/layout/PageShell.jsx';
import Button, { IconButton } from '../../components/ui/Button.jsx';
import { cn } from '../../components/ui/classNames.js';

const { LAYER_CLASS, PAGE_CONTENT_SURFACE_CLASS } = PageShell.tokens;

export default function UtilitySheet({ 
  utilityState, 
  setUtilityState, 
  pullStartYRef, 
  onStartShare, 
  isLocked 
}) {
  return (
    <>
      {utilityState === 'expanded' && (
        <button
          type="button"
          aria-label="유틸리티 접기"
          className={cn('fixed inset-0 bg-transparent', LAYER_CLASS.utilityScrim)}
          onClick={() => setUtilityState('collapsed')}
        />
      )}

      <div
        className={cn(
          'fixed bottom-0 left-0 w-full flex justify-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          LAYER_CLASS.utilitySheet,
          utilityState === 'hidden' ? 'translate-y-full opacity-0 pointer-events-none' : (utilityState === 'collapsed' ? 'translate-y-[calc(100%-28px)] opacity-100' : 'translate-y-0 opacity-100'),
          isLocked ? 'pointer-events-none opacity-50 grayscale' : 'pointer-events-auto',
        )}
      >
        <div
          className={cn('bg-white/95 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl border border-slate-200 flex flex-col pb-8 pt-1 relative', PAGE_CONTENT_SURFACE_CLASS)}
          data-testid="utility-sheet-surface"
        >
          <button
            type="button"
            className="w-full min-h-11 pt-2 pb-4 flex justify-center items-center cursor-pointer touch-none focus:outline-none"
            onClick={() => setUtilityState(utilityState === 'expanded' ? 'collapsed' : 'expanded')}
            onTouchStart={(e) => { pullStartYRef.current = e.touches[0].clientY; }}
            onTouchMove={(e) => {
              if (!pullStartYRef.current) return;
              const diff = e.touches[0].clientY - pullStartYRef.current;
              if (diff > 30) { setUtilityState('collapsed'); pullStartYRef.current = null; }
              else if (diff < -30) { setUtilityState('expanded'); pullStartYRef.current = null; }
            }}
            onTouchEnd={() => { pullStartYRef.current = null; }}
          >
            <span className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </button>

          <div className={`px-4 transition-opacity duration-300 ${utilityState === 'expanded' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex justify-between items-center px-2 mb-2">
              <span className="text-xs font-black text-slate-500 tracking-wider">유틸리티 도구</span>
              <IconButton aria-label="유틸리티 닫기" icon="close" onClick={() => setUtilityState('hidden')} size="xs" variant="plain" />
            </div>

            <div className="flex items-center flex-wrap gap-2 w-full pb-1">
              {/* 🎯 [중복 청소 완료]: NFC 쓰기 버튼을 완전히 들어내고 오직 공유 버튼만 깔끔하게 보존 */}
              <Button icon="picture" onClick={(e) => { e.stopPropagation(); if (onStartShare) onStartShare(); }} size="sm" variant="subtle">공유</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}