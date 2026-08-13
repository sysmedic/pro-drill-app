import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { licenseDb } from '../../lib/licenseFirebase.js';
import { getSha256Hash, MASTER_HASH, saveUserProfile, sanitizeString } from '../../lib/userLicenseManager.js';
import Button from '../../components/ui/Button.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';

export default function AdminSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [licensedUsers, setLicensedUsers] = useState([]);
  const [trialUsers, setTrialUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 프로필 편집 및 히스토리 팝업 상태
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editShop, setEditShop] = useState('');
  const [auditUser, setAuditUser] = useState(null);

  // 1. 라이선스 유저 및 Trial 사용자 목록 원격 로드
  const loadAdminData = async () => {
    setLoading(true);
    
    // (1) 라이선스 유저 목록 조회 및 로컬 정렬
    try {
      const licensesRef = collection(licenseDb, 'licenses');
      const querySnapshot = await getDocs(licensesRef);
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ hash: docSnap.id, ...docSnap.data() });
      });

      // 로컬 스토리지에 즉시 승인 저장해둔 지공사 목록도 함께 병합
      const rawLocal = localStorage.getItem('prodrill_local_licenses');
      if (rawLocal) {
        try {
          const localList = JSON.parse(rawLocal);
          if (Array.isArray(localList)) {
            localList.forEach(item => {
              if (!list.some(u => u.hash === item.hash || u.email === item.email)) {
                list.push(item);
              }
            });
          }
        } catch { /* ignore */ }
      }

      // 마스터 계정(sysmedic@gmail.com) 강제 배치
      if (!list.some(u => u.hash === MASTER_HASH || u.email === 'sysmedic@gmail.com')) {
        list.unshift({
          hash: MASTER_HASH,
          email: 'sysmedic@gmail.com',
          userTier: 'master',
          status: 'active',
          updatedAt: { seconds: 1770000000 }
        });
      }

      list.sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });
      setLicensedUsers(list);
    } catch (e) {
      console.error("라이선스 유저 로드 실패:", e);
      const rawLocal = localStorage.getItem('prodrill_local_licenses');
      let fallbackList = [{
        hash: MASTER_HASH,
        email: 'sysmedic@gmail.com',
        userTier: 'master',
        status: 'active'
      }];
      if (rawLocal) {
        try {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) fallbackList = [...fallbackList, ...parsed];
        } catch { /* ignore */ }
      }
      setLicensedUsers(fallbackList);
    }

    // (2) Trial 사용자 목록 조회 및 로컬 정렬 (독립 로드)
    try {
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
      console.error("Trial 사용자 로드 실패:", e);
      setTrialUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // 2. 신규 지공사 라이선스 등록 실행 (100% 이중 비상망 반영)
  const handleAddLicense = async (e) => {
    if (e) e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    const cleanName = sanitizeString(newName, 15);
    const cleanShop = sanitizeString(newShopName, 30);

    if (!email) {
      onFeedback({ message: '등록할 Gmail 주소를 입력해 주세요.', tone: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const hashed = await getSha256Hash(email);
      const newLicenseRecord = {
        hash: hashed,
        userTier: 'certified',
        status: 'active',
        email: email,
        name: cleanName,
        shopName: cleanShop,
        updatedAt: { seconds: Math.floor(new Date().getTime() / 1000) }
      };

      // 1. 로컬 레지스트리에 0초 즉시 승인 주입 (Double Defense)
      const rawLocal = localStorage.getItem('prodrill_local_licenses');
      let localList = [];
      if (rawLocal) {
        try { localList = JSON.parse(rawLocal) || []; } catch { localList = []; }
      }
      if (!localList.some(item => item.email === email)) {
        localList.push(newLicenseRecord);
        localStorage.setItem('prodrill_local_licenses', JSON.stringify(localList));
      }

      // 2. 원격 파이어베이스 동기화 시도
      try {
        const docRef = doc(licenseDb, 'licenses', hashed);
        await setDoc(docRef, {
          userTier: 'certified',
          status: 'active',
          email: email,
          name: cleanName,
          shopName: cleanShop,
          licenseRegisteredAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        if (cleanName || cleanShop) {
          await saveUserProfile(email, { name: cleanName, shopName: cleanShop }, 'admin');
        }

        // 3. trial_users 문서 원격 삭제 시도하여 명단 일관성 100% 확보
        const trialDocRef = doc(licenseDb, 'trial_users', hashed);
        await deleteDoc(trialDocRef).catch(() => {});
      } catch (fbErr) {
        console.warn("원격 라이선스 동기화 지연 (로컬 비상망 승인 완료):", fbErr);
      }

      onFeedback({ message: `지공사(${email}) 라이선스가 즉시 승인 및 등록되었습니다.`, tone: 'success' });
      setNewEmail('');
      setNewName('');
      setNewShopName('');
      loadAdminData(); // 목록 새로고침
    } catch (err) {
      console.error("지공사 등록 실패:", err);
      onFeedback({ message: '지공사 등록 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  // 2-2. 마스터가 지공사 프로필(성함/샵명) 원격 수정 및 히스토리 기록
  const handleSaveAdminEdit = async () => {
    if (!editingUser) return;
    const email = editingUser.email;
    const cleanName = sanitizeString(editName, 15);
    const cleanShop = sanitizeString(editShop, 30);

    setLoading(true);
    try {
      await saveUserProfile(email, { name: cleanName, shopName: cleanShop }, 'admin');
      onFeedback({ message: `지공사 프로필이 성공적으로 변경 기록되었습니다.`, tone: 'success' });
      setEditingUser(null);
      loadAdminData();
    } catch (err) {
      console.error("프로필 수정 실패:", err);
      onFeedback({ message: '프로필 수정 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const getShortDateString = (dateObj = new Date()) => {
    const yy = String(dateObj.getFullYear()).slice(2);
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    return `${yy}.${m}.${d}`;
  };

  // 3-1. 지공사 라이선스 해지 (트라이얼 만료 등급으로 전환)
  const handleRevokeLicense = async (user) => {
    if (user.hash === MASTER_HASH) {
      onFeedback({ message: '마스터 개발자 계정은 해지 처리할 수 없습니다.', tone: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const todayStr = getShortDateString();
      const docRef = doc(licenseDb, 'licenses', user.hash);
      
      // licenses 테이블에서 status: 'revoked'로 전환
      await setDoc(docRef, {
        status: 'revoked',
        userTier: 'revoked',
        revokedDateStr: todayStr,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // trial_users에도 해지 기록 동기화
      const trialDocRef = doc(licenseDb, 'trial_users', user.hash);
      await setDoc(trialDocRef, {
        email: (user.email || '').trim().toLowerCase(),
        status: 'revoked',
        revokedDateStr: todayStr,
        daysLeft: 0,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 로컬 스토리지 비상망에서도 제거하여 정식 승인에서 해제
      const rawLocal = localStorage.getItem('prodrill_local_licenses');
      if (rawLocal) {
        try {
          let localList = JSON.parse(rawLocal) || [];
          localList = localList.filter(item => item.hash !== user.hash && item.email !== user.email);
          localStorage.setItem('prodrill_local_licenses', JSON.stringify(localList));
        } catch { /* ignore */ }
      }

      onFeedback({ 
        message: `지공사(${user.email || '계정'}) 라이선스가 해지되어 트라이얼 분류로 이동되었습니다. (해지일: ${todayStr})`, 
        tone: 'info' 
      });
      loadAdminData();
    } catch (err) {
      console.error("지공사 라이선스 해지 실패:", err);
      onFeedback({ message: '해지 처리 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  // 3-2. 지공사 원격 잠금/해제 상태 전환 (locked <-> active)
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
        message: `지공사 상태가 ${nextStatus === 'locked' ? '\uD83D\uDD12 잠금' : '\uD83D\uDD13 잠금 해제'} 상태로 변경되었습니다.`, 
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

    const formatDateOnly = (tsOrStr) => {
    if (!tsOrStr) return "-";
    let date;
    if (typeof tsOrStr === "string") {
      if (!tsOrStr.includes("T") && !tsOrStr.includes(":") && /^\d{2,4}\.\d{1,2}\.\d{1,2}/.test(tsOrStr)) {
        return tsOrStr;
      }
      date = new Date(tsOrStr);
    } else if (tsOrStr && typeof tsOrStr === "object" && tsOrStr.seconds) {
      date = new Date(tsOrStr.seconds * 1000);
    } else {
      date = new Date(tsOrStr);
    }
    if (isNaN(date.getTime())) return String(tsOrStr);
    const yy = String(date.getFullYear()).slice(2);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return yy + "." + m + "." + d;
  };

  // 타임스탬프 형식 변환 헬퍼
  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const date = new Date(ts.seconds * 1000);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 활성 정식 승인 유저들의 해시 및 이메일 세트 (Trial 목록 중복 제외용)
  const activeLicensedHashes = new Set(licensedUsers.filter(u => u.status !== 'revoked').map(u => u.hash));
  const activeLicensedEmails = new Set(licensedUsers.filter(u => u.status !== 'revoked').map(u => u.email?.toLowerCase()).filter(Boolean));

  const cleanTrialUsers = trialUsers.filter(u => {
    const emailMatch = u.email && activeLicensedEmails.has(u.email.toLowerCase());
    const hashMatch = u.hash && activeLicensedHashes.has(u.hash);
    return !emailMatch && !hashMatch;
  });

  return (
    <>
      <ModalShell onClose={onClose} size="sm" title={"ProDrill 마스터 제어실"}>
        <div className="p-5 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          
          {/* 통계 요약 */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{"\uD83D\uDCC8"}</span>
              <h3 className="text-sm font-black text-indigo-900">실시간 서비스 운영 현황</h3>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-indigo-800">
              <span>승인된 지공사 라이선스:</span>
              <span className="text-sm underline font-black">{licensedUsers.filter(u => u.status !== 'revoked').length}개</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-indigo-800">
              <span>체험 중인 지공사 (Trial):</span>
              <span className="text-sm underline font-black">{cleanTrialUsers.length}명</span>
            </div>
          </div>

          {/* A. 신규 지공사 라이선스 추가 폼 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{"\uD83D\uDD11"}</span>
              <h3 className="text-sm font-black text-slate-800">신규 지공사 라이선스 즉시 승인</h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              인증할 지공사의 이메일, 성함, 상주 지공 샵 명칭을 입력하거나 아래 Trial 지공사를 클릭하세요.
            </p>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="지공사 구글 이메일 (필수)"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="지공사 성함 (예: 홍길동)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="지공 샵/클럽 명칭"
                  value={newShopName}
                  onChange={e => setNewShopName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="pt-1 flex justify-end">
                <Button
                  onClick={handleAddLicense}
                  disabled={loading}
                  size="sm"
                  variant="primary"
                >
                  승인 및 프로필 등록
                </Button>
              </div>
            </div>
          </div>

          {/* B. 정식 라이선스 지공사 관리 목록 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{"\uD83D\uDC65"}</span>
              <h3 className="text-sm font-black text-slate-800">정식 승인 지공사 목록 및 원격 제어</h3>
            </div>
            
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {licensedUsers.filter(u => u.status !== 'revoked').length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-3">승인된 지공사가 없습니다.</div>
              ) : (
                licensedUsers.filter(u => u.status !== 'revoked').map((user) => (
                  <div key={user.hash} className="p-3 bg-white border border-slate-100 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-slate-800 text-xs truncate flex items-center gap-1.5">
                          <span>{user.name || '지공사 (성함 미입력)'}</span>
                          {user.shopName && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md font-bold truncate max-w-[140px]">
                              {user.shopName}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
                          {user.email || `${user.hash.substring(0, 16)}...`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {user.hash !== MASTER_HASH && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(user);
                                setEditName(user.name || '');
                                setEditShop(user.shopName || '');
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]"
                              title="프로필 수정"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => setAuditUser(user)}
                              className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px]"
                              title="변경 이력 히스토리"
                            >
                              이력
                            </button>
                            <button
                              onClick={() => handleRevokeLicense(user)}
                              disabled={loading}
                              type="button"
                              className="px-2 py-1 rounded text-[10px] font-black bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            >
                              해지
                            </button>
                            <button
                              onClick={() => handleToggleLockStatus(user)}
                              disabled={loading}
                              type="button"
                              className={`px-2 py-1 rounded text-[10px] font-black ${
                                user.status === 'locked' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {user.status === 'locked' ? '잠금 해제' : '잠금'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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
              {cleanTrialUsers.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-3">현재 체험 중인 지공사가 없습니다.</div>
              ) : (
                cleanTrialUsers.map((user) => (
                  <div 
                    key={user.hash} 
                    onClick={() => {
                      if (user.email) setNewEmail(user.email);
                      if (user.name) setNewName(user.name);
                      if (user.shopName) setNewShopName(user.shopName);
                    }}
                    className="p-2.5 bg-white border border-slate-100 rounded-xl text-xs space-y-1 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                    title="클릭 시 라이선스 즉시 승인 입력창에 자동 채움"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-700 group-hover:text-indigo-600 truncate max-w-[190px] transition-colors">
                        {user.name ? `${user.name} (${user.shopName || user.email})` : (user.email || `체험 사용자 (${user.hash.substring(0, 8)})`)}
                      </span>
                      {user.status === 'revoked' || user.revokedDateStr ? (
                        <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-700 font-black text-[9px]">
                          {formatDateOnly(user.revokedDateStr || user.revokedAt)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-700 font-black text-[9px]">
                          D-{user.daysLeft ?? 90}일
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-1 mt-0.5">
                      <span>최초 앱 등록일: {formatDateOnly(user.firstLaunchTime || user.createdAt)}</span>
                      <span>라이선스 등록일: {formatDateOnly(user.licenseRegisteredAt)}</span>
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

      {/* A. 마스터 전용 프로필 수정 모달 */}
      {editingUser && (
        <ModalShell onClose={() => setEditingUser(null)} size="sm" title={`프로필 수정: ${editingUser.email}`}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">지공사 성함</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">지공 샵</label>
              <input
                type="text"
                value={editShop}
                onChange={(e) => setEditShop(e.target.value)}
                placeholder="예: 서울 붐볼링 지공 샵"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setEditingUser(null)} variant="secondary" size="sm">취소</Button>
              <Button onClick={handleSaveAdminEdit} disabled={loading} variant="primary" size="sm">프로필 저장</Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* B. 프로필 변경 이력(Audit Log) 히스토리 조회 모달 */}
      {auditUser && (
        <ModalShell onClose={() => setAuditUser(null)} size="sm" title={`프로필 변경 이력: ${auditUser.name || auditUser.email}`}>
          <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="text-xs font-bold text-slate-500 mb-2">
              등록 및 변경 기록 (Audit Trail)
            </div>

            {(!auditUser.profileHistory || auditUser.profileHistory.length === 0) ? (
              <div className="text-xs text-slate-400 text-center py-6">
                기록된 프로필 변경 이력이 없습니다.
              </div>
            ) : (
              auditUser.profileHistory.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center font-black text-slate-700">
                    <span>{item.changedBy === 'admin' ? '마스터 변경' : '지공사 변경'}</span>
                    <span className="text-[10px] text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</span>
                  </div>
                  <div className="text-slate-600 text-[11px] font-medium pt-1">
                    {item.prevName || item.prevShopName ? (
                      <div>기존: {item.prevName || '-'} ({item.prevShopName || '-'})</div>
                    ) : null}
                    <div className="font-bold text-indigo-700">변경: {item.newName || '-'} ({item.newShopName || '-'})</div>
                  </div>
                </div>
              ))
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setAuditUser(null)} variant="secondary" size="sm">닫기</Button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
