import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import SpanConverterView from './components/SpanConverterView.jsx';
import MidlineCalculatorView from './components/MidlineCalculatorView.jsx';
import OvalCalculatorView from './components/OvalCalculatorView.jsx';
import TriOvalCalculatorView from './components/TriOvalCalculatorView.jsx';
import UpdateModal, { CURRENT_APP_VERSION, LAST_SEEN_VERSION_KEY } from './components/UpdateModal.jsx';

const StorageModal = React.lazy(() => import('./components/StorageModal.jsx'));

const STORAGE_KEY = 'prodrill_tools_shared_state';

const DEFAULT_SHARED_STATE = {
  // 스판 수치 (기본 공란)
  midSpanStr: '',
  ringSpanStr: '',
  bridgeStr: '3/16',
  fromType: 'Cut to Cut',
  toType: 'Center to Center',
  markingType: 'Center to Center',
  denomMode: 32,

  // 손가락 홀컷/인서트 (인서트 필수 공란)
  midHoleCut: '31/32',
  midInsert: '',
  midTipType: '',
  ringHoleCut: '31/32',
  ringInsert: '',
  ringTipType: '',

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

const TABS = ['span', 'marking', 'oval', 'trioval'];
const LAST_TAB_STORAGE_KEY = 'prodrill_tools_last_active_tab';

const loadInitialTab = () => {
  try {
    const saved = localStorage.getItem(LAST_TAB_STORAGE_KEY);
    if (saved && TABS.includes(saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Failed to load last tab from localStorage', e);
  }
  return 'span';
};

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

import { decodeSharePayload } from './lib/shareHelper.js';
import { checkLocalExpiration, verifyWithServerTime } from './lib/expirationGuard.js';
import ExpiredLockScreen from './components/ExpiredLockScreen.jsx';
import { useI18n } from './lib/i18n.jsx';
import { createPortal } from 'react-dom';

export default function App() {
  const { lang, toggleLang, t } = useI18n();
  // 🔒 [한시적 배포 만료 가드]: 2026.11.30 12:00 만료 및 Vercel 서버 시간/시계 조작 방어
  const [expirationState, setExpirationState] = useState(() => checkLocalExpiration());

  useEffect(() => {
    // 1. 주기적 로컬 시간 검사 (10초 주기)
    const interval = setInterval(() => {
      const state = checkLocalExpiration();
      if (state.isExpired) {
        setExpirationState(state);
      }
    }, 10000);

    // 2. Vercel 서버 시간 비동기 교차 검증
    verifyWithServerTime((isExpired, reason) => {
      if (isExpired) {
        setExpirationState({ isExpired: true, reason });
      }
    });

    return () => clearInterval(interval);
  }, []);

  // 📌 [지공사님 핵심 지침 100% 반영]: 앱 재실행 시 마지막 모드(스판, 미드라인, 오발)로 자동 복귀
  const [activeTab, setActiveTab] = useState(loadInitialTab); // 'span' | 'midline' | 'oval'
  const [slideDirection, setSlideDirection] = useState('left'); // 'left' (from right) | 'right' (from left)
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [incomingShareData, setIncomingShareData] = useState(null);

  // 🌟 [수치 상호 참조 전역 상태]: localStorage 영구 동기화
  const [sharedState, setSharedState] = useState(loadInitialState);

  // 🚨 만료 상태 시 모든 기능 언마운트 및 전면 락 화면 단독 렌더링
  if (expirationState.isExpired) {
    return <ExpiredLockScreen reason={expirationState.reason} />;
  }

  // 🚀 [신규 버전 업데이트 안내 자동 팝업]: 새 버전 배포 시 시작화면 모달 오픈, 확인 시 다음 실행부터 패스
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('share') || searchParams.get('slot')) return;

      const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
      if (lastSeen !== CURRENT_APP_VERSION) {
        setIsUpdateModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to check app version', e);
    }
  }, []);

  // 🔗 [딥링크 공유 수신 감지]: URL 파라미터(?share=... 또는 ?slot=... / #?share=...) 자동 파싱 및 즉시 적용 ➔ 결과 화면 다이렉트 직행
  useEffect(() => {
    try {
      const queryString = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
      const searchParams = new URLSearchParams(queryString);
      const sharePayload = searchParams.get('share') || searchParams.get('slot');
      if (sharePayload) {
        const decoded = decodeSharePayload(sharePayload);
        if (decoded && typeof decoded === 'object') {
          // 📌 [지공사님 핵심 지침]: 보정치(ovalCorrection)는 '0'으로 설정 (반영하지 않음)
          decoded.ovalCorrection = '0';
          const targetTab = decoded.activeTab || (decoded.triOvalType ? 'trioval' : 'oval');
          setActiveTab(targetTab);
          setSharedState((prev) => ({
            ...prev,
            ...decoded,
            autoOpenOvalMatrix: targetTab === 'oval' || targetTab === 'trioval',
          }));
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.error('Failed to parse share URL param', e);
    }
  }, []);

  // 🚀 방향 감지 탭 전환 함수 (localStorage 실시간 동기화)
  const switchTab = useCallback((nextTab) => {
    setActiveTab((currentTab) => {
      if (nextTab === currentTab) return currentTab;
      const prevIdx = TABS.indexOf(currentTab);
      const nextIdx = TABS.indexOf(nextTab);
      setSlideDirection(nextIdx > prevIdx ? 'left' : 'right');
      try {
        localStorage.setItem(LAST_TAB_STORAGE_KEY, nextTab);
      } catch (e) {
        console.error(e);
      }
      return nextTab;
    });
  }, []);

  // 📱 [3탭 스와이프 제스처 터치 레퍼런스]: 스판 ⇄ 미드라인 ⇄ 오발 부드러운 스와이프 전환
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const handleTouchStart = (e) => {
    // 🔒 저장/업데이트 모달, 결과 모달, 키패드 등이 열려있거나 터치된 경우 배경 스와이프 전면 차단
    if (
      isStorageModalOpen ||
      isUpdateModalOpen ||
      document.querySelector('[role="dialog"]') ||
      document.querySelector('.fixed.inset-0') ||
      (e.target && e.target.closest && e.target.closest('[role="dialog"], .fixed, canvas, input, select, button'))
    ) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (
      isStorageModalOpen ||
      isUpdateModalOpen ||
      document.querySelector('[role="dialog"]') ||
      document.querySelector('.fixed.inset-0')
    ) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

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

  // 전역 상태 업데이트 조력 함수 (객체 형태 병합 지원 - useCallback 적용)
  const updateSharedState = useCallback((keyOrObj, val) => {
    setSharedState((prev) => {
      if (typeof keyOrObj === 'object' && keyOrObj !== null) {
        return { ...prev, ...keyOrObj };
      }
      return { ...prev, [keyOrObj]: val };
    });
  }, []);

  // 🔄 전체 입력 수치 초기화 함수 (기본값 원복 및 로컬스토리지 동기화)
  const handleResetAll = useCallback(() => {
    setSharedState(DEFAULT_SHARED_STATE);
  }, []);

  // 💾 [아카이브 슬롯 로드 핸들러]: 오발 데이터 포함 시 오발 탭 전환 및 피치 메트릭스 즉시 오픈
  const handleLoadState = useCallback((loadedState) => {
    const hasOval = Boolean(
      loadedState?.holeSize &&
      loadedState?.ovalSize &&
      loadedState?.ovalAngle &&
      (loadedState?.latVal || loadedState?.vertVal)
    );

    if (hasOval) {
      setActiveTab('oval');
      setSharedState({
        ...loadedState,
        autoOpenOvalMatrix: true,
      });
    } else {
      setActiveTab('span');
      setSharedState(loadedState);
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col font-sans p-2.5 sm:p-6 select-none overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-xl w-full mx-auto space-y-2 sm:space-y-2.5">
        {/* 📌 1. 상단 슬림 유틸리티 툴바 (타이틀 + [초기화] [아카이브]) */}
        <header className="flex items-center justify-between px-1.5 sm:px-2 pt-1 pb-0.5">
          <h1
            onClick={() => setIsUpdateModalOpen(true)}
            className="text-base sm:text-lg font-black text-slate-900 tracking-tight cursor-pointer hover:text-slate-700 active:scale-98 transition-all shrink-0 flex items-center gap-1.5"
            title="앱 정보 및 업데이트 확인"
          >
            <span>ProDrill Tools</span>
          </h1>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="모든 입력 수치 초기화"
            >
              {t('reset')}
            </button>
            <button
              type="button"
              onClick={() => setIsStorageModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="아카이브 관리 (저장 및 불러오기)"
            >
              {t('archive')}
            </button>
          </div>
        </header>

        {/* 📌 2+3. 폴더 인덱스형 탭 + 본문 통합 컨테이너 */}
        <div className="w-full">
          {/* 탭 바: 좌측 각짐 / 우측 라운드 폴더형 탭 바 (좌우 여백 0으로 컨테이너와 1:1 완벽 정렬) */}
          <div className="flex items-end gap-1 relative bg-[#f1f5f9] px-0 z-10 w-full">
            <button
              type="button"
              onClick={() => switchTab('span')}
              className={`chrome-tab ${activeTab === 'span' ? 'chrome-tab--active' : 'chrome-tab--inactive'}`}
            >
              {t('spanTab')}
            </button>
            <button
              type="button"
              onClick={() => switchTab('marking')}
              className={`chrome-tab ${activeTab === 'marking' ? 'chrome-tab--active' : 'chrome-tab--inactive'}`}
            >
              {t('markingTab')}
            </button>
            <button
              type="button"
              onClick={() => switchTab('oval')}
              className={`chrome-tab ${activeTab === 'oval' ? 'chrome-tab--active' : 'chrome-tab--inactive'}`}
            >
              {t('ovalTab')}
            </button>
            <button
              type="button"
              onClick={() => switchTab('trioval')}
              className={`chrome-tab chrome-tab--mini ml-auto ${activeTab === 'trioval' ? 'chrome-tab--active' : 'chrome-tab--inactive'}`}
              title="삼각 오발 계산기"
              aria-label="삼각 오발 계산기"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0px 1px 1.5px rgba(0,0,0,0.55))' }}
              >
                <polygon points="12,3 22,21 2,21" />
              </svg>
            </button>
          </div>

          {/* 본문 영역: 탭 외곽선(#64748b / slate-500)과 100% 일체화 및 우측/하단 3D 입체 쉐도우 적용 */}
          <div className="w-full bg-white border border-slate-500 rounded-b-2xl sm:rounded-b-3xl shadow-[4px_6px_16px_rgba(0,0,0,0.08),_1px_2px_4px_rgba(0,0,0,0.04)] overflow-hidden relative z-0">
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

              {/* 탭 2: 마킹 계산기 */}
              {activeTab === 'marking' && (
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

              {/* 탭 4: 삼각 오발 계산기 */}
              {activeTab === 'trioval' && (
                <TriOvalCalculatorView
                  sharedState={sharedState}
                  updateSharedState={updateSharedState}
                />
              )}
            </main>
          </div>
        </div>
      </div>

      {/* 💾 [저장 관리 모달 (지연 로딩)]: 저장 & 불러오기 */}
      {isStorageModalOpen && (
        <Suspense fallback={null}>
          <StorageModal
            isOpen={isStorageModalOpen}
            onClose={() => setIsStorageModalOpen(false)}
            currentSharedState={sharedState}
            onLoadState={handleLoadState}
          />
        </Suspense>
      )}

      {/* ✨ [앱 정보 및 업데이트 확인 모달 (지연 로딩)] */}
      {isUpdateModalOpen && (
        <Suspense fallback={null}>
          <UpdateModal
            isOpen={isUpdateModalOpen}
            onClose={() => setIsUpdateModalOpen(false)}
          />
        </Suspense>
      )}

      {/* 📥 [공유받은 제원 수신 확인 모달] */}
      {incomingShareData &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  공유받은 제원 불러오기
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  공유받은 지공 제원(스판, 미드라인, 오발 수치)을 현재 작업창에 1:1로 적용하시겠습니까?
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs text-slate-700">
                <div className="font-bold text-slate-900">
                  • 스판: M {incomingShareData.midSpanStr || '-'} / R {incomingShareData.ringSpanStr || '-'}
                </div>
                <div className="font-bold text-slate-900">
                  • 오발: {incomingShareData.holeSize || '-'} x {incomingShareData.ovalSize || '-'} @ {incomingShareData.ovalAngle || '0'}°
                </div>
                <div className="text-[11px] text-slate-500 font-semibold pt-0.5">
                  • 보정값: 0 (표준 적용)
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIncomingShareData(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleLoadState(incomingShareData);
                    setIncomingShareData(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="flex-1 py-3 px-3 bg-[#1e293b] hover:bg-black text-white font-black text-xs rounded-md transition-all shadow-md cursor-pointer active:scale-98"
                >
                  제원 불러오기
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}


