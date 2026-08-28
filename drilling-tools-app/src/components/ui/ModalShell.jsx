import React from 'react';
import { createPortal } from 'react-dom';
import { useModalLock } from '../../hooks/useModalLock.js';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function ModalShell({
  align = 'center',
  bodyClassName = '',
  children,
  className = '',
  onClose,
  size = 'md',
  title,
  titleId = 'modal-title',
  variant = 'light',
  zClassName = 'z-[9999]',
}) {
  // 🔒 키패드 모달 오픈 시 배경 스크롤 차단 & 화면 꺼짐 방지 자동 적용
  useModalLock(true);

  const isBottom = align === 'bottom';
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className={`fixed inset-0 h-[100vh] h-[100dvh] ${zClassName} bg-slate-900/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in ${
        isBottom ? 'items-end sm:items-center' : 'items-center'
      }`}
    >
      <div
        className={`bg-white text-slate-900 border border-slate-200 shadow-2xl w-full ${sizeClass} overflow-hidden my-auto max-h-[92vh] max-h-[92dvh] flex flex-col ${
          isBottom ? 'rounded-t-2xl sm:rounded-2xl' : 'rounded-2xl'
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <h3 className="text-base font-bold text-slate-800" id={titleId}>
            {title}
          </h3>
          {onClose && (
            <button
              aria-label="닫기"
              className="text-slate-400 hover:text-slate-700 p-1.5 text-lg font-bold transition-colors cursor-pointer outline-none"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className={`overflow-y-auto ${bodyClassName}`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
