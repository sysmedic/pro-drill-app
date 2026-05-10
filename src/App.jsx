import { useState } from 'react';
import CustomerManager from './pages/CustomerManager.jsx';
import ChartDetail from './pages/ChartDetail.jsx';

export default function App() {
  // 선택된 고객 정보를 관리하는 State
  // null이면 고객 목록 화면을 보여주고, 데이터가 있으면 해당 고객의 차트 화면을 보여줍니다.
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  return (
    <div className="bg-slate-200 min-h-screen font-sans selection:bg-indigo-100 w-full">
      
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        html, body { overflow-x: hidden; overflow-y: scroll; }
      `}</style>

      {!selectedCustomer ? (
        // 1. 선택된 고객이 없을 때: 고객 관리(목록) 화면 렌더링
        <CustomerManager 
          onSelectCustomer={(customer) => setSelectedCustomer(customer)} 
        />
      ) : (
        // 2. 고객을 선택했을 때: 지공 차트(상세) 화면 렌더링
        <ChartDetail 
          customer={selectedCustomer} 
          onBack={() => setSelectedCustomer(null)} 
        />
      )} 

    </div>
  );
}
