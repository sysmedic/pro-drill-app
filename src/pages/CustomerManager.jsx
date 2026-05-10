import { useState } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import { ConfirmModal, FeedbackToast } from '../components/ui/Dialogs.jsx';
import { deleteChartHistory, renameChartHistory } from '../lib/chartHistoryStorage.js';
import { loadCustomers, saveCustomers } from '../lib/customerStorage.js';
import CustomerFormModal from './customerManager/CustomerFormModal.jsx';
import CustomerHeader from './customerManager/CustomerHeader.jsx';
import CustomerList from './customerManager/CustomerList.jsx';

export default function CustomerManagement({ onSelectCustomer }) {
  const [customers, setCustomers] = useState(() => loadCustomers());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('latest');
  const [feedback, setFeedback] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    gender: '',
    hand: '',
    style: '',
  });

  const persistCustomers = (nextCustomers) => {
    const didSave = saveCustomers(nextCustomers);

    if (!didSave) {
      setFeedback({
        message: '브라우저 저장공간에 기록하지 못했습니다. 새로고침하면 변경 내용이 사라질 수 있어 작업을 중단했습니다.',
        title: '저장 실패',
        tone: 'danger',
      });
      return false;
    }

    setCustomers(nextCustomers);
    return true;
  };

  const optimizeScreen = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    window.scrollTo(0, 0);
    setFeedback({ message: '디바이스 화면 높이가 최적화되었습니다.', tone: 'success' });
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setCustomerData({ name: '', phone: '', gender: '', hand: '', style: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (e, customer) => {
    e.stopPropagation();
    setEditId(customer.id);
    setCustomerData({
      name: customer.name,
      phone: customer.phone || '',
      gender: customer.gender || '',
      hand: customer.hand || '',
      style: customer.style || '',
    });
    setShowModal(true);
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    if (!customerData.name.trim()) {
      setFeedback({ message: '이름을 입력해주세요.', tone: 'warning' });
      return;
    }

    if (editId) {
      const originalCustomer = customers.find(c => c.id === editId);
      const trimmedName = customerData.name.trim();
      const updated = customers.map(c =>
        c.id === editId ? { ...c, ...customerData, name: trimmedName } : c
      );

      if (!persistCustomers(updated)) return;

      if (originalCustomer && originalCustomer.name !== trimmedName) {
        renameChartHistory({
          id: originalCustomer.id,
          oldName: originalCustomer.name,
          newName: trimmedName,
        });
      }

      setFeedback({ message: '고객 정보가 수정되었습니다.', tone: 'success' });
    } else {
      const newCustomer = {
        ...customerData,
        id: `cus_${Date.now()}`,
        name: customerData.name.trim(),
        createdAt: new Date().toLocaleDateString(),
      };
      if (!persistCustomers([newCustomer, ...customers])) return;
      setFeedback({ message: '신규 고객이 등록되었습니다.', tone: 'success' });
    }

    setShowModal(false);
  };

  const handleDelete = (e, customer) => {
    e.stopPropagation();
    setDeleteRequest({ customer, step: 1 });
  };

  const confirmDelete = () => {
    if (!deleteRequest) return;

    if (deleteRequest.step === 1) {
      setDeleteRequest({ ...deleteRequest, step: 2 });
      return;
    }

    const updated = customers.filter(c => c.id !== deleteRequest.customer.id);
    if (!persistCustomers(updated)) return;

    deleteChartHistory(deleteRequest.customer);
    setDeleteRequest(null);
    setFeedback({ message: `${deleteRequest.customer.name} 고객 정보를 삭제했습니다.`, tone: 'success' });
  };

  let filteredCustomers = customers.filter(c =>
    c.name.includes(searchQuery) || (c.phone && c.phone.includes(searchQuery))
  );

  if (sortType === 'name') {
    filteredCustomers.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <PageShell bottomPadding="pb-24" style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}>
      <CustomerHeader
        customerCount={customers.length}
        onAdd={handleOpenAdd}
        onOptimize={optimizeScreen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortType={sortType}
        setSortType={setSortType}
      />

      <CustomerList
        customers={filteredCustomers}
        onDelete={handleDelete}
        onEdit={handleOpenEdit}
        onSelect={onSelectCustomer}
      />

      {showModal && (
        <CustomerFormModal
          customerData={customerData}
          editId={editId}
          onChange={setCustomerData}
          onClose={() => setShowModal(false)}
          onSubmit={handleSaveCustomer}
        />
      )}

      {deleteRequest && (
        <ConfirmModal
          confirmLabel={deleteRequest.step === 1 ? '계속' : '영구 삭제'}
          danger
          message={
            deleteRequest.step === 1
              ? `${deleteRequest.customer.name} 고객 정보를 삭제하시겠습니까?`
              : '정말로 영구 삭제하시겠습니까?\n삭제 후에는 고객의 모든 지공 기록이 함께 영구히 삭제되며 절대 복원할 수 없습니다.'
          }
          onCancel={() => setDeleteRequest(null)}
          onConfirm={confirmDelete}
          title={deleteRequest.step === 1 ? '고객 삭제' : '삭제 최종 확인'}
          titleId="customer-delete-confirm-title"
        />
      )}

      <FeedbackToast
        message={feedback?.message}
        onDismiss={() => setFeedback(null)}
        title={feedback?.title}
        tone={feedback?.tone}
      />
    </PageShell>
  );
}
