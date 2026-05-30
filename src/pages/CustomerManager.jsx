import { useState, useEffect } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import { ConfirmModal, FeedbackToast } from '../components/ui/Dialogs.jsx';
import { db, auth } from '../firebase'; 
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, 
  serverTimestamp, orderBy, getDocs, writeBatch, increment,
  limit 
} from 'firebase/firestore';
import CustomerHeader from './customerManager/CustomerHeader.jsx';
import CustomerList from './customerManager/CustomerList.jsx';
import CustomerFormModal from './customerManager/CustomerFormModal.jsx';

export default function CustomerManagement({ 
  onSelectCustomer, 
  isAdmin, 
  onOpenAdmin, 
  isMenuOpen, 
  setIsMenuOpen, 
  onLogout,
  onNfcScan
}) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('latest');
  const [feedback, setFeedback] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // 유저 문서 기록 기반의 진짜 전체 고객 숫자를 담아둘 상태를 선언합니다.
  const [totalCount, setTotalCount] = useState(0);

  // 유저 등급 필드를 안전하게 파싱하여 담아둘 상태 변수 선언
  const [userTier, setUserTier] = useState('basic');

  const [customerData, setCustomerData] = useState({ 
    name: '', 
    club: '', 
    phone: '', 
    gender: '', 
    hand: '', 
    style: '',
    styleExtra: '' 
  });

  // 비용 걱정 없는 단 1회성 유저 레코드 카운트 실시간 구독 파이프라인
  useEffect(() => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    
    const userRef = doc(db, 'users', auth.currentUser.email);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setTotalCount(snapshot.data().customerCount || 0);
        // Firestore 내 유저 문서 정보에서 등급 문자열 키 수거
        setUserTier(snapshot.data().tier || 'basic');
      }
    });
    return () => unsubscribe();
  }, []);

  // 리스트업 되지 않은 전체 고객까지 차별 없이 완벽하게 검색하도록 데이터 파이프라인 최적화 단일화
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // 복합 인덱스 오류를 원천 차단하고 전화번호/이름 중간 글자 검색까지 전체 기저 데이터 대상으로 유연하게 지원하기 위해 유저의 전체 목록을 가져옵니다.
    const q = query(
      collection(db, 'customers'), 
      where('userId', '==', auth.currentUser.uid), 
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      })));
    }, (error) => {
      console.error("고객 목록 로드 실패:", error);
    });
    return () => unsubscribe();
  }, []); // searchQuery 의존성을 제거하여 무분별한 네트워크 재요청 및 인덱스 누락으로 인한 먹통 현상을 완벽 차단합니다.

  // 화면 진입 및 주요 모달 전환 시 강제 1배율 리셋
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

  // 고객 저장/수정 함수
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerData.name.trim()) return setFeedback({ message: '이름을 입력하세요.', tone: 'warning' });
    try {
      if (editId) {
        await updateDoc(doc(db, 'customers', editId), { ...customerData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'customers'), { 
          ...customerData, 
          userId: auth.currentUser.uid, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp() 
        });
        
        if (auth.currentUser?.email) {
          await updateDoc(doc(db, 'users', auth.currentUser.email), {
            customerCount: increment(1)
          });
        }
      }
      setShowModal(false);
      setFeedback({ message: '저장되었습니다.', tone: 'success' });
    } catch (e) { setFeedback({ message: '실패', tone: 'danger' }); }
  };

  const filtered = customers.filter(c => c.name.includes(searchQuery) || (c.phone && c.phone.includes(searchQuery)));

  // 최신 지공/수정일순(Firestore 기본 정렬) 데이터에서 최상위 30명을 "먼저" 선별합니다.
  const displayedCustomers = filtered.slice(0, 30);

  // 선별이 완료된 고정 30명 안에서만 이름순 정렬이 구동되도록 순서를 전환합니다.
  if (sortType === 'name') {
    displayedCustomers.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <PageShell bottomPadding="pb-24">
      <CustomerHeader
        totalCount={totalCount}
        // 헤더 내부의 카운트 표기도 현재 필터링되어 화면에 매칭된 실제 고객 숫자로 실시간 정밀 연동합니다.
        currentCount={displayedCustomers.length}
        onAdd={() => { 
          setEditId(null); 
          setCustomerData({ name: '', club: '', phone: '', gender: '', hand: '', style: '', styleExtra: '' }); 
          setShowModal(true); 
        }}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        sortType={sortType} setSortType={setSortType}
        isAdmin={isAdmin} onOpenAdmin={onOpenAdmin}
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} onLogout={onLogout}
        
        /* 🎯 [등급 기준 교정]: expert 또는 master 등급 이상일 때만 스캔 핸들러를 바인딩하도록 정밀 타격 반영 완료 */
        onNfcScan={['expert', 'master'].includes(userTier?.toLowerCase()) ? onNfcScan : undefined}
      />
      {/* 리스트 뷰어에도 전체가 아닌 조건부 필터링이 완료된 최적화 데이터 명단(displayedCustomers)을 바인딩합니다. */}
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
              const batch = writeBatch(db);
              const chartsRef = collection(db, 'drilling_charts');
              const q = query(chartsRef, where('customerId', '==', deleteRequest.id));
              const chartSnapshots = await getDocs(q);
              const deletedChartsCount = chartSnapshots.size;

              chartSnapshots.forEach((chartDoc) => { batch.delete(chartDoc.ref); });
              const customerRef = doc(db, 'customers', deleteRequest.id);
              batch.delete(customerRef);

              if (auth.currentUser?.email) {
                const userRef = doc(db, 'users', auth.currentUser.email);
                batch.update(userRef, {
                  customerCount: increment(-1),
                  chartCount: increment(-deletedChartsCount)
                });
              }

              await batch.commit();
              setDeleteRequest(null);
              setShowSecondDeleteConfirm(false);
              setFeedback({ message: '고객 정보와 관련 차트가 모두 삭제되었습니다.', tone: 'success' });
            } catch (error) {
              console.error("삭제 중 오류:", error);
              setFeedback({ message: '삭제 작업 중 오류가 발생했습니다.', tone: 'danger' });
            }
          }}
          title="최종 삭제 확인"
          titleId="final-delete-confirm-title"
        />
      )}

      <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} tone={feedback?.tone} />
    </PageShell>
  );
}