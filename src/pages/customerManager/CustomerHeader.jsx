import { useState, useEffect } from 'react';
import TopBarShell from '../../components/layout/TopBarShell.jsx';

export default function CustomerHeader({ 
  totalCount, currentCount, onAdd, searchQuery, setSearchQuery, sortType, setSortType, 
  isAdmin, onOpenAdmin, isMenuOpen, setIsMenuOpen, onLogout,
  onNfcScan 
}) {

  // 🟢 1. 앱을 켤 때 영구 기억 장소(localStorage)를 검사하여 버튼 노출 여부 결정
  const [realNfcSupported, setRealNfcSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('nfcUnsupportedDevice') === 'true') return false;
    return 'NDEFReader' in window;
  });

  // 🟢 2. [양방향 실시간 동기화] 다른 컴포넌트(UtilitySheet)에서 NFC 미지원이 감지되면 즉시 함께 숨김
  useEffect(() => {
    const handleNfcUnsupportedEvent = () => {
      setRealNfcSupported(false);
    };
    window.addEventListener('nfc-device-unsupported', handleNfcUnsupportedEvent);
    return () => window.removeEventListener('nfc-device-unsupported', handleNfcUnsupportedEvent);
  }, []);

  // 🟢 3. 하드웨어 검증 및 영구 소멸 로직
  const handleNfcScanWithHardwareCheck = async () => {
    if (!('NDEFReader' in window)) {
      alert("❌ NFC 기능을 지원하지 않는 환경입니다. (NFC item not supported)");
      localStorage.setItem('nfcUnsupportedDevice', 'true');
      window.dispatchEvent(new Event('nfc-device-unsupported'));
      return;
    }

    const abortController = new AbortController();

    try {
      const ndef = new NDEFReader();
      await ndef.scan({ signal: abortController.signal });
      abortController.abort();
      
      if (onNfcScan) onNfcScan();

    } catch (error) {
      if (error.name === 'NotSupportedError') {
        alert("❌ 이 기기는 NFC 하드웨어가 장착되어 있지 않습니다. (NFC item not supported)");
      } else if (error.name === 'NotAllowedError') {
        alert("❌ NFC 기능 권한이 차단되어 있습니다.");
      } else {
        alert(`❌ 알 수 없는 오류: ${error.message}`);
      }
      
      localStorage.setItem('nfcUnsupportedDevice', 'true');
      window.dispatchEvent(new Event('nfc-device-unsupported'));
    }
  };

  return (
    <TopBarShell fixed variant="toolbar" className="flex flex-col w-full p-4 bg-white rounded-2xl shadow-sm min-h-[110px]">
      
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[998] bg-transparent" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2 relative">
          <div className="z-[999] shrink-0 flex items-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="-mt-1 p-1 text-2xl text-slate-600 hover:bg-slate-100 rounded-lg transition-colors leading-none"
            >
              {isMenuOpen ? "✕" : "☰"}
            </button>
            
            {isMenuOpen && (
              <div className="absolute top-9 left-0 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 p-1 z-[1000]">
                <button onClick={onLogout} className="w-full py-3 text-sm text-red-500 font-bold hover:bg-red-50 rounded-lg text-center">
                  로그아웃
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 leading-none">고객 관리</h1>
              {isAdmin && (
                <button onClick={onOpenAdmin} className="text-lg text-slate-300 hover:text-slate-600 p-1 transition-colors leading-none">
                  ⚙️
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {realNfcSupported && (
            <button
              onClick={handleNfcScanWithHardwareCheck}
              className="bg-emerald-200 text-emerald-800 border border-emerald-300 hover:bg-emerald-300 px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md shadow-emerald-100 active:scale-95 transition-all"
            >
              <span className="text-lg">🏷️</span> 스캔
            </button>
          )}

          <button 
            onClick={onAdd}
            className="bg-indigo-200 text-indigo-800 border border-indigo-300 hover:bg-indigo-300 px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md shadow-indigo-100 active:scale-95 transition-all"
          >
            <span className="text-xl">+</span> 신규
          </button>
        </div>
      </div>

      {/* 🟢 [스타일 통일 반영]: 겉 감싸는 태그의 테일윈드 클래스를 font-bold text-slate-500으로 단일화하여 문장 전체 톤을 완벽하게 맞췄습니다. */}
      <div className="font-bold text-slate-500 text-[11px] mb-4 pl-9">
        전체 고객 {totalCount}명 중 {searchQuery.trim() ? '검색한' : '최근 등록/수정된'} {currentCount}명
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="이름 또는 연락처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-base focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-1 font-bold text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 outline-none"
        >
          <option value="latest">최신순</option>
          <option value="name">이름순</option>
        </select>
      </div>
    </TopBarShell>
  );
}