import React, { useState, useEffect, useRef } from 'react';
import SpanConverterView from './components/SpanConverterView.jsx';
import MidlineCalculatorView from './components/MidlineCalculatorView.jsx';
import OvalCalculatorView from './components/OvalCalculatorView.jsx';
import StorageModal from './components/StorageModal.jsx';
import UpdateModal from './components/UpdateModal.jsx';

const STORAGE_KEY = 'prodrill_tools_shared_state';

const DEFAULT_SHARED_STATE = {
  // 스판 수치 (기본 공란)
  midSpanStr: '',
  ringSpanStr: '',
  bridgeStr: '3/16',
  fromType: 'Actual Span',
  toType: 'Center to Center',
  markingType: 'Cut to Cut',
  denomMode: 32,

  // 손가락 홀컷/인서트 (인서트 필수 공란)
  midHoleCut: '31/32',
  midInsert: '',
  ringHoleCut: '31/32',
  ringInsert: '',

  // 엄지 제원 (ovalCut1, ovalCut2 포함)
  thumbHoleCut: '1 1/4',
  holeSize: '',
  ovalSize: '',
  ovalCut: '',
  ovalCut1: '',
  ovalCut2: '',
  ovalCorrection: '0',
  ovalAngle: '',

  // 엄지 피치 (초기 공란)
  latDir: '',
  latVal: '',
  vertDir: '',
  vertVal: '',
  isLeftHanded: false,
  isDetailedMode: false,
};

const TABS = ['span', 'midline', 'oval'];

const loadInitialState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SHARED_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load state from localStorage', e);
  }
  return DEFAULT_SHARED_STATE;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('span'); // 'span' | 'midline' | 'oval'
  const [slideDirection, setSlideDirection] = useState('left'); // 'left' (from right) | 'right' (from left)
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // 🌟 [수치 상호 참조 전역 상태]: localStorage 영구 동기화
  const [sharedState, setSharedState] = useState(loadInitialState);

  // 🚀 방향 감지 탭 전환 함수
  const switchTab = (nextTab) => {
    if (nextTab === activeTab) return;
    const prevIdx = TABS.indexOf(activeTab);
    const nextIdx = TABS.indexOf(nextTab);
    setSlideDirection(nextIdx > prevIdx ? 'left' : 'right');
    setActiveTab(nextTab);
  };

  // 📱 [3탭 스와이프 제스처 터치 레퍼런스]: 스판 ⇄ 미드라인 ⇄ 오발 부드러운 스와이프 전환
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const handleTouchStart = (e) => {
    if (isStorageModalOpen || isUpdateModalOpen) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // 수평 거리가 50px 이상이고 수직 스크롤보다 수평 이동이 1.3배 이상 클 때만 스와이프 판정
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      const currentIndex = TABS.indexOf(activeTab);
      if (diffX < 0 && currentIndex < TABS.length - 1) {
        // 왼쪽으로 스와이프 ➔ 다음 탭 이동 (Slide In Right)
        switchTab(TABS[currentIndex + 1]);
      } else if (diffX > 0 && currentIndex > 0) {
        // 오른쪽으로 스와이프 ➔ 이전 탭 이동 (Slide In Left)
        switchTab(TABS[currentIndex - 1]);
      }
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedState));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [sharedState]);

  // 전역 상태 업데이트 조력 함수 (객체 형태 병합 지원)
  const updateSharedState = (keyOrObj, val) => {
    setSharedState((prev) => {
      if (typeof keyOrObj === 'object' && keyOrObj !== null) {
        return { ...prev, ...keyOrObj };
      }
      return { ...prev, [keyOrObj]: val };
    });
  };

  // 🔄 전체 입력 수치 초기화 함수 (기본값 원복 및 로컬스토리지 동기화)
  const handleResetAll = () => {
    setSharedState(DEFAULT_SHARED_STATE);
  };

  return (
    <div
      className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col font-sans p-4 sm:p-6 select-none overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-xl w-full mx-auto space-y-4">
        {/* 📌 상단 메인 헤더 카드 (좌측 타이틀 + 버전 드롭다운 모달 트리거 & 우측 [초기화] [저장]) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h1
              onClick={() => setIsUpdateModalOpen(true)}
              className="text-xl font-black text-slate-900 tracking-tight cursor-pointer hover:text-slate-700 active:scale-98 transition-all"
              title="앱 정보 및 업데이트 확인"
            >
              ProDrill Tools
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="모든 입력 수치 초기화"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setIsStorageModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-xl transition-all cursor-pointer shadow-2xs"
                title="아카이브 관리 (저장 및 불러오기)"
              >
                ARCHIVE
              </button>
            </div>
          </div>

          {/* 📌 3탭 상단 캡슐 Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-[#f8fafc] border border-slate-200/80 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => switchTab('span')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                activeTab === 'span'
                  ? 'bg-[#1e293b] text-white shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              스판 변환기
            </button>

            <button
              type="button"
              onClick={() => switchTab('midline')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                activeTab === 'midline'
                  ? 'bg-[#1e293b] text-white shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              미드라인 마킹
            </button>

            <button
              type="button"
              onClick={() => switchTab('oval')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                activeTab === 'oval'
                  ? 'bg-[#1e293b] text-white shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              오발 계산기
            </button>
          </div>
        </div>

        {/* 📌 메인 연산자 메인 영역 (방향 감지 네이티브 부드러운 슬라이드 애니메이션 적용) */}
        <main
          key={activeTab}
          className={`w-full ${
            slideDirection === 'left' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {/* 탭 1: 스판 변환기 */}
          {activeTab === 'span' && (
            <SpanConverterView
              sharedState={sharedState}
              updateSharedState={updateSharedState}
            />
          )}

          {/* 탭 2: 미드라인 마킹 */}
          {activeTab === 'midline' && (
            <MidlineCalculatorView
              sharedState={sharedState}
              updateSharedState={updateSharedState}
            />
          )}

          {/* 탭 3: 오발 계산기 */}
          {activeTab === 'oval' && (
            <OvalCalculatorView
              sharedState={sharedState}
              updateSharedState={updateSharedState}
            />
          )}
        </main>
      </div>

      {/* 💾 [저장 관리 모달]: 저장 & 불러오기 */}
      <StorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        currentSharedState={sharedState}
        onLoadState={(loadedState) => setSharedState(loadedState)}
      />

      {/* ✨ [앱 정보 및 업데이트 확인 모달] */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </div>
  );
}


