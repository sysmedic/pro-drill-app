import React from 'react';
import { EXPIRE_DISPLAY_DATE } from '../lib/expirationGuard.js';

export default function ExpiredLockScreen({ reason = 'EXPIRED' }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      {/* 배경 장식 원형 글로우 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 flex flex-col items-center text-center space-y-6 animate-fade-in">
        {/* 자물쇠 아이콘 원형 배지 */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-slate-800 border border-rose-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.2)]">
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* 타이틀 및 안내 문구 */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            사용 기간 만료 안내
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
            {reason === 'TAMPERED'
              ? '기기 시스템 시간이 비정상적으로 감지되어 앱 실행이 차단되었습니다.'
              : '본 한시적 배포 버전의 사용 허가 기간이 종료되어 실행이 차단되었습니다.'}
          </p>
        </div>

        {/* 만료 일시 정보 박스 */}
        <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 text-left">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>배포 소프트웨어</span>
            <span className="text-slate-200">ProDrill Tools</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>사용 허가 만료일</span>
            <span className="text-rose-400 font-black">{EXPIRE_DISPLAY_DATE}</span>
          </div>
        </div>

        {/* 관리자 문의 안내 */}
        <div className="w-full pt-2 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-xs text-slate-400 leading-relaxed">
            정식 버전 라이선스 발급 및 기간 연장은<br />
            <a
              href="mailto:sysmedic@gmail.com"
              className="inline-block mt-1 px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-slate-700/80 rounded-lg font-bold transition-all"
            >
              sysmedic@gmail.com
            </a>
            <span className="block mt-1 text-slate-400">으로 문의해 주시기 바랍니다.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
