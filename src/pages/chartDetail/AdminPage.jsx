import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { 
  collection, onSnapshot, doc, updateDoc, query, orderBy 
} from 'firebase/firestore';

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // 1. 데이터 구독
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 등급 정책 (master 등급 추가)
  const deviceMapping = {
    trial_beta: 2,
    beta: 2,
    standard: 1,
    pro: 2,
    expert: 3,
    master: 5 // 신규 추가
  };

  // 3. 로컬 고속 검색/필터 로직
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === 'all' || u.tier === filterTier;
      const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [users, searchTerm, filterTier, filterStatus]);

  // 핸들러 함수들
  const handleChangeTier = async (id, newTier) => {
    try {
      await updateDoc(doc(db, 'users', id), { 
        tier: newTier,
        maxDevices: deviceMapping[newTier] 
      });
    } catch (e) { alert("변경 실패"); }
  };

  const handleUpdateLimit = async (id, currentMax, delta) => {
    try {
      await updateDoc(doc(db, 'users', id), { maxDevices: Math.max(0, (currentMax || 0) + delta) });
    } catch (e) { alert("조절 실패"); }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400">데이터 동기화 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-black flex items-center gap-2">
            <span className="text-indigo-600">🛡️</span> 마스터 제어실
          </h1>
          <button onClick={onBack} className="text-xs font-bold bg-slate-200 px-4 py-2 rounded-lg active:scale-95 transition-all">
            나가기
          </button>
        </div>

        {/* 심플 제어바 (검색 & 필터) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input 
            type="text"
            placeholder="이름 또는 이메일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="col-span-1 md:col-span-1 p-3 rounded-xl border-none shadow-sm text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2 col-span-1 md:col-span-2">
            <select 
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="flex-1 p-3 rounded-xl border-none shadow-sm text-sm outline-none bg-white font-bold text-slate-500"
            >
              <option value="all">모든 등급</option>
              {Object.keys(deviceMapping).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 p-3 rounded-xl border-none shadow-sm text-sm outline-none bg-white font-bold text-slate-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">정상</option>
              <option value="blocked">차단</option>
            </select>
          </div>
        </div>

        {/* 유저 리스트 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">사용자</th>
                  <th className="p-4 text-center">등급 / 한도</th>
                  <th className="p-4 text-right">제어</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="font-bold text-sm text-slate-700">{u.displayName || '익명'}</div>
                          <div className="text-[10px] text-slate-400 leading-none">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <select 
                        value={u.tier || 'trial_beta'}
                        onChange={(e) => handleChangeTier(u.id, e.target.value)}
                        className="text-[10px] font-black bg-indigo-50 text-indigo-600 p-1 rounded mb-1 outline-none border-none"
                      >
                        <option value="trial_beta">TRIAL</option>
                        <option value="beta">BETA</option>
                        <option value="standard">STD</option>
                        <option value="pro">PRO</option>
                        <option value="expert">EXPERT</option>
                        <option value="master">MASTER</option>
                      </select>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleUpdateLimit(u.id, u.maxDevices, -1)} className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-xs font-bold">-</button>
                        <span className="text-[11px] font-bold text-slate-600">{u.activeDevices?.length || 0}/{u.maxDevices || 0}</span>
                        <button onClick={() => handleUpdateLimit(u.id, u.maxDevices, 1)} className="w-5 h-5 flex items-center justify-center bg-slate-800 text-white rounded text-xs font-bold">+</button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {/* 초기화 아이콘 */}
                        <button 
                          onClick={async () => { if(window.confirm("기기 초기화?")) await updateDoc(doc(db, 'users', u.id), { activeDevices: [] }); }}
                          className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="기기 초기화"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                        </button>
                        
                        {/* 차단/해제 아이콘 */}
                        <button 
                          onClick={async () => {
                            const next = u.status === 'active' ? 'blocked' : 'active';
                            await updateDoc(doc(db, 'users', u.id), { status: next });
                          }}
                          className={`p-2 rounded-lg transition-all ${u.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}
                          title={u.status === 'active' ? '사용자 차단' : '차단 해제'}
                        >
                          {u.status === 'active' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}