import { useState, useEffect, useRef } from 'react';
import TopBarShell from '../../components/layout/TopBarShell.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Button from '../../components/ui/Button.jsx';
import { signOutGoogle, isGoogleSignedIn } from '../../lib/googleDriveBackup.js';
import TaskbarHelpBalloon from '../../components/ui/TaskbarHelpBalloon.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';
import { isMigrationAuthorizedEmail } from '../../lib/userLicenseManager.js';

export default function CustomerHeader({ 
  totalCount, currentCount, onAdd, searchQuery, setSearchQuery, sortType, setSortType, 
  onLogout, onOpenSettings, onOpenEnvironmentSettings,
  // eslint-disable-next-line no-unused-vars
  onOpenAiSettings, onOpenBackupSettings, onOpenAdminSettings, onOpenExcelMigration, onCheckUpdate, userTier, isAiAllowed, isBackupAllowed, onNfcScan,
  customers = [],
  filteredCustomers = []
}) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showManualHelpSetting, setShowManualHelpSetting] = useState(true);
  const [hideProfileSetting, setHideProfileSetting] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const syncedPingStyle = useSyncedPingStyle();

  useEffect(() => {
    const handleUpdateSetting = () => {
      setShowManualHelpSetting(localStorage.getItem('show_manual_help') !== 'false');
      setHideProfileSetting(localStorage.getItem('hide_profile_name') !== 'false');
    };
    handleUpdateSetting();
    window.addEventListener('manual_help_setting_changed', handleUpdateSetting);
    window.addEventListener('profile_hide_setting_changed', handleUpdateSetting);
    window.addEventListener('storage', handleUpdateSetting);
    return () => {
      window.removeEventListener('manual_help_setting_changed', handleUpdateSetting);
      window.removeEventListener('profile_hide_setting_changed', handleUpdateSetting);
      window.removeEventListener('storage', handleUpdateSetting);
    };
  }, []);

  useEffect(() => {
    if (!isHamburgerOpen) return;
    const handleOutsideClick = () => {
      setIsHamburgerOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isHamburgerOpen]);

  const customerHeaderManualSections = [
    {
      heading: "1. ☰ 햄버거 메뉴",
      items: [
        { 
          title: "⚙️ 환경 설정", 
          desc: "세부 옵션을 설정합니다.",
          subItems: [
            { emoji: "🔒", label: "차트 보호" },
            { emoji: "📁", label: "타임라인 로그" },
            { emoji: "📋", label: "입력창 펼치기" },
            { emoji: "👤", label: "볼러스펙 펼치기" },
            { isHelpPing: true, label: "가이드 보기" },
            { emoji: "👤", label: "프로필" }
          ]
        },
        { title: "✨ ProDrill AI", desc: "AI 레이아웃 추천 알고리즘 활성을 위한 API 키를 생성 입력합니다." },
        { title: "☁️ 클라우드 백업", desc: "지공사 프로필 관리 / 구글 드라이브 클라우드 동기화 및 복구를 진행합니다." },
        { title: "📂 로컬 백업", desc: "수동 JSON 파일 내보내기/불러오기로 백업 파일을 관리합니다." },
        { title: "🔄 업데이트", desc: "최신 배포본을 확인하고 앱을 즉시 갱신합니다." },
        { title: "🚪 로그아웃", desc: "사용자 계정 세션을 안전하게 종료하고 로그인 화면으로 이동합니다." }
      ]
    },
    {
      heading: "2. 고객 현황 및 신규 고객 등록",
      items: [
        { title: "실시간 고객 수 표시", desc: "현재 저장된 전체 고객 수와 검색 필터링된 고객 수가 실시간 카운트됩니다." },
        { iconName: "plus", title: "+ 신규 버튼", desc: "우측 상단 + 신규 버튼을 터치하여 신규 고객을 빠르게 등록합니다." }
      ]
    },
    {
      heading: "3. 스마트 고객 검색 & 정렬",
      items: [
        { iconName: "search", title: "전화번호 & 이름 검색", desc: "고객 이름이나 전화번호 뒷 4자리 입력 시 실시간 정밀 필터링됩니다." },
        { title: "고객 정렬 옵션", desc: "최신순 / 이름순 선택으로 명단을 깔끔하게 정돈합니다." }
      ]
    }
  ];

  /* 🟢 NFC 스캔 버튼 임시 비활성화 처리
  const [realNfcSupported, setRealNfcSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('nfcUnsupportedDevice') === 'true') return false;
    return 'NDEFReader' in window;
  });

  useEffect(() => {
    const handleNfcUnsupportedEvent = () => {
      setRealNfcSupported(false);
    };
    window.addEventListener('nfc-device-unsupported', handleNfcUnsupportedEvent);
    return () => window.removeEventListener('nfc-device-unsupported', handleNfcUnsupportedEvent);
  }, []);

  const handleNfcScanWithHardwareCheck = async () => {
    if (!('NDEFReader' in window)) {
      window['alert']("❌ NFC 기능을 지원하지 않는 환경입니다. (NFC item not supported)");
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
        window['alert']("❌ 이 기기는 NFC 하드웨어가 장착되어 있지 않습니다. (NFC item not supported)");
      } else if (error.name === 'NotAllowedError') {
        window['alert']("❌ NFC 기능 권한이 차단되어 있습니다.");
      } else {
        window['alert'](`❌ 알 수 없는 오류: ${error.message}`);
      }
      
      localStorage.setItem('nfcUnsupportedDevice', 'true');
      window.dispatchEvent(new Event('nfc-device-unsupported'));
    }
  };
  */

  // 🟢 4. 테스크바 빈 영역 트리플 클릭 감지 잠금 로직
  const handleTaskbarClick = (e) => {
    if (e.detail === 3) {
      const targetTagName = e.target.tagName.toLowerCase();
      // 인풋창, 버튼, 링크 클릭 시에는 차단하여 불필요한 락 방지
      if (targetTagName === 'button' || targetTagName === 'input' || targetTagName === 'a' || e.target.closest('button') || e.target.closest('input')) {
        return;
      }
      if (onLogout) {
        onLogout();
      }
    }
  };

  return (
    <TopBarShell 
      fixed 
      variant="pageHeader" 
      className="flex flex-col min-h-[110px] cursor-pointer select-none"
      onClick={handleTaskbarClick}
    >
      <div className="flex justify-between items-center mb-1.5 h-10">
        <div className="flex items-center gap-1.5 relative">
          <div className="z-[999] shrink-0 flex items-center relative">
            {/* ☰ 햄버거 박스 (시작점 일치 -ml-1, 위쪽 이동 -mt-1.5 [1과 2 정중앙], 크기 10%+ 확대 w-10 h-10 text-2xl) */}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsHamburgerOpen(!isHamburgerOpen); }}
              className="w-10 h-10 -ml-1 -mt-1.5 text-2xl text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center leading-none"
              title="메뉴"
              aria-label="메뉴"
            >
              ☰
            </button>

            {/* 드롭다운 오버레이 (10%+ 스케일업 & 좌측 이격 튜닝: left-2, pl-5, pr-4, w-48) */}
            {isHamburgerOpen && (
              <div className="absolute left-2 top-11 z-[1000] w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2.5 flex flex-col animate-fade-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHamburgerOpen(false);
                    onOpenEnvironmentSettings();
                  }}
                  className="pl-5 pr-4 py-3 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left flex items-center gap-2.5"
                >
                  ⚙️ 환경 설정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHamburgerOpen(false);
                    onOpenAiSettings();
                  }}
                  className={`pl-5 pr-4 py-3 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left flex items-center gap-2.5 ${
                    !isAiAllowed ? 'opacity-40' : ''
                  }`}
                >
                  ✨ ProDrill AI
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHamburgerOpen(false);
                    onOpenSettings();
                  }}
                  className="pl-5 pr-4 py-3 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left flex items-center gap-2.5"
                >
                  ☁️ 클라우드 백업
                </button>
                {(isBackupAllowed || ['master', 'admin', 'pro'].includes(userTier?.toLowerCase())) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHamburgerOpen(false);
                      onOpenBackupSettings();
                    }}
                    className="pl-5 pr-4 py-3 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left flex items-center gap-2.5 border-t border-slate-100"
                  >
                    🗂️ 로컬 백업
                  </button>
                )}
                {isMigrationAuthorizedEmail(
                  (typeof window !== "undefined"
                    ? (localStorage.getItem("prodrill_linked_email") || localStorage.getItem("prodrill_certified_email_plain") || "sysmedic3@gmail.com")
                    : "sysmedic3@gmail.com"
                  ).trim().toLowerCase()
                ) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHamburgerOpen(false);
                      if (onOpenExcelMigration) onOpenExcelMigration();
                    }}
                    className="pl-5 pr-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-50 transition-colors text-left flex items-center gap-2.5 border-t border-slate-100"
                  >
                    📦 엑셀 마이그레이션
                  </button>
                )}
                {['master', 'admin'].includes(userTier?.toLowerCase()) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHamburgerOpen(false);
                      onOpenAdminSettings();
                    }}
                    className="pl-5 pr-4 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-50 transition-colors text-left flex items-center gap-2.5 border-t border-slate-100"
                  >
                    {"\uD83C\uDF9B"} 제어실
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHamburgerOpen(false);
                    if (onCheckUpdate) onCheckUpdate();
                  }}
                  className="pl-5 pr-4 py-3 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left flex items-center gap-2.5 border-t border-slate-100"
                >
                  🔄 업데이트
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHamburgerOpen(false);
                    signOutGoogle();
                    try {
                      localStorage.removeItem('prodrill_user_profile');
                      localStorage.removeItem('prodrill_license_certified');
                      localStorage.removeItem('prodrill_linked_email');
                      localStorage.removeItem('prodrill_trial_google_linked');
                      localStorage.removeItem('prodrill_certified_email_hash');
                      localStorage.removeItem('prodrill_certified_email_plain');
                      localStorage.removeItem('prodrill_license_status');
                      localStorage.removeItem('prodrill_first_time_setup_done');
                      localStorage.removeItem('prodrill_google_access_token');
                      localStorage.removeItem('prodrill_google_token_expiry');
                    } catch { /* ignore */ }
                    if (onLogout) onLogout();
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  }}
                  className="pl-5 pr-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors text-left flex items-center gap-2.5 border-t border-slate-100"
                >
                  {"\uD83D\uDEAA"} 로그아웃
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 relative">
            <h1 className="text-xl font-bold text-slate-800 leading-none">고객 관리</h1>
            
            {/* 1. ? 가이드 도움말 버튼 (고객 관리 타이틀 바로 뒤 위치) */}
            {showManualHelpSetting && (
              <div className="relative inline-flex items-center justify-center shrink-0 ml-0.5">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowHelp(prev => !prev);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200/60 hover:bg-slate-200/90 text-slate-700 border border-slate-300/50 backdrop-blur-xs shadow-xs flex items-center justify-center font-black text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer focus:outline-none"
                    aria-label="고객관리 사용 매뉴얼"
                    title="고객관리 사용 매뉴얼"
                  >
                    ?
                  </button>
                </div>
                <TaskbarHelpBalloon 
                  isOpen={showHelp} 
                  onClose={() => setShowHelp(false)} 
                  title="📖 고객관리 테스크바"
                  sections={customerHeaderManualSections}
                />
              </div>
            )}

            {/* 2. 💡 [가이드 ? 버튼 바로 뒤 배치: 프로필 이름 1순위 ➔ 없을 때만 계정 이메일 ID 2순위 / 프로필 가리기 설정 연동] */}
            {!hideProfileSetting && (() => {
              let displayName = "";
              try {
                const profileRaw = localStorage.getItem("prodrill_user_profile");
                if (profileRaw) {
                  const profileObj = JSON.parse(profileRaw);
                  displayName = profileObj.drillerName || profileObj.displayName || profileObj.name || "";
                }
              } catch { /* ignore */ }

              if (!displayName.trim()) {
                const activeEmail = (typeof window !== "undefined"
                  ? (localStorage.getItem("prodrill_linked_email") || localStorage.getItem("prodrill_certified_email_plain") || "지공사")
                  : "지공사").trim();
                displayName = activeEmail.includes('@') ? activeEmail.split('@')[0] : activeEmail;
              }

              return (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLogoutConfirm(true);
                    }}
                    className="text-base sm:text-lg font-medium text-slate-600 hover:text-indigo-600 transition-colors active:scale-95 cursor-pointer ml-1 sm:ml-1.5"
                    title="클릭 시 로그아웃 안내"
                  >
                    {displayName}
                  </button>

                  {/* 💡 [실수 방지 로그아웃 승인 / 취소 선택 경고 모달 다이얼로그] */}
                  {showLogoutConfirm && (
                    <ModalShell
                      align="center"
                      onClose={() => setShowLogoutConfirm(false)}
                      size="sm"
                      title="계정 로그아웃"
                      variant="light"
                    >
                      <div className="p-4 flex flex-col gap-5 text-center">
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">
                          현재 <span className="text-indigo-600 font-extrabold">{displayName}</span> 지공사 계정 세션을 안전하게 종료하고 로그인 화면으로 이동하시겠습니까?
                        </p>
                        <div className="flex gap-2.5 justify-center pt-2">
                          <Button
                            variant="outline"
                            size="md"
                            className="flex-1"
                            onClick={() => setShowLogoutConfirm(false)}
                          >
                            취소
                          </Button>
                          <Button
                            variant="primary"
                            size="md"
                            className="flex-1 bg-rose-600 hover:bg-rose-700 border-rose-600 text-white"
                            onClick={() => {
                              setShowLogoutConfirm(false);
                              signOutGoogle();
                              try {
                                localStorage.removeItem('prodrill_user_profile');
                                localStorage.removeItem('prodrill_license_certified');
                                localStorage.removeItem('prodrill_linked_email');
                                localStorage.removeItem('prodrill_trial_google_linked');
                                localStorage.removeItem('prodrill_certified_email_hash');
                                localStorage.removeItem('prodrill_certified_email_plain');
                                localStorage.removeItem('prodrill_license_status');
                                localStorage.removeItem('prodrill_first_time_setup_done');
                                localStorage.removeItem('prodrill_google_access_token');
                                localStorage.removeItem('prodrill_google_token_expiry');
                              } catch { /* ignore */ }
                              if (onLogout) onLogout();
                              setTimeout(() => {
                                window.location.reload();
                              }, 50);
                            }}
                          >
                            로그아웃
                          </Button>
                        </div>
                      </div>
                    </ModalShell>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={onAdd}
            className="bg-indigo-200 text-indigo-800 border border-indigo-300 hover:bg-indigo-300 px-4 h-9 rounded-xl font-bold flex items-center gap-1 shadow-md shadow-indigo-100 active:scale-95 transition-all"
          >
            <span className="text-xl leading-none">+</span> 신규
          </button>
        </div>
      </div>

      {/* 🟢 [스타일 및 시작점 일치 반영]: 전체 고객수 클릭 시 지공 차트 현황 정밀 모달 가동 */}
      {(() => {
        const countCustomerCharts = (custList) => {
          if (!Array.isArray(custList)) return 0;
          return custList.reduce((acc, c) => {
            let histCount = 0;
            try {
              const raw = localStorage.getItem(`chart_history_${c.id}`);
              if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) histCount = arr.length;
              }
            } catch { /* ignore */ }
            return acc + Math.max(1, histCount);
          }, 0);
        };

        const targetFiltered = (filteredCustomers && filteredCustomers.length > 0) ? filteredCustomers : customers;
        const selectedChartsCount = countCustomerCharts(targetFiltered);
        const totalChartsCount = countCustomerCharts(customers);

        return (
          <>
            <div className="font-bold text-slate-500 text-[11px] mb-3.5 pl-0.5 flex items-center gap-1">
              <span>전체 고객</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSummaryModal(true);
                }}
                className="font-black text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 cursor-pointer transition-colors active:scale-95 px-0.5"
                title="클릭 시 선택된 고객의 차트 수 및 전체 고객의 차트의 수 현황 확인"
              >
                {totalCount}명
              </button>
              <span>중 {(searchQuery || '').trim() ? '검색한' : '최근 등록/수정된'} {currentCount}명</span>
            </div>

            {/* 📊 지공 차트 현황 정밀 모달 다이얼로그 */}
            {showSummaryModal && (
              <ModalShell
                align="center"
                onClose={() => setShowSummaryModal(false)}
                size="sm"
                title="📊 지공 차트 현황"
                variant="light"
              >
                <div className="p-4 flex flex-col gap-4 text-center">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 카운트 1: 선택된 고객의 차트 수 */}
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                      <span className="text-xs font-bold text-slate-500 block mb-1">
                        선택된 고객의 차트 수
                      </span>
                      <span className="text-xl font-black text-slate-800">
                        {selectedChartsCount}개
                      </span>
                    </div>

                    {/* 카운트 2: 전체 고객의 차트의 수 */}
                    <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl">
                      <span className="text-xs font-bold text-indigo-600 block mb-1">
                        전체 고객의 차트의 수
                      </span>
                      <span className="text-xl font-black text-indigo-700">
                        {totalChartsCount}개
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="md"
                    className="w-full"
                    onClick={() => setShowSummaryModal(false)}
                  >
                    확인
                  </Button>
                </div>
              </ModalShell>
            )}
          </>
        );
      })()}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="이름 / 연락처 검색..."
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