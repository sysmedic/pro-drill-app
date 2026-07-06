import { useState, useEffect } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import { ConfirmModal, FeedbackToast } from '../components/ui/Dialogs.jsx';
import { db, auth } from '../firebase'; 
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, 
  serverTimestamp, orderBy, getDocs, writeBatch, increment,
  limit, getDoc
} from 'firebase/firestore';
import CustomerHeader from './customerManager/CustomerHeader.jsx';
import CustomerList from './customerManager/CustomerList.jsx';
import CustomerFormModal from './customerManager/CustomerFormModal.jsx';
// 🌟 슈파베이스 클라이언트 및 모드 스위치 수입
import { supabase, dbMode } from '../supabaseClient'; 

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
  
  const [totalCount, setTotalCount] = useState(0);
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

  // 비용 걱정 없는 단 1회성 유저 레코드 카운트 실시간 구독 파이프라인 (Supabase 분기 추가)
  useEffect(() => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    
    // 🌟 Supabase 모드일 때 유저 등급 및 정보 나스에서 로드
    if (dbMode === 'supabase') {
      const fetchSbUserStats = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', auth.currentUser.email)
          .single();

        if (!error && data) {
          setTotalCount(data.customerCount || 0);
          setUserTier(data.tier || 'basic');
        }
      };
      fetchSbUserStats();
      return;
    }

    const userRef = doc(db, 'users', auth.currentUser.email);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setTotalCount(snapshot.data().customerCount || 0);
        setUserTier(snapshot.data().tier || 'basic');
      }
    });
    return () => unsubscribe();
  }, []);

  // 고객 명단 로드 파이프라인 (Supabase 분기 추가)
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // 🌟 Supabase 모드일 때 나스 DB의 customer_data jsonb 통주머니를 인양해와서 바인딩 테스트
    if (dbMode === 'supabase') {
      const fetchSbCustomers = async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('userId', auth.currentUser.uid)
          .order('updatedAt', { ascending: false });

        if (!error && data) {
          // jsonb 덩어리를 고스란히 복원하여 샴쌍둥이 고유 ID와 완전 결합
          setCustomers(data.map(row => ({
            id: row.id,
            ...row.customer_data
          })));
        } else {
          console.error("Supabase 고객 목록 로드 실패:", error);
        }
      };
      fetchSbCustomers();
      return;
    }

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

  // 고객 저장/수정 함수
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerData.name.trim()) return setFeedback({ message: '이름을 입력하세요.', tone: 'warning' });
    try {
      const isoTimestamp = new Date().toISOString();

      if (editId) {
        await updateDoc(doc(db, 'customers', editId), { ...customerData, updatedAt: serverTimestamp() });

        if (dbMode === 'dual' || dbMode === 'supabase') {
          const shadowUpdatePayload = { ...customerData, updatedAt: isoTimestamp };
          await supabase
            .from('customers')
            .update({
              name: customerData.name,
              phone: customerData.phone,
              club: customerData.club,
              gender: customerData.gender,
              hand: customerData.hand,
              style: customerData.style,
              styleExtra: customerData.styleExtra,
              updatedAt: isoTimestamp,
              customer_data: shadowUpdatePayload
            })
            .eq('id', editId);
        }
      } else {
        const docRef = await addDoc(collection(db, 'customers'), { 
          ...customerData, 
          userId: auth.currentUser.uid, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp() 
        });
        const twinId = docRef.id;

        if (dbMode === 'dual' || dbMode === 'supabase') {
          const shadowInsertPayload = {
            ...customerData,
            userId: auth.currentUser.uid,
            createdAt: isoTimestamp,
            updatedAt: isoTimestamp,
            activityLogs: []
          };

          await supabase
            .from('customers')
            .insert([{
              id: twinId,
              userId: auth.currentUser.uid,
              name: customerData.name,
              phone: customerData.phone,
              club: customerData.club,
              gender: customerData.gender,
              hand: customerData.hand,
              style: customerData.style,
              styleExtra: customerData.styleExtra,
              createdAt: isoTimestamp,
              updatedAt: isoTimestamp,
              customer_data: shadowInsertPayload
            }]);
        }
        
        if (auth.currentUser?.email) {
          await updateDoc(doc(db, 'users', auth.currentUser.email), {
            customerCount: increment(1)
          });

          if (dbMode === 'dual' || dbMode === 'supabase') {
            await supabase
              .from('users')
              .update({ customerCount: totalCount + 1 })
              .eq('email', auth.currentUser.email);
          }
        }
      }
      setShowModal(false);
      setFeedback({ message: '저장되었습니다.', tone: 'success' });
    } catch (e) { 
      console.error("고객 저장 파이프라인 에러:", e);
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
        isAdmin={isAdmin} onOpenAdmin={onOpenAdmin}
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} onLogout={onLogout}
        onNfcScan={['expert', 'master'].includes(userTier?.toLowerCase()) ? onNfcScan : undefined}
      />
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

              if (dbMode === 'dual' || dbMode === 'supabase') {
                await supabase.from('customers').delete().eq('id', deleteRequest.id);
              }

              if (auth.currentUser?.email) {
                const userRef = doc(db, 'users', auth.currentUser.email);
                batch.update(userRef, {
                  customerCount: increment(-1),
                  chartCount: increment(-deletedChartsCount)
                });

                if (dbMode === 'dual' || dbMode === 'supabase') {
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                    const freshData = userSnap.data();
                    const newCustomerCount = (freshData.customerCount || 0) - 1;
                    const newChartCount = (freshData.chartCount || 0) - deletedChartsCount;

                    await supabase
                      .from('users')
                      .update({ customerCount: newCustomerCount, chartCount: newChartCount })
                      .eq('email', auth.currentUser.email);
                  }
                }
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