import { useState } from 'react';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function InvitationCardModal({ onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = 'https://drilling-chart-psi.vercel.app';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <ModalShell onClose={onClose} size="md" title={"🎟️ ProDrill 공식 초청장"}>
      <div className="p-5 flex flex-col gap-4 max-h-[78vh] overflow-y-auto text-slate-700 text-xs leading-relaxed select-text">
        
        {/* 초청장 상단 히어로 카드 */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 p-5 rounded-2xl shadow-xl text-center flex flex-col items-center gap-2.5 text-white">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black/40 flex items-center justify-center p-1">
            <img src="/icon-512.png" alt="ProDrill Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30">VIP INVITATION</span>
            <h3 className="text-base font-black text-white tracking-tight">ProDrill CHART 볼링 지공 매니저</h3>
            <p className="text-[11px] text-slate-300 font-medium">전국 프로 지공사님을 위한 스마트 PWA 지공 차트 시스템</p>
          </div>
          <div className="mt-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-extrabold text-indigo-200">
            https://drilling-chart-psi.vercel.app
          </div>
        </div>

        {/* 🌟 1. 핵심 특징 하이라이트 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
          <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <Icon name="star" size={14} className="text-indigo-600 shrink-0" />
            <span>ProDrill 핵심 기능 요약</span>
          </h4>
          <ul className="space-y-1.5 text-[11px] font-medium text-slate-600">
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold shrink-0">•</span>
              <span><strong>앱 스토어 설치 필요 없음:</strong> 홈 화면에 10초 만에 앱 아이콘 추가</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold shrink-0">•</span>
              <span><strong>3D/2D 지공 도면:</strong> 쓰리핑거 · 덤리스(투핸드) 시점 자동 반전 & 터치 메모 핀</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold shrink-0">•</span>
              <span><strong>레이아웃 0초 변환:</strong> Dual Angle ↔️ Storm 2LS 즉시 상호 연산 및 AI 추천</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold shrink-0">•</span>
              <span><strong>완벽한 사생활 보호:</strong> 비번 4자리 잠금 & 3회 터치 차트 가림 화면</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold shrink-0">•</span>
              <span><strong>구글 드라이브 백업:</strong> 90일 무제한 클라우드 0초 동기화 & 파일 내보내기</span>
            </li>
          </ul>
        </div>

        {/* 📲 2. 기기별 앱 설치 가이드 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
          <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <Icon name="tools" size={14} className="text-indigo-600 shrink-0" />
            <span>10초 앱 설치 가이드 (홈 화면에 추가)</span>
          </h4>
          <div className="space-y-2 text-[11px] font-medium text-slate-600">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-0.5">
              <span className="font-bold text-slate-800 text-xs">🍎 iPhone / iPad (iOS Safari)</span>
              <p>Safari 접속 ➔ 하단 공유 아이콘<span className="font-bold text-indigo-600">`[↑]`</span> ➔ <span className="font-bold text-slate-800">`[홈 화면에 추가]`</span></p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-0.5">
              <span className="font-bold text-slate-800 text-xs">🤖 Android (삼성 인터넷 / 크롬)</span>
              <p>접속 ➔ 상단 메뉴<span className="font-bold text-indigo-600">`[⋮]`</span> ➔ <span className="font-bold text-slate-800">`[앱 설치]`</span> 또는 <span className="font-bold text-slate-800">`[홈 화면에 추가]`</span></p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-0.5">
              <span className="font-bold text-slate-800 text-xs">💻 PC / Mac (Chrome)</span>
              <p>Chrome 접속 ➔ 주소창 우측 <span className="font-bold text-slate-800">`[앱 설치]`</span> 컴퓨터/화살표 아이콘 클릭</p>
            </div>
          </div>
        </div>

        {/* ⚙️ 3. 시작하기 가이드 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl space-y-1 text-[11px]">
          <span className="font-bold text-indigo-900 text-xs block">🔑 0초 구글 백업 시작하기</span>
          <p className="text-indigo-800 font-medium">
            앱 실행 후 첫 화면에서 <span className="font-bold text-indigo-700">[구글 계정 연결하기]</span>를 선택하면 본인 구글 드라이브와 자동 연동됩니다.
          </p>
        </div>

        {/* 하단 액션 버튼 그룹 */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Icon name="copy" size={14} className="text-white shrink-0" />
            <span>{copied ? '초청 주소 복사 완료! ✨' : '초청 접속 주소 복사'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-24 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors text-center cursor-pointer active:scale-95"
          >
            닫기
          </button>
        </div>

      </div>
    </ModalShell>
  );
}
