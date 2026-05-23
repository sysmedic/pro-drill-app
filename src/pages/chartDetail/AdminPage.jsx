import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { 
  collection, onSnapshot, doc, updateDoc, query, orderBy 
} from 'firebase/firestore';

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 활성화된 탭 상태 ('search', 'management', 'charts')
  const [activeTab, setActiveTab] = useState('search');

  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // 📊 통계 탭 전용 정렬 기준 상태 ('customer' 또는 'chart')
  const [statsType, setStatsType] = useState('customer');

  // 🟢 [추가] 마스터 제어실 진입 시 강제 1배율 리셋 (타이머 꼬임 방지 적용)
  useEffect(() => {
    let timeoutId;
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const unlockedViewport = 'width=device-width, initial-scale=1.0'; 
    
    if (viewportMeta) {
      // 강제로 1배율로 축소하여 실사이즈 복구
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      
      timeoutId = setTimeout(() => {
        // 브라우저 렌더링이 안정화될 즈음 다시 확대 가능하도록 원상복구
        viewportMeta.setAttribute('content', unlockedViewport); 
      }, 350);
    }

    return () => clearTimeout(timeoutId); 
  }, []); // 컴포넌트 마운트(진입) 시점에 작동

  // 1. 사용자 데이터만 단독 실시간 구독 (비용 절감)
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("❌ 유저 로드 실패:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 등급 정책
  const deviceMapping = {
    trial_beta: 2, beta: 2, standard: 1, pro: 2, expert: 3, master: 5 
  };

  // 로컬 고속 검색/필터/정렬 로직
  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchesSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === 'all' || u.tier === filterTier;
      const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchesSearch && matchesTier && matchesStatus;
    });

    if (activeTab === 'charts') {
      result.sort((a, b) => {
        if (statsType === 'customer') {
          return (b.customerCount || 0) - (a.customerCount || 0);
        } else {
          return (b.chartCount || 0) - (a.chartCount || 0);
        }
      });
    }

    return result;
  }, [users, searchTerm, filterTier, filterStatus, activeTab, statsType]);

  const formatJoinedAt = (timestamp) => {
    if (!timestamp) return '날짜 없음';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) { return '날짜 오류'; }
  };

  const handleChangeTier = async (id, newTier) => {
    try {
      await updateDoc(doc(db, 'users', id), { tier: newTier, maxDevices: deviceMapping[newTier] });
    } catch (e) { alert("변경 실패"); }
  };

  const handleUpdateLimit = async (id, currentMax, delta) => {
    try {
      await updateDoc(doc(db, 'users', id), { maxDevices: Math.max(0, (currentMax || 0) + delta) });
    } catch (e) { alert("조절 실패"); }
  };

  const getRankBadge = (index) => {
    if (index === 0) return '🥇 #1';
    if (index === 1) return '🥈 #2';
    if (index === 2) return '🥉 #3';
    return `#${index + 1}`;
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
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-xs font-bold bg-slate-200 px-4 py-2 rounded-lg active:scale-95 transition-all">
              나가기
            </button>
          </div>
        </div>

        {/* 상단 내비게이션 탭 바 */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 mb-4 gap-1">
          {['search', 'management', 'charts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] md:text-sm font-bold transition-all ${
                activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'search' && '🔍 검색/현황'}
              {tab === 'management' && '🎖️ 등급/한도'}
              {tab === 'charts' && '📊 차트 통계'}
            </button>
          ))}
        </div>

        {/* 차트 통계 전용 이원화 정렬 스위칭 바 */}
        {activeTab === 'charts' && (
          <div className="flex bg-slate-200/60 p-1 rounded-xl mb-4 max-w-[240px] gap-1 text-[11px] font-bold">
            <button 
              onClick={() => setStatsType('customer')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${statsType === 'customer' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              👥 고객순 정렬
            </button>
            <button 
              onClick={() => setStatsType('chart')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${statsType === 'chart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              📊 차트순 정렬
            </button>
          </div>
        )}

        {/* 제어바 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input 
            type="text" placeholder="이름 또는 이메일 검색..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-3 rounded-xl border-none shadow-sm text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2 col-span-1 md:col-span-2">
            <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
              className="flex-1 p-3 rounded-xl border-none shadow-sm text-sm outline-none bg-white font-bold text-slate-500"
            >
              <option value="all">모든 등급</option>
              {Object.keys(deviceMapping).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 p-3 rounded-xl border-none shadow-sm text-sm outline-none bg-white font-bold text-slate-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">정상</option>
              <option value="blocked">차단</option>
            </select>
          </div>
        </div>

        {/* 유저 리스트 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">지공사 정보</th>
                  {activeTab === 'search' && (
                    <>
                      <th className="p-4 text-center">현재 상태</th>
                      <th className="p-4 text-right">계정 제어</th>
                    </>
                  )}
                  {activeTab === 'management' && (
                    <>
                      <th className="p-4 text-center">라이선스</th>
                      <th className="p-4 text-right">기기 한도</th>
                    </>
                  )}
                  {activeTab === 'charts' && (
                    <>
                      <th className="p-4 text-center">누적 데이터량</th>
                      <th className="p-4 text-right">활동 랭킹</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u, index) => {
                  const currentCustomerCount = u.customerCount || 0; 
                  const currentChartCount = u.chartCount || 0;
                  
                  const topUser = filteredUsers[0];
                  let topCount = 1;
                  if (topUser) {
                    topCount = statsType === 'customer' ? (topUser.customerCount || 1) : (topUser.chartCount || 1);
                  }
                  const activeCount = statsType === 'customer' ? currentCustomerCount : currentChartCount;
                  const barWidth = Math.min(100, (activeCount / topCount) * 100);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="font-bold text-sm text-slate-700">{u.displayName || '익명'}</div>
                            <div className="text-[10px] text-slate-400 leading-none mb-1.5">{u.email}</div>
                            <div className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5">
                              📅 가입: {formatJoinedAt(u.joinedAt)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* [TAB 1] 검색 및 상태 */}
                      {activeTab === 'search' && (
                        <>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                              u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {u.status === 'active' ? '정상 사용' : '차단됨'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={async () => { if(window.confirm("초기화?")) await updateDoc(doc(db, 'users', u.id), { activeDevices: [] }); }}
                              className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg></button>
                            <button onClick={async () => { const next = u.status === 'active' ? 'blocked' : 'active'; await updateDoc(doc(db, 'users', u.id), { status: next }); }}
                              className={`p-2 rounded-lg transition-all ${u.status === 'active' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{u.status === 'active' ? '차단' : '해제'}</button>
                          </td>
                        </>
                      )}

                      {/* [TAB 2] 등급 및 관리 */}
                      {activeTab === 'management' && (
                        <>
                          <td className="p-4 text-center">
                            <select value={u.tier || 'trial_beta'} onChange={(e) => handleChangeTier(u.id, e.target.value)}
                              className="text-[10px] font-black bg-indigo-50 text-indigo-600 p-1.5 rounded-lg outline-none border border-indigo-100"
                            >
                              <option value="trial_beta">TRIAL</option>
                              <option value="beta">BETA</option>
                              <option value="standard">STD</option>
                              <option value="pro">PRO</option>
                              <option value="expert">EXPERT</option>
                              <option value="master">MASTER</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleUpdateLimit(u.id, u.maxDevices, -1)} className="w-5 h-5 bg-slate-100 rounded">-</button>
                              <span className="text-[10px] font-bold">{u.activeDevices?.length || 0}/{u.maxDevices || 0}</span>
                              <button onClick={() => handleUpdateLimit(u.id, u.maxDevices, 1)} className="w-5 h-5 bg-slate-800 text-white rounded">+</button>
                            </div>
                          </td>
                        </>
                      )}

                      {/* [TAB 3] 차트 통계 */}
                      {activeTab === 'charts' && (
                        <>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className={`text-center px-1.5 py-0.5 rounded ${statsType === 'customer' ? 'bg-emerald-50' : ''}`}>
                                <div className={`text-sm font-black ${statsType === 'customer' ? 'text-emerald-600' : 'text-slate-400'}`}>{currentCustomerCount}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase">고객</div>
                              </div>
                              <div className="w-[1px] h-5 bg-slate-100 shrink-0"></div>
                              <div className={`text-center px-1.5 py-0.5 rounded ${statsType === 'chart' ? 'bg-indigo-50' : ''}`}>
                                <div className={`text-sm font-black ${statsType === 'chart' ? 'text-indigo-600' : 'text-slate-400'}`}>{currentChartCount}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase">차트</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end justify-center">
                              <span className={`text-xs font-black ${index < 3 ? 'text-indigo-600 text-[13px]' : 'text-slate-600'}`}>
                                {getRankBadge(index)}
                              </span>
                              <div className="w-12 md:w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full ${statsType === 'customer' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${barWidth}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-sm font-bold text-slate-400">
                      조회된 지공사 데이터가 존재하지 않습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}