import { useState, useEffect } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import { ConfirmModal, FeedbackToast } from '../components/ui/Dialogs.jsx';
import CustomerHeader from './customerManager/CustomerHeader.jsx';
import CustomerList from './customerManager/CustomerList.jsx';
import CustomerFormModal from './customerManager/CustomerFormModal.jsx';
import { loadCustomers, saveCustomers } from '../lib/customerStorage.js';
import { createLocalId } from '../lib/ids.js';
import { autoSyncOnChange } from '../lib/syncService.js'; // ☁️ 실시간 백업 트리거 임포트
import SettingsModal from './customerManager/SettingsModal.jsx'; // ⚙️ 설정 모달 임포트
import { isLicenseCertified } from '../lib/userLicenseManager.js';

export default function CustomerManagement({ 
  onSelectCustomer, 
  onLogout,
  onNfcScan,
  graceInfo
}) {
  const [customers, setCustomers] = useState(() => {
    const result = loadCustomers();
    return result instanceof Promise ? [] : result;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('latest');
  const [feedback, setFeedback] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [totalCount, setTotalCount] = useState(0);
  const userTier = 'master'; // 로컬 전용이므로 master로 고정

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

  // 고객 명단 로드
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const list = await loadCustomers();
        setCustomers(list);
      } catch (err) {
        console.error("IndexedDB 고객 로드 실패:", err);
      }
    };
    fetchCustomers();
  }, []);

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
  }, [showModal, deleteRequest, showSecondDeleteConfirm]);

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
        const newCustomer = {
          ...customerData,
          id: createLocalId(),
          userId: 'local_driller', 
          createdAt: isoTimestamp,
          updatedAt: isoTimestamp 
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

  const filtered = customers.filter(c => c.name.includes(searchQuery) || (c.phone && c.phone.includes(searchQuery)));
  const displayedCustomers = filtered.slice(0, 30);

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
        onNfcScan={['expert', 'master'].includes(userTier?.toLowerCase()) ? onNfcScan : undefined}
      />
      
      {/* [라이선스 알림]: 라이선스 미인증 상태이고 유예 기간이 30일 이하로 남았을 때 상단 경고 배너 기동 */}
      {!isLicenseCertified() && graceInfo && graceInfo.daysLeft <= 30 && (
        <div className="mx-2 mb-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-800 animate-fade-in relative z-20 shadow-sm leading-relaxed select-none">
          <div className="flex items-start gap-2">
            <span className="shrink-0 leading-none text-amber-600 font-black">[알림]</span>
            <div className="font-bold">
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
      )}

      <CustomerList customers={displayedCustomers} onDelete={(e, c) => { e.stopPropagation(); setDeleteRequest(c); }} onEdit={(e, c) => { e.stopPropagation(); setEditId(c.id); setCustomerData(c); setShowModal(true); }} onSelect={onSelectCustomer} />
      
      {showModal && (
        <CustomerFormModal customerData={customerData} editId={editId} onChange={setCustomerData} onClose={() => setShowModal(false)} onSubmit={handleSaveCustomer} />
      )}

      {/* 1차 삭제 확인 모달 */}
      {deleteRequest && !showSecondDeleteConfirm && (
        <ConfirmModal
          confirmLabel="삭제"
          danger={true}
          message={`${deleteRequest.name}님을 삭제할까요?`}
          onCancel={() => { setDeleteRequest(null); setShowSecondDeleteConfirm(false); }}
          onConfirm={() => setShowSecondDeleteConfirm(true)}
          title="고객 삭제 확인"
          titleId="first-delete-confirm-title"
        />
      )}

      {/* 2차 삭제 확인 모달 */}
      {deleteRequest && showSecondDeleteConfirm && (
        <ConfirmModal
          confirmLabel="영구 삭제"
          danger={true}
          message={`정말로 ${deleteRequest.name}님을 영구 삭제하시겠습니까?\n이 고객과 연결된 모든 지공 차트도 함께 삭제됩니다.`}
          onCancel={() => { setDeleteRequest(null); setShowSecondDeleteConfirm(false); }}
          onConfirm={async () => {
            try {
              const { deleteChartHistory } = await import('../lib/chartHistoryStorage.js');
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
          title="최종 삭제 확인"
          titleId="final-delete-confirm-title"
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} onFeedback={setFeedback} />
      )}

      <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} tone={feedback?.tone} />
    </PageShell>
  );
}