import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { 
  collection, onSnapshot, doc, updateDoc, query, orderBy, 
  getDocs, where, writeBatch 
} from 'firebase/firestore';
// 🌟 슈파베이스 클라이언트 및 모드 스위치 수입
import { supabase, dbMode } from '../../supabaseClient';

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isRecalculating, setIsRecalculating] = useState(false);
  // 🌟 마이그레이션 구동 상태 관리를 위한 신설 상태 변수
  const [isMigrating, setIsMigrating] = useState(false);

  // 활성화된 탭 상태 ('search', 'management', 'charts')
  const [activeTab, setActiveTab] = useState('search');

  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // 📊 통계 탭 전용 정렬 기준 상태 ('customer' 또는 'chart')
  const [statsType, setStatsType] = useState('customer');

  // 🟢 마스터 제어실 진입 시 강제 1배율 리셋 (타이머 꼬임 방지 적용 - 원본 유지)
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
  }, []);

  // 1. 사용자 데이터만 단독 실시간 구독 (비용 절감 - 원본 유지)
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

  // 🌟 [벌크 업서트 최적화 개정 + 유령 차트 예외 가드 가동 완료]
  const handleFullMigration = async () => {
    const confirmMsg = "💾 [과거 데이터 벌크 미러링 이행]\n\n파이어베이스에 축적된 전수 데이터(지공사, 고객, 지공 차트)를 하나의 패킷으로 묶어 슈파베이스로 초고속 고속도로 이주를 시작합니다.\n\n중복 데이터는 안전하게 최신 본으로 덮어씌워집니다. 진행하시겠습니까?";
    if (!window.confirm(confirmMsg)) return;

    setIsMigrating(true);
    try {
      // ---------------------------------------------------------------
      // 1. users 마스터 벌크 수집 및 적재
      // ---------------------------------------------------------------
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userRows = [];

      for (const userDoc of usersSnapshot.docs) {
        const uData = userDoc.data();
        const emailKey = userDoc.id;
        let joinedAtIso = new Date().toISOString();
        if (uData.joinedAt) {
          joinedAtIso = typeof uData.joinedAt.toDate === 'function' 
            ? uData.joinedAt.toDate().toISOString() 
            : new Date(uData.joinedAt).toISOString();
        }
        const shadowUserPayload = { ...uData, joinedAt: joinedAtIso };

        userRows.push({
          email: emailKey,
          uid: uData.uid || '',
          displayName: uData.displayName || '인증된 지공사',
          status: uData.status || 'active',
          tier: uData.tier || 'standard',
          customerCount: uData.customerCount || 0,
          chartCount: uData.chartCount || 0,
          maxDevices: uData.maxDevices || 2,
          activeDevices: uData.activeDevices || [],
          joinedAt: joinedAtIso,
          user_data: shadowUserPayload
        });
      }

      if (userRows.length > 0) {
        const { error: uErr } = await supabase.from('users').upsert(userRows, { onConflict: 'email' });
        if (uErr) throw new Error(`지공사 벌크 적재 실패: ${uErr.message}`);
      }

      // ---------------------------------------------------------------
      // 2. customers 마스터 벌크 수집 및 적재
      // ---------------------------------------------------------------
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customerRows = [];
      // 🌟 [신설] 나스 DB에 정상 등록될 유효 고객 ID들을 기억할 가드 바스켓
      const validCustomerIds = new Set(); 

      for (const custDoc of customersSnapshot.docs) {
        const cData = custDoc.data();
        const twinCustomerId = custDoc.id;
        let createdAtIso = new Date().toISOString();
        let updatedAtIso = new Date().toISOString();
        if (cData.createdAt) createdAtIso = typeof cData.createdAt.toDate === 'function' ? cData.createdAt.toDate().toISOString() : new Date(cData.createdAt).toISOString();
        if (cData.updatedAt) updatedAtIso = typeof cData.updatedAt.toDate === 'function' ? cData.updatedAt.toDate().toISOString() : new Date(cData.updatedAt).toISOString();

        const shadowCustomerPayload = { ...cData, id: twinCustomerId, createdAt: createdAtIso, updatedAt: updatedAtIso };

        customerRows.push({
          id: twinCustomerId,
          userId: cData.userId || '',
          name: cData.name || '미지정 고객',
          phone: cData.phone || '',
          club: cData.club || '',
          gender: cData.gender || '',
          hand: cData.hand || '',
          style: cData.style || '',
          styleExtra: cData.styleExtra || '',
          createdAt: createdAtIso,
          updatedAt: updatedAtIso,
          customer_data: shadowCustomerPayload
        });

        // 유효 고객 ID 목록에 추가
        validCustomerIds.add(twinCustomerId);
      }

      if (customerRows.length > 0) {
        const { error: cErr } = await supabase.from('customers').upsert(customerRows, { onConflict: 'id' });
        if (cErr) throw new Error(`고객 벌크 적재 실패: ${cErr.message}`);
      }

      // ---------------------------------------------------------------
      // 3. drilling_charts 마스터 벌크 수집 및 적재
      // ---------------------------------------------------------------
      const chartsSnapshot = await getDocs(collection(db, 'drilling_charts'));
      const chartRows = [];

      for (const chartDoc of chartsSnapshot.docs) {
        const chData = chartDoc.data();
        const twinChartId = chartDoc.id;

        // 🌟 [오류 완치 가드] 이 차트가 가리키는 부모 고객 ID가 현재 고객 목록에 없다면 유령 데이터이므로 적재 대상에서 패스!
        if (chData.customerId && !validCustomerIds.has(chData.customerId)) {
          console.warn(`[유령 차트 패스] 부모 고객이 존재하지 않는 유령 지공 도면을 스킵했습니다. 차트 ID: ${twinChartId}, 부모 ID: ${chData.customerId}`);
          continue; 
        }

        let createdAtIso = new Date().toISOString();
        let updatedAtIso = new Date().toISOString();
        if (chData.createdAt) createdAtIso = typeof chData.createdAt.toDate === 'function' ? chData.createdAt.toDate().toISOString() : new Date(chData.createdAt).toISOString();
        if (chData.updatedAt) updatedAtIso = typeof chData.updatedAt.toDate === 'function' ? chData.updatedAt.toDate().toISOString() : new Date(chData.updatedAt).toISOString();

        const shadowChartPayload = { ...chData, id: twinChartId, createdAt: createdAtIso, updatedAt: updatedAtIso };

        chartRows.push({
          id: twinChartId,
          userId: chData.userId || '',
          customerId: chData.customerId || '',
          name: chData.name || '미지정 레이아웃 차트',
          timestamp: chData.timestamp || createdAtIso,
          ball_name: chData.ballName || chData.ball_name || '',
          intent: chData.intent || '',
          layout_info: chData.layoutInfo || chData.layout_info || '',
          createdAt: createdAtIso,
          updatedAt: updatedAtIso,
          chart_data: shadowChartPayload
        });
      }

      if (chartRows.length > 0) {
        const { error: chErr } = await supabase.from('drilling_charts').upsert(chartRows, { onConflict: 'id' });
        if (chErr) throw new Error(`지공차트 벌크 적재 실패: ${chErr.message}`);
      }

      alert("🎉 [벌크 미러링 대성공] 유령 데이터를 완벽하게 격리하고 전수 백필에 성공했습니다!");
    } catch (err) {
      console.error(err);
      alert(`❌ 벌크 미러링 실패: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // 🟢 전체 유저 통계 정밀 보정 로직 (Dual-Write 확장 통합)
  const handleRecalibrateStats = async () => {
    const confirmMsg = "⚠️ [위험] 서버에 등록된 모든 지공사의 고객 및 차트 데이터를 직접 전수조사하여 통계를 강제 교정합니다.\n\n정말로 진행하시겠습니까?";
    if (!window.confirm(confirmMsg)) return;

    setIsRecalculating(true);
    try {
      let batch = writeBatch(db);
      let opCount = 0;

      for (const u of users) {
        if (!u.uid) {
          console.warn(`[스킵] UID가 없는 유저 문서 발견: ${u.id}`);
          continue; 
        }

        console.log(`[계측 시작] 유저 UID: ${u.uid} (문서 ID: ${u.id})`);

        const custQ = query(collection(db, 'customers'), where('userId', '==', u.uid));
        const custSnap = await getDocs(custQ);
        const realCustomerCount = custSnap.size;

        const chartQ = query(collection(db, 'drilling_charts'), where('userId', '==', u.uid));
        const chartSnap = await getDocs(chartQ);
        const realChartCount = chartSnap.size;

        console.log(`👉 결과 - 고객: ${realCustomerCount}, 차트: ${realChartCount}`);

        const userRef = doc(db, 'users', u.id);
        batch.set(userRef, { 
          customerCount: realCustomerCount, 
          chartCount: realChartCount 
        }, { merge: true });

        // [보정-Dual] 슈파베이스 통계 칼럼 및 jsonb 주머니 동시 정밀 정형 업데이트
        if (dbMode === 'dual') {
          let joinedAtIso = new Date().toISOString();
          if (u.joinedAt) {
            joinedAtIso = typeof u.joinedAt.toDate === 'function' ? u.joinedAt.toDate().toISOString() : new Date(u.joinedAt).toISOString();
          }
          const freshShadowUser = { ...u, customerCount: realCustomerCount, chartCount: realChartCount, joinedAt: joinedAtIso };

          await supabase
            .from('users')
            .update({
              customerCount: realCustomerCount,
              chartCount: realChartCount,
              user_data: freshShadowUser
            })
            .eq('email', u.id);
        }

        opCount++;

        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      alert("✅ 모든 유저의 고객 및 차트 통계가 실제 데이터와 완벽하게 동기화되었습니다.");
    } catch (error) {
      console.error("통계 보정 에러:", error);
      alert(`❌ 통계 보정 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // 등급 정책 (원본 유지)
  const deviceMapping = {
    trial_beta: 2, beta: 2, standard: 1, pro: 2, expert: 3, master: 5 
  };

  // 로컬 고속 검색/필터/정렬 로직 (원본 유지)
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

  // 라이선스 랭크 격상 제어 (Dual-Write 구현)
  const handleChangeTier = async (id, newTier) => {
    try {
      // 1. 파이어베이스 교정
      await updateDoc(doc(db, 'users', id), { tier: newTier, maxDevices: deviceMapping[newTier] });
      
      // 2. 슈파베이스 듀얼 싱크 및 jsonb 주머니 데이터 정밀 가공 후 업데이트
      if (dbMode === 'dual') {
        const targeted = users.find(u => u.id === id);
        if (targeted) {
          let joinedAtIso = new Date().toISOString();
          if (targeted.joinedAt) joinedAtIso = typeof targeted.joinedAt.toDate === 'function' ? targeted.joinedAt.toDate().toISOString() : new Date(targeted.joinedAt).toISOString();
          const freshShadow = { ...targeted, tier: newTier, maxDevices: deviceMapping[newTier], joinedAt: joinedAtIso };

          await supabase
            .from('users')
            .update({ tier: newTier, maxDevices: deviceMapping[newTier], user_data: freshShadow })
            .eq('email', id);
        }
      }
    } catch (e) { alert("변경 실패"); }
  };

  // 기기 한도 수동 조절 제어 (Dual-Write 구현)
  const handleUpdateLimit = async (id, currentMax, delta) => {
    try {
      const nextMax = Math.max(0, (currentMax || 0) + delta);
      // 1. 파이어베이스 교정
      await updateDoc(doc(db, 'users', id), { maxDevices: nextMax });

      // 2. 슈파베이스 듀얼 싱크
      if (dbMode === 'dual') {
        const targeted = users.find(u => u.id === id);
        if (targeted) {
          let joinedAtIso = new Date().toISOString();
          if (targeted.joinedAt) joinedAtIso = typeof targeted.joinedAt.toDate === 'function' ? targeted.joinedAt.toDate().toISOString() : new Date(targeted.joinedAt).toISOString();
          const freshShadow = { ...targeted, maxDevices: nextMax, joinedAt: joinedAtIso };

          await supabase
            .from('users')
            .update({ maxDevices: nextMax, user_data: freshShadow })
            .eq('email', id);
        }
      }
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* 🌟 원클릭 전수 미러링 마이그레이션 실행 단추 탑재 */}
            <button 
              onClick={handleFullMigration} 
              disabled={isMigrating}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${isMigrating ? 'bg-emerald-300 text-white cursor-wait' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95'}`}
            >
              {isMigrating ? '💾 미러링 백필 중...' : '💾 과거 데이터 강제 미러링'}
            </button>
            <button 
              onClick={handleRecalibrateStats} 
              disabled={isRecalculating}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${isRecalculating ? 'bg-indigo-300 text-white cursor-wait' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95'}`}
            >
              {isRecalculating ? '🔄 계측 중...' : '🔄 전체 통계 정밀 보정'}
            </button>
            <button onClick={onBack} className="text-xs font-bold bg-slate-200 px-4 py-2 rounded-lg active:scale-95 transition-all">
              나가기
            </button>
          </div>
        </div>

        {/* 상단 내비게이션 탭 바 (원본 유지) */}
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

        {/* 차트 통계 전용 이원화 정렬 스위칭 바 (원본 유지) */}
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

        {/* 제어바 (원본 유지) */}
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
                            {/* 기기 바인딩 초기화 단추 (Dual-Write 구현) */}
                            <button onClick={async () => { 
                              if(window.confirm("초기화?")) {
                                await updateDoc(doc(db, 'users', u.id), { activeDevices: [] });
                                if (dbMode === 'dual') {
                                  let joinedAtIso = new Date().toISOString();
                                  if (u.joinedAt) joinedAtIso = typeof u.joinedAt.toDate === 'function' ? u.joinedAt.toDate().toISOString() : new Date(u.joinedAt).toISOString();
                                  const freshShadow = { ...u, activeDevices: [], joinedAt: joinedAtIso };
                                  await supabase.from('users').update({ activeDevices: [], user_data: freshShadow }).eq('email', u.id);
                                }
                              }
                            }}
                              className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg></button>
                            
                            {/* 유저 정상/차단 토글 단추 (Dual-Write 구현) */}
                            <button onClick={async () => { 
                              const next = u.status === 'active' ? 'blocked' : 'active'; 
                              await updateDoc(doc(db, 'users', u.id), { status: next });
                              if (dbMode === 'dual') {
                                let joinedAtIso = new Date().toISOString();
                                if (u.joinedAt) joinedAtIso = typeof u.joinedAt.toDate === 'function' ? u.joinedAt.toDate().toISOString() : new Date(u.joinedAt).toISOString();
                                const freshShadow = { ...u, status: next, joinedAt: joinedAtIso };
                                await supabase.from('users').update({ status: next, user_data: freshShadow }).eq('email', u.id);
                              }
                            }}
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

                      {/* [TAB 3] 차트 통계 (원본 유지) */}
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