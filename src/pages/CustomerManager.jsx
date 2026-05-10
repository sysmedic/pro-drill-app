import { useEffect, useState } from 'react';
import { deleteChartHistory, renameChartHistory } from '../lib/chartHistoryStorage.js';
import { CUSTOMERS_KEY } from '../lib/storageKeys.js';
import CustomerFormModal from './customerManager/CustomerFormModal.jsx';
import CustomerHeader from './customerManager/CustomerHeader.jsx';
import CustomerList from './customerManager/CustomerList.jsx';

const loadLocal = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.error("스토리지 읽기 에러:", e);
    return fallback;
  }
};

export default function CustomerManagement({ onSelectCustomer }) {
  const [customers, setCustomers] = useState(() => loadLocal(CUSTOMERS_KEY, []));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('latest');

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    gender: '',
    hand: '',
    style: '',
  });

  useEffect(() => {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  }, [customers]);

  const optimizeScreen = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    window.scrollTo(0, 0);
    alert('📱 디바이스 화면 높이가 최적화되었습니다.');
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
    if (!customerData.name.trim()) return alert("이름을 입력해주세요!");

    if (editId) {
      const originalCustomer = customers.find(c => c.id === editId);
      const trimmedName = customerData.name.trim();

      if (originalCustomer && originalCustomer.name !== trimmedName) {
        renameChartHistory({
          id: originalCustomer.id,
          oldName: originalCustomer.name,
          newName: trimmedName,
        });
      }

      const updated = customers.map(c =>
        c.id === editId ? { ...c, ...customerData, name: trimmedName } : c
      );
      setCustomers(updated);
    } else {
      const newCustomer = {
        ...customerData,
        id: `cus_${Date.now()}`,
        name: customerData.name.trim(),
        createdAt: new Date().toLocaleDateString(),
      };
      setCustomers([newCustomer, ...customers]);
    }

    setShowModal(false);
  };

  const handleDelete = (e, customer) => {
    e.stopPropagation();
    const customerName = customer.name;
    if (window.confirm(`⚠️ 1차 경고\n${customerName} 고객 정보를 삭제하시겠습니까?`)) {
      if (window.confirm(`🚨 2차 경고\n정말로 영구 삭제하시겠습니까?\n삭제 후에는 고객의 모든 지공 기록이 함께 영구히 삭제되며 절대 복원할 수 없습니다.`)) {
        const updated = customers.filter(c => c.id !== customer.id);
        setCustomers(updated);
        deleteChartHistory(customer);
      }
    }
  };

  let filteredCustomers = customers.filter(c =>
    c.name.includes(searchQuery) || (c.phone && c.phone.includes(searchQuery))
  );

  if (sortType === 'name') {
    filteredCustomers.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="w-full max-w-[768px] mx-auto p-2 sm:p-4 bg-slate-50 min-h-screen relative pb-24" style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}>
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
    </div>
  );
}
