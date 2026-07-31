import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { licenseDb } from '../../lib/licenseFirebase.js';
import { getSha256Hash, MASTER_HASH } from '../../lib/userLicenseManager.js';
import Button from '../../components/ui/Button.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';

export default function AdminSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [newEmail, setNewEmail] = useState('');
  const [licensedUsers, setLicensedUsers] = useState([]);
  const [trialUsers, setTrialUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 라이선스 유저 및 Trial 사용자 목록 원격 로드
  const loadAdminData = async () => {
    setLoading(true);
    try {
      // (1) 라이선스 유저 목록 조회 및 로컬 정렬 (Firestore 인덱스 에러 방지)
      const licensesRef = collection(licenseDb, 'licenses');
      const querySnapshot = await getDocs(licensesRef);
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ hash: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });
      setLicensedUsers(list);

      // (2) Trial 사용자 목록 조회 및 로컬 정렬
      const trialRef = collection(licenseDb, 'trial_users');
      const trialSnap = await getDocs(trialRef);
      const tList = [];
      trialSnap.forEach((docSnap) => {
        tList.push({ hash: docSnap.id, ...docSnap.data() });
      });
      tList.sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });
      setTrialUsers(tList);
    } catch (e) {
      console.error("어드민 데이터 로드 실패:", e);
      onFeedback({ message: '원격 라이선스 데이터를 가져오는 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // 2. 신규 지공사 라이선스 등록 실행
  const handleAddLicense = async (e) => {
    if (e) e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      onFeedback({ message: '등록할 Gmail 주소를 입력해 주세요.', tone: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const hashed = await getSha256Hash(email);
      const docRef = doc(licenseDb, 'licenses', hashed);
      
      await setDoc(docRef, {
        userTier: 'certified',
        status: 'active',
        email: email, // 📧 식별 가능한 이메일 원문 저장
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      onFeedback({ message: `지공사(${email}) 라이선스가 즉시 등록되었습니다.`, tone: 'success' });
      setNewEmail('');
      loadAdminData(); // 목록 새로고침
    } catch (err) {
      console.error("지공사 등록 실패:", err);
      onFeedback({ message: '지공사 등록 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  // 3. 지공사 상태 전환 (locked <-> active)
  const handleToggleLockStatus = async (user) => {
    if (user.hash === MASTER_HASH) {
      onFeedback({ message: '마스터 개발자 계정은 잠금 처리할 수 없습니다.', tone: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const nextStatus = user.status === 'locked' ? 'active' : 'locked';
      const docRef = doc(licenseDb, 'licenses', user.hash);
      
      await setDoc(docRef, {
        status: nextStatus,
        updatedAt: serverTimestamp()
      }, { merge: true });

      onFeedback({ 
        message: `지공사 상태가 ${nextStatus === 'locked' ? '\uD83D\uDD12 잠금' : '\uD83D\uDD13 활성'} 상태로 변경되었습니다.`, 
        tone: 'success' 
      });
      loadAdminData();
    } catch (err) {
      console.error("지공사 상태 업데이트 실패:", err);
      onFeedback({ message: '상태 업데이트 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  // 타임스탬프 형식 변환 헬퍼
  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const date = new Date(ts.seconds * 1000);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <ModalShell onClose={onClose} size="sm" title={"\uD83D\uDC51 ProDrill 마스터 제어실"}>
      <div className="p-5 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
        
        {/* 통계 요약 */}
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{"\uD83D\uDCC8"}</span>
            <h3 className="text-sm font-black text-indigo-900">실시간 서비스 운영 현황</h3>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-indigo-800">
            <span>승인된 지공사 라이선스:</span>
            <span className="text-sm underline font-black">{licensedUsers.length}개</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-indigo-800">
            <span>체험 중인 지공사 (Trial):</span>
            <span className="text-sm underline font-black">{trialUsers.length}명</span>
          </div>
        </div>

        {/* A. 신규 지공사 라이선스 추가 폼 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{"\uD83D\uDD11"}</span>
            <h3 className="text-sm font-black text-slate-800">신규 지공사 라이선스 즉시 승인</h3>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            인증을 부여할 지공사의 구글 이메일을 입력하세요. 해시값으로 즉각 암호화되어 Firestore에 등록됩니다.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="driller@gmail.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
            <Button
              onClick={handleAddLicense}
              disabled={loading}
              size="sm"
              variant="primary"
            >
              승인 등록
            </Button>
          </div>
        </div>

        {/* B. 정식 라이선스 지공사 관리 목록 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{"\uD83D\uDC65"}</span>
            <h3 className="text-sm font-black text-slate-800">정식 승인 지공사 목록 및 원격 제어</h3>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {licensedUsers.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-3">승인된 지공사가 없습니다.</div>
            ) : (
              licensedUsers.map((user) => (
                <div key={user.hash} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl text-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-black text-slate-700 truncate">
                      {user.email || `${user.hash.substring(0, 16)}...`}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      등급: {user.userTier === 'master' ? '\uD83D\uDC51 MASTER' : '일반 지공사'} ({user.status === 'locked' ? '\uD83D\uDD12 잠금됨' : '\uD83D\uDD13 활성'})
                    </div>
                  </div>
                  
                  {user.hash !== MASTER_HASH && (
                    <button
                      onClick={() => handleToggleLockStatus(user)}
                      disabled={loading}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors ${
                        user.status === 'locked' 
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      }`}
                    >
                      {user.status === 'locked' ? '잠금 해제' : '원격 잠금'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* C. 체험판 (Trial) 지공사 실시간 모니터링 목록 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{"\u23F3"}</span>
            <h3 className="text-sm font-black text-slate-800">Trial 지공사 실시간 이용 목록</h3>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {trialUsers.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-3">현재 체험 중인 지공사가 없습니다.</div>
            ) : (
              trialUsers.map((user) => (
                <div key={user.hash} className="p-2.5 bg-white border border-slate-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-700 truncate max-w-[170px]">
                      {user.email || `체험 사용자 (${user.hash.substring(0, 8)})`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-700 font-black text-[9px]">
                      D-{user.daysLeft}일
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                    <span>최근 활성: {formatTimestamp(user.lastActive)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 닫기 액션 영역 */}
        <div className="flex justify-end pt-2">
          <button 
            onClick={onClose} 
            type="button"
            className="w-full sm:w-28 py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
          >
            닫기
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
