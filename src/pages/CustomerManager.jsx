/* global process */
import { useState, useEffect } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import { FeedbackToast } from '../components/ui/Dialogs.jsx';
import Button from '../components/ui/Button.jsx';
import ModalShell from '../components/ui/ModalShell.jsx';
import CustomerHeader from './customerManager/CustomerHeader.jsx';
import CustomerList from './customerManager/CustomerList.jsx';
import CustomerFormModal from './customerManager/CustomerFormModal.jsx';
import { loadCustomers, saveCustomers } from '../lib/customerStorage.js';
import { deleteChartHistory } from '../lib/chartHistoryStorage.js';
import { createLocalId } from '../lib/ids.js';
import { autoSyncOnChange } from '../lib/syncService.js'; // ☁️ 실시간 백업 트리거 임포트
import SettingsModal from './customerManager/SettingsModal.jsx'; // ⚙️ 설정 모달 임포트
import GeneralSettingsModal from './customerManager/GeneralSettingsModal.jsx'; // ⚙️ 기본 설정 모달 임포트
import BackupSettingsModal from './customerManager/BackupSettingsModal.jsx'; // 🗂️ 로컬 백업 모달 임포트
import AiSettingsModal from './customerManager/AiSettingsModal.jsx'; // 🤖 AI 설정 모달 임포트
import AdminSettingsModal from './customerManager/AdminSettingsModal.jsx'; // 👑 마스터 제어실 모달 임포트
import UserManualModal from './customerManager/UserManualModal.jsx'; // 📖 사용 설명서 모달 임포트
import ProfileOnboardingModal from './customerManager/ProfileOnboardingModal.jsx'; // 🛡️ 지공사 프로필 온보딩 모달 임포트
import AppUpdateModal from './customerManager/AppUpdateModal.jsx'; // 🔄 앱 업데이트 모달 임포트
import { isLicenseCertified, getUserProfile, fetchRemoteUserProfile, saveUserProfile } from '../lib/userLicenseManager.js';

export default function CustomerManagement({ 
  onSelectCustomer, 
  onLogout,
  onNfcScan,
  graceInfo,
  userTier,
  certifiedEmailHash,
  activeEmail
}) {
  const [customers, setCustomers] = useState(() => {
    const result = loadCustomers(null, activeEmail, certifiedEmailHash);
    return result instanceof Promise ? [] : (Array.isArray(result) ? result : []);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('latest');
  const [feedback, setFeedback] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEnvironmentSettingsModal, setShowEnvironmentSettingsModal] = useState(false);
  const [showBackupSettingsModal, setShowBackupSettingsModal] = useState(false);
  const [showAiSettingsModal, setShowAiSettingsModal] = useState(false);
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [showUserManualModal, setShowUserManualModal] = useState(false);
  const [showProfileOnboardingModal, setShowProfileOnboardingModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkProfileOnboarding = async () => {
      const storedEmail = typeof window !== 'undefined' ? (localStorage.getItem('prodrill_linked_email') || localStorage.getItem('prodrill_certified_email_plain') || '') : '';
      const effectiveEmail = (activeEmail && activeEmail !== 'guest@prodrill.local') ? activeEmail : storedEmail;
      const isRealGoogleUser = effectiveEmail && effectiveEmail !== 'guest@prodrill.local';
      const isTestEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || (typeof window !== 'undefined' && (window.navigator?.webdriver || localStorage.getItem('prodrill_test_mode') === 'true'));
      
      if (isRealGoogleUser && !isTestEnv) {
        const remoteProf = await fetchRemoteUserProfile(effectiveEmail);
        const prof = remoteProf || getUserProfile();
        if (isMounted) {
          if (!prof || !prof.name) {
            setShowProfileOnboardingModal(true);
          }
        }
      }
    };

    checkProfileOnboarding();
    return () => { isMounted = false; };
  }, [activeEmail]);

  useEffect(() => {
    const handleRestored = async () => {
      console.log(`[TRACE RENDER] 복원 이벤트(prodrill_data_restored) 수신! activeEmail='${activeEmail}', accountHash='${certifiedEmailHash}' 기준 데이터 재로드 개시...`);
      const result = await loadCustomers(null, activeEmail, certifiedEmailHash);
      const list = Array.isArray(result) ? result : [];
      console.log(`[TRACE RENDER 결과] 렌더링될 고객 명단 (총 ${list.length}명): ${list.map(c=>c.name).join(', ')}`);
      setCustomers(list);
    };
    window.addEventListener('prodrill_data_restored', handleRestored);
    window.addEventListener('storage', handleRestored);
    return () => {
      window.removeEventListener('prodrill_data_restored', handleRestored);
      window.removeEventListener('storage', handleRestored);
    };
  }, [activeEmail, certifiedEmailHash]);
  
  const [totalCount, setTotalCount] = useState(0);

  const [customerData, setCustomerData] = useState({ 
    name: '', 
    club: '', 
    phone: '', 
    gender: '', 
    hand: '', 
    style: '',
    styleExtra: '' 
  });

  // 로컬 카운트 관리
  useEffect(() => {
    setTotalCount(customers.length);
  }, [customers]);

  // 🧹 계정 변경 감지 즉시 고스트 데이터 리셋 및 계정 전용 DB 명단 로드
  useEffect(() => {
    let isMounted = true;
    setCustomers([]); // 이전 계정 고스트 잔존 데이터 즉시 100% 완전 소멸

    const fetchCustomers = async () => {
      try {
        const list = await loadCustomers(null, activeEmail, certifiedEmailHash);
        if (isMounted) {
          setCustomers(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("IndexedDB 고객 로드 실패:", err);
      }
    };

    fetchCustomers();
    return () => { isMounted = false; };
  }, [certifiedEmailHash, activeEmail]);

  // 화면 진입 및 주요 모달 전환 시 강제 1배율 리셋 (원본 유지)
  useEffect(() => {
    let timeoutId;
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const unlockedViewport = 'width=device-width, initial-scale=1.0'; 
    
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      
      timeoutId = setTimeout(() => {
        viewportMeta.setAttribute('content', unlockedViewport); 
      }, 350);
    }

    return () => clearTimeout(timeoutId); 
  }, [showModal, deleteRequest, showSecondDeleteConfirm, showEnvironmentSettingsModal, showBackupSettingsModal, showAiSettingsModal, showAdminSettingsModal]);

  // 고객 저장/수정 함수 (오프라인 로컬 처리)
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerData.name.trim()) return setFeedback({ message: '이름을 입력하세요.', tone: 'warning' });
    try {
      const isoTimestamp = new Date().toISOString();
      let updatedCustomers = [...customers];

      if (editId) {
        updatedCustomers = updatedCustomers.map(c => 
          c.id === editId 
            ? { ...c, ...customerData, updatedAt: isoTimestamp } 
            : c
        );
      } else {
        // [Fix C] 신규 고객에 실제 이메일 주입 (localStorage에서 직접 읽어 안전하게 처리)
        const resolvedEmail = (
          localStorage.getItem('prodrill_linked_email') ||
          localStorage.getItem('prodrill_certified_email_plain') ||
          activeEmail || ''
        ).trim().toLowerCase();
        const newCustomer = {
          ...customerData,
          id: createLocalId(),
          userId: 'local_driller',
          createdAt: isoTimestamp,
          updatedAt: isoTimestamp,
          createdByEmail: resolvedEmail || ''
        };
        updatedCustomers.unshift(newCustomer);

      }

      const success = await saveCustomers(updatedCustomers);
      if (success) {
        setCustomers(updatedCustomers);
        setShowModal(false);
        setFeedback({ message: '저장되었습니다.', tone: 'success' });
        autoSyncOnChange(); // ☁️ 변경사항 자동 백업 트리거
      } else {
        setFeedback({ message: '저장 실패', tone: 'danger' });
      }
    } catch (e) { 
      console.error("고객 저장 에러:", e);
      setFeedback({ message: '실패', tone: 'danger' }); 
    }
  };

  const cleanQuery = (searchQuery || '').trim().toLowerCase().replace(/_/g, '');
  const filtered = customers.filter(c => {
    if (!cleanQuery) return true;
    const nameRaw = (c.name || '').toLowerCase();
    const nameNormalized = nameRaw.replace(/_/g, '');
    const phoneRaw = (c.phone || '').replace(/[- \s]/g, '');
    return nameRaw.includes(cleanQuery) || 
           nameNormalized.includes(cleanQuery) || 
           phoneRaw.includes(cleanQuery);
  });
  const displayedCustomers = filtered.slice(0, 100);

  if (sortType === 'name') {
    displayedCustomers.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <PageShell bottomPadding="pb-24">
      <CustomerHeader
        totalCount={totalCount}
        currentCount={displayedCustomers.length}
        onAdd={() => { 
          setEditId(null); 
          setCustomerData({ name: '', club: '', phone: '', gender: '', hand: '', style: '', styleExtra: '' }); 
          setShowModal(true); 
        }}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        sortType={sortType} setSortType={setSortType}
        onLogout={onLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenEnvironmentSettings={() => setShowEnvironmentSettingsModal(true)}
        onOpenAiSettings={() => {
          const isAiAllowed = ['master', 'certified'].includes(userTier?.toLowerCase()) || (graceInfo && !graceInfo.isExpired && graceInfo.daysLeft > 30);
          if (!isAiAllowed) {
            setFeedback({ message: '유예 기간이 30일 이하로 남아 정식 라이선스 인증이 필요한 기능입니다.', tone: 'warning' });
          } else {
            setShowAiSettingsModal(true);
          }
        }}
        onOpenBackupSettings={() => {
          const isBackupAllowed = ['master', 'certified'].includes(userTier?.toLowerCase());
          if (!isBackupAllowed) {
            setFeedback({ message: '인증된 라이선스 등급 사용자만 수동 백업 기능을 사용할 수 있습니다.', tone: 'warning' });
          } else {
            setShowBackupSettingsModal(true);
          }
        }}
        onOpenAdminSettings={() => setShowAdminSettingsModal(true)}
        onOpenUserManual={() => setShowUserManualModal(true)}
        onCheckUpdate={() => setShowUpdateModal(true)}
        userTier={userTier}
        isAiAllowed={['master', 'certified'].includes(userTier?.toLowerCase()) || (graceInfo && !graceInfo.isExpired && graceInfo.daysLeft > 30)}
        isBackupAllowed={['master', 'certified'].includes(userTier?.toLowerCase())}
        onNfcScan={['master', 'certified'].includes(userTier?.toLowerCase()) ? onNfcScan : undefined}
      />
      
      {/* [라이선스 알림]: 라이선스 미인증 상태일 때 단계별 경고 배너 기동 */}
      {!isLicenseCertified() && graceInfo && (
        graceInfo.isExpired ? (
          /* 1) 만료 완료 배너 (빨간색) */
          <div className="mx-2 mb-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-red-800 animate-fade-in relative z-20 shadow-sm leading-relaxed select-none">
            <div className="flex items-start gap-2">
              <span className="shrink-0 leading-none text-red-600 font-black">[알림]</span>
              <div className="font-bold text-left">
                Trial 무료 이용 기간이 만료되었습니다. 지속적인 지공 관리와 안전한 구글 드라이브 백업을 이용하시려면 정식 라이선스를 등록해 주세요.
              </div>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full sm:w-auto shrink-0 bg-red-600 text-white hover:bg-red-700 px-3.5 py-2 rounded-xl font-extrabold transition-all active:scale-95 text-center shadow-md shadow-red-100"
            >
              인증하기
            </button>
          </div>
        ) : (
          /* 2) 만료 전 30일 경고 배너 (노란색) */
          graceInfo.daysLeft <= 30 && (
            <div className="mx-2 mb-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-800 animate-fade-in relative z-20 shadow-sm leading-relaxed select-none">
              <div className="flex items-start gap-2">
                <span className="shrink-0 leading-none text-amber-600 font-black">[알림]</span>
                <div className="font-bold text-left">
                  인증 유예 기간이 <span className="text-amber-600 font-extrabold text-sm underline">D-{graceInfo.daysLeft}일</span> 남았습니다. 
                  지속적인 지공 관리와 안전한 구글 드라이브 백업을 위해 라이선스 인증을 완료해 주세요.
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-full sm:w-auto shrink-0 bg-amber-600 text-white hover:bg-amber-700 px-3.5 py-2 rounded-xl font-extrabold transition-all active:scale-95 text-center shadow-md shadow-amber-100"
              >
                인증하기
              </button>
            </div>
          )
        )
      )}

      <CustomerList 
        customers={displayedCustomers} 
        onDelete={(e, c) => { e.stopPropagation(); setDeleteRequest(c); }} 
        onEdit={(e, c) => { e.stopPropagation(); setEditId(c.id); setCustomerData(c); setShowModal(true); }} 
        onSelect={(customer) => {
          if (!isLicenseCertified() && graceInfo && graceInfo.isExpired) {
            setFeedback({ 
              message: '💡 Trial 무료 체험 기간이 만료되어 정식 등록이 필요합니다. 클라우드 설정 메뉴에서 라이선스를 연동하실 수 있습니다.', 
              tone: 'warning' 
            });
          }
          onSelectCustomer(customer);
        }} 
      />
      
      {showModal && (
        <CustomerFormModal customerData={customerData} editId={editId} onChange={setCustomerData} onClose={() => setShowModal(false)} onSubmit={handleSaveCustomer} />
      )}

      {/* 1차 삭제 확인 모달 (ProDrill AI 설정 모달 디자인 기준 일치화) */}
      {deleteRequest && !showSecondDeleteConfirm && (
        <ModalShell
          onClose={() => { setDeleteRequest(null); setShowSecondDeleteConfirm(false); }}
          size="sm"
          title="🗑️ 고객 삭제 확인"
          titleId="first-delete-confirm-title"
          zClassName="z-[150]"
        >
          <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
            {/* 설명 단락 */}
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              선택하신 고객 정보 삭제 절차를 진행합니다.
            </p>

            {/* 경고 영역 컨테이너 (AI 설정 모달 디자인 기준 일치화) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{"\u26A0\uFE0F"}</span>
                <h3 className="text-sm font-black text-slate-800">고객 삭제 안내</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-normal">
                  <strong className="text-slate-800 font-extrabold">{deleteRequest.name}</strong> 님을 고객 목록에서 삭제하시겠습니까?
                </p>
              </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => { setDeleteRequest(null); setShowSecondDeleteConfirm(false); }}
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <Button 
                onClick={() => setShowSecondDeleteConfirm(true)}
                size="sm"
                variant="danger"
              >
                다음 단계
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 2차 삭제 확인 모달 (ProDrill AI 설정 모달 디자인 기준 일치화) */}
      {deleteRequest && showSecondDeleteConfirm && (
        <ModalShell
          onClose={() => { setDeleteRequest(null); setShowSecondDeleteConfirm(false); }}
          size="sm"
          title={"\uD83D\uDEA8 최종 영구 삭제 확인"}
          titleId="final-delete-confirm-title"
          zClassName="z-[150]"
        >
          <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
            {/* 설명 단락 */}
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              고객 데이터 및 연결된 모든 지공 차트 기록의 최종 영구 파기 단계입니다.
            </p>

            {/* 경고 영역 컨테이너 (AI 설정 모달 디자인 기준 일치화) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{"\uD83D\uDEA8"}</span>
                <h3 className="text-sm font-black text-slate-800">영구 파기 경고</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-normal">
                  정말로 <strong className="text-slate-800 font-extrabold">{deleteRequest.name}</strong> 님을 영구 삭제하시겠습니까?<br /><br />
                  <strong className="text-rose-600 font-bold">※ 이 고객과 연결된 모든 지공 차트 기록도 함께 영구 삭제되며 복구할 수 없습니다.</strong>
                </p>
              </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => { setDeleteRequest(null); setShowSecondDeleteConfirm(false); }}
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteChartHistory(deleteRequest);

                    const updatedCustomers = customers.filter(c => c.id !== deleteRequest.id);
                    const success = await saveCustomers(updatedCustomers);

                    if (success) {
                      setCustomers(updatedCustomers);
                      setDeleteRequest(null);
                      setShowSecondDeleteConfirm(false);
                      setFeedback({ message: '고객 정보와 관련 차트가 모두 삭제되었습니다.', tone: 'success' });
                      autoSyncOnChange(); // ☁️ 변경사항 자동 백업 트리거
                    } else {
                      setFeedback({ message: '삭제 실패', tone: 'danger' });
                    }
                  } catch (error) {
                    console.error("삭제 중 오류:", error);
                    setFeedback({ message: '삭제 작업 중 오류가 발생했습니다.', tone: 'danger' });
                  }
                }}
                type="button"
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black transition-colors active:scale-95 text-center shadow-md shadow-rose-600/10"
              >
                영구 삭제
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} onFeedback={setFeedback} />
      )}

      {showEnvironmentSettingsModal && (
        <GeneralSettingsModal onClose={() => setShowEnvironmentSettingsModal(false)} onFeedback={setFeedback} />
      )}

      {showBackupSettingsModal && (
        <BackupSettingsModal onClose={() => setShowBackupSettingsModal(false)} onFeedback={setFeedback} />
      )}

      {showAiSettingsModal && (
        <AiSettingsModal onClose={() => setShowAiSettingsModal(false)} onFeedback={setFeedback} />
      )}

      {showAdminSettingsModal && (
        <AdminSettingsModal onClose={() => setShowAdminSettingsModal(false)} onFeedback={setFeedback} />
      )}

      {showUserManualModal && (
        <UserManualModal onClose={() => setShowUserManualModal(false)} />
      )}

      {showProfileOnboardingModal && (() => {
        const displayGoogleEmail = (activeEmail && activeEmail !== 'guest@prodrill.local')
          ? activeEmail
          : (typeof window !== 'undefined' ? (localStorage.getItem('prodrill_linked_email') || localStorage.getItem('prodrill_certified_email_plain') || activeEmail) : activeEmail);
        return (
          <ProfileOnboardingModal
            isOpen={showProfileOnboardingModal}
            email={displayGoogleEmail}
            onFeedback={setFeedback}
            onSave={async (profileData) => {
              await saveUserProfile(displayGoogleEmail, profileData, 'user');
              setShowProfileOnboardingModal(false);
              setFeedback({ message: '🎉 지공사 프로필 등록이 완료되었습니다. 서비스 이용을 시작합니다!', tone: 'success' });
            }}
          />
        );
      })()}

      {showUpdateModal && (
        <AppUpdateModal onClose={() => setShowUpdateModal(false)} onFeedback={setFeedback} />
      )}

      <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} tone={feedback?.tone} />
    </PageShell>
  );
}