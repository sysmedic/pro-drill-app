import { useState, useEffect } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import { ConfirmModal, FeedbackToast } from '../components/ui/Dialogs.jsx';
import { db, auth } from '../firebase'; 
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import CustomerHeader from './customerManager/CustomerHeader.jsx';
import CustomerList from './customerManager/CustomerList.jsx';
import CustomerFormModal from './customerManager/CustomerFormModal.jsx';

export default function CustomerManagement({ onSelectCustomer, isAdmin, onOpenAdmin, isMenuOpen, setIsMenuOpen, onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('latest');
  const [feedback, setFeedback] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', gender: '', hand: '', style: '' });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'customers'), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerData.name.trim()) return setFeedback({ message: '이름을 입력하세요.', tone: 'warning' });
    try {
      if (editId) {
        await updateDoc(doc(db, 'customers', editId), { ...customerData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'customers'), { ...customerData, userId: auth.currentUser.uid, createdAt: serverTimestamp() });
      }
      setShowModal(false);
      setFeedback({ message: '저장되었습니다.', tone: 'success' });
    } catch (e) { setFeedback({ message: '실패', tone: 'danger' }); }
  };

  const filtered = customers.filter(c => c.name.includes(searchQuery) || (c.phone && c.phone.includes(searchQuery)));
  if (sortType === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageShell bottomPadding="pb-24">
      <CustomerHeader
        customerCount={customers.length}
        onAdd={() => { setEditId(null); setCustomerData({ name: '', phone: '', gender: '', hand: '', style: '' }); setShowModal(true); }}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        sortType={sortType} setSortType={setSortType}
        isAdmin={isAdmin} onOpenAdmin={onOpenAdmin}
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} onLogout={onLogout}
      />
      <CustomerList customers={filtered} onDelete={(e, c) => { e.stopPropagation(); setDeleteRequest(c); }} onEdit={(e, c) => { e.stopPropagation(); setEditId(c.id); setCustomerData(c); setShowModal(true); }} onSelect={onSelectCustomer} />
      
      {showModal && (
        <CustomerFormModal customerData={customerData} editId={editId} onChange={setCustomerData} onClose={() => setShowModal(false)} onSubmit={handleSaveCustomer} />
      )}

      {/* 1차 삭제 확인 모달 */}
      {deleteRequest && !showSecondDeleteConfirm && (
        <ConfirmModal
          confirmLabel="삭제"
          danger={true}
          message={`${deleteRequest.name}님을 삭제할까요?`}
          onCancel={() => {
            setDeleteRequest(null);
            setShowSecondDeleteConfirm(false);
          }}
          onConfirm={() => setShowSecondDeleteConfirm(true)}
          title="고객 삭제 확인"
          titleId="first-delete-confirm-title"
        />
      )}

      {/* 2차 삭제 확인 모달 (1차 확인 후 표시) */}
      {deleteRequest && showSecondDeleteConfirm && (
        <ConfirmModal
          confirmLabel="영구 삭제"
          danger={true}
          message={`정말로 ${deleteRequest.name}님을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
          onCancel={() => {
            setDeleteRequest(null);
            setShowSecondDeleteConfirm(false);
          }}
          onConfirm={async () => {
            await deleteDoc(doc(db, 'customers', deleteRequest.id));
            setDeleteRequest(null);
            setShowSecondDeleteConfirm(false);
            setFeedback({ message: '고객 정보가 영구 삭제되었습니다.', tone: 'success' });
          }}
          title="최종 삭제 확인"
          titleId="final-delete-confirm-title"
        />
      )}

      <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} tone={feedback?.tone} />
    </PageShell>
  );
}