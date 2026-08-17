import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { licenseDb } from '../../lib/licenseFirebase.js';
import { getSha256Hash, MASTER_HASH, saveUserProfile, sanitizeString } from '../../lib/userLicenseManager.js';
import Button from '../../components/ui/Button.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function AdminSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [licensedUsers, setLicensedUsers] = useState([]);
  const [trialUsers, setTrialUsers] = useState([]);
  const [sharedBalls, setSharedBalls] = useState([]);
  const [loading, setLoading] = useState(false);

  // 프로필 편집 및 히스토리 팝업 상태
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editShop, setEditShop] = useState('');
  const [auditUser, setAuditUser] = useState(null);

  // 1. 라이선스 유저, Trial 사용자 및 수집 볼링공 DB 목록 원격 로드
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

    // (2) Trial 사용자 목록 조회 및 로컬 정렬
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
    }

    // (3) Firestore 파이어베이스 수집 볼링공 DB 목록 (shared_bowling_balls) 조회
    try {
      const sharedRef = collection(licenseDb, 'shared_bowling_balls');
      const sharedSnap = await getDocs(sharedRef);
      const bList = [];
      sharedSnap.forEach((docSnap) => {
        bList.push({ docId: docSnap.id, ...docSnap.data() });
      });
      bList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      // 🧹 24시간 이상 지난 승인완료 데이터 자동 정리 (Auto Cleanup)
      const nowMs = new Date().getTime();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const staleApproved = bList.filter(b => {
        if (b.status !== 'approved') return false;
        const updatedMs = b.updatedAt?.seconds ? (b.updatedAt.seconds * 1000) : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return updatedMs > 0 && (nowMs - updatedMs > TWENTY_FOUR_HOURS_MS);
      });

      if (staleApproved.length > 0) {
        for (const item of staleApproved) {
          try {
            const docRef = doc(licenseDb, 'shared_bowling_balls', item.docId);
            await deleteDoc(docRef);
          } catch { /* ignore */ }
        }
        // 정리 후 남은 목록 반영
        const remaining = bList.filter(b => !staleApproved.some(s => s.docId === b.docId));
        setSharedBalls(remaining);
      } else {
        setSharedBalls(bList);
      }
    } catch (e) {
      console.error("수집 볼링공 DB 로드 실패:", e);
      setSharedBalls([]);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Trial 사용자 실시간 서버 시각 기준 D-Day 잔여일 연산 헬퍼
  const calculateRealtimeDaysLeft = (user) => {
    const ts = user.createdAt || user.firstLaunchTime || user.updatedAt;
    if (!ts) return user.daysLeft ?? 90;
    let createdMs = 0;
    if (typeof ts === 'object' && ts.seconds) {
      createdMs = ts.seconds * 1000;
    } else {
      createdMs = new Date(ts).getTime();
    }
    if (isNaN(createdMs) || createdMs <= 0) return user.daysLeft ?? 90;
    const diffDays = (new Date().getTime() - createdMs) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(90 - diffDays));
  };

  // 🎯 수집 볼링공 건별 승인 처리
  const handleApproveSharedBall = async (ballItem) => {
    try {
      const docRef = doc(licenseDb, 'shared_bowling_balls', ballItem.docId);
      await setDoc(docRef, { status: 'approved', updatedAt: serverTimestamp() }, { merge: true });
      onFeedback({ message: `'${ballItem.ballName}' 공이 성공적으로 승인되었습니다!`, tone: 'success' });
      await loadAdminData();
    } catch (e) {
      onFeedback({ message: '승인 처리 실패: ' + e.message, tone: 'danger' });
    }
  };

  // 🎯 수집 볼링공 건별 거절/삭제 처리
  const handleDeleteSharedBall = async (ballItem) => {
    try {
      const docRef = doc(licenseDb, 'shared_bowling_balls', ballItem.docId);
      await deleteDoc(docRef);
      onFeedback({ message: `'${ballItem.ballName}' 삭제 완료.`, tone: 'secondary' });
      await loadAdminData();
    } catch (e) {
      onFeedback({ message: '삭제 실패: ' + e.message, tone: 'danger' });
    }
  };

  // 🎯 수집 볼링공 승인 완료된 모든 임시 데이터 일괄 자동 정리
  const handleCleanupApprovedBalls = async () => {
    const approvedList = sharedBalls.filter(b => b.status === 'approved');
    if (approvedList.length === 0) {
      onFeedback({ message: '정리할 승인완료 임시 데이터가 없습니다.', tone: 'warning' });
      return;
    }
    setLoading(true);
    try {
      let count = 0;
      for (const item of approvedList) {
        const docRef = doc(licenseDb, 'shared_bowling_balls', item.docId);
        await deleteDoc(docRef);
        count++;
      }
      onFeedback({ message: `승인 완료된 임시 수집 데이터 ${count}건이 깨끗하게 자동 정리되었습니다!`, tone: 'success' });
      await loadAdminData();
    } catch (e) {
      onFeedback({ message: '자동 정리 실패: ' + e.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  // 🎯 🧹 파이어베이스 shared_bowling_balls 중복 데이터 자동 통합 & 찌꺼기 정리
  const handleDeduplicateSharedBalls = async () => {
    if (sharedBalls.length === 0) {
      onFeedback({ message: '정제할 수집 볼링공이 없습니다.', tone: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const nameGroupMap = new Map();
      sharedBalls.forEach(ball => {
        const rawName = ball.ballName || ball.model_name_kr || ball.version_name || '';
        const key = rawName.toLowerCase().replace(/[\s\-_]/g, '');
        if (!key) return;
        if (!nameGroupMap.has(key)) {
          nameGroupMap.set(key, []);
        }
        nameGroupMap.get(key).push(ball);
      });

      let removedCount = 0;
      for (const [, group] of nameGroupMap.entries()) {
        if (group.length > 1) {
          // 중복군 중에서 가장 최신/승인된 1개 마스터만 남기고 나머지 삭제
          group.sort((a, b) => {
            if (a.status === 'approved' && b.status !== 'approved') return -1;
            if (a.status !== 'approved' && b.status === 'approved') return 1;
            const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
            const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
            return bTime - aTime;
          });

          // 2번째 항목부터 삭제
          const duplicatesToRemove = group.slice(1);
          for (const item of duplicatesToRemove) {
            try {
              const docRef = doc(licenseDb, 'shared_bowling_balls', item.docId);
              await deleteDoc(docRef);
              removedCount++;
            } catch { /* ignore */ }
          }
        }
      }

      onFeedback({ 
        message: removedCount > 0 
          ? `🧹 중복된 볼링공 데이터 ${removedCount}건이 깨끗하게 정제 삭제되고 통합되었습니다!` 
          : '✨ 이미 모든 볼링공 DB가 중복 없이 깨끗하게 통합 정제되어 있습니다.', 
        tone: 'success' 
      });
      await loadAdminData();
    } catch (e) {
      onFeedback({ message: '중복 정제 중 오류: ' + e.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  // 🎯 수집 볼링공 전체 일괄 승인 처리
  const handleApproveAllSharedBalls = async () => {
    const pendingList = sharedBalls.filter(b => b.status !== 'approved');
    if (pendingList.length === 0) {
      onFeedback({ message: '승인 대기 중인 볼링공이 없습니다.', tone: 'warning' });
      return;
    }
    setLoading(true);
    try {
      for (const item of pendingList) {
        const docRef = doc(licenseDb, 'shared_bowling_balls', item.docId);
        await setDoc(docRef, { status: 'approved', updatedAt: serverTimestamp() }, { merge: true });
      }
      onFeedback({ message: `대기 중인 볼링공 ${pendingList.length}건이 전체 일괄 승인되었습니다!`, tone: 'success' });
      await loadAdminData();
    } catch (e) {
      onFeedback({ message: '일괄 승인 실패: ' + e.message, tone: 'danger' });
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

          {/* C. 체험판 (Trial) 지공사 실시간 모니터링 목록 (실시간 D-Day 연산 보정) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{"\u23F3"}</span>
              <h3 className="text-sm font-black text-slate-800">Trial 지공사 실시간 이용 목록</h3>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cleanTrialUsers.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-3">현재 체험 중인 지공사가 없습니다.</div>
              ) : (
                cleanTrialUsers.map((user) => {
                  const realtimeDays = calculateRealtimeDaysLeft(user);
                  const isExpired = realtimeDays <= 0;
                  return (
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
                        {user.status === 'revoked' || isExpired ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-black text-[9px]">
                            {isExpired ? '트라이얼 만료' : formatDateOnly(user.revokedDateStr || user.revokedAt)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-black text-[9px]">
                            D-{realtimeDays}일
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-1 mt-0.5">
                        <span>최초 앱 등록일: {formatDateOnly(user.firstLaunchTime || user.createdAt)}</span>
                        <span>라이선스 등록일: {formatDateOnly(user.licenseRegisteredAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* D. 파이어베이스 현장 수집 볼링공 DB 실시간 검증 & 건별/일괄 승인 및 자동 정리 */}
          <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-3">
            {/* 🚀 상단 독립 Vercel 실시간 앱 재배포 제어 헤더 */}
            <div className="p-3 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl text-white space-y-2 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🚀</span>
                  <h4 className="text-xs font-black tracking-wide text-indigo-100">Vercel 실시간 앱 재배포 제어</h4>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (loading) return;
                    setLoading(true);
                    try {
                      const deployUrl = import.meta.env?.VITE_VERCEL_DEPLOY_HOOK_URL || 'https://api.vercel.com/v1/integrations/deploy/prj_GdzRgcWWQ5qB6kFbCfiMRMZGi82C';
                      await fetch(deployUrl, { method: 'POST', mode: 'no-cors' }).catch(() => {});
                      onFeedback({ message: '🚀 Vercel 클라우드 즉시 재배포 명령이 정상 발송되었습니다! (약 1분 후 전체 라이브 반영)', tone: 'success' });
                    } catch (e) {
                      onFeedback({ message: '재배포 요청 구동: ' + e.message, tone: 'success' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white text-xs font-black rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <span>🚀 실시간 앱 즉각 재배포</span>
                </button>
              </div>
              <p className="text-[10px] text-indigo-200/80 leading-relaxed">
                승인된 팩트 데이터를 전체 유저 앱 PWA에 라이브 릴리즈 배포하려면 이 버튼을 클릭하세요 (약 1분 소요).
              </p>
            </div>

            <div className="flex justify-between items-center flex-wrap gap-1.5 pt-1">
              <div className="flex items-center gap-1.5">
                <Icon name="check" size={16} className="text-indigo-600" />
                <h3 className="text-sm font-black text-indigo-950">현장 수집 볼링공 DB 검증 & 승인</h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sharedBalls.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeduplicateSharedBalls}
                    disabled={loading}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[10px] font-black rounded-lg transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    title="중복 수집된 볼링공 데이터를 1개로 깨끗이 통합 정제"
                  >
                    <span>🧹 중복 통합 & 정제</span>
                  </button>
                )}
                {sharedBalls.some(b => b.status === 'approved') && (
                  <button
                    type="button"
                    onClick={handleCleanupApprovedBalls}
                    disabled={loading}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black rounded-lg transition-all shadow-2xs cursor-pointer"
                    title="승인 완료된 임시 수집 데이터 일괄 정리"
                  >
                    승인완료 데이터 정리
                  </button>
                )}
                {sharedBalls.filter(b => b.status !== 'approved').length > 0 && (
                  <button
                    type="button"
                    onClick={handleApproveAllSharedBalls}
                    disabled={loading}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    전체 일괄 승인 ({sharedBalls.filter(b => b.status !== 'approved').length}건)
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sharedBalls.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-3">실시간 수집된 신규 볼링공이 없습니다.</div>
              ) : (
                sharedBalls.map((item) => {
                  const isApproved = item.status === 'approved';
                  return (
                    <div key={item.docId} className="p-2.5 bg-white border border-slate-100 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                            <span>{item.ballName}</span>
                            <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {item.weight || '15lb'}
                            </span>
                            <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              {item.coreType === 'Asymmetric' ? '비대칭' : '대칭'}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 font-mono mt-0.5">
                            RG: {item.rg ?? '-'} / Diff: {item.diff ?? '-'}{item.coreType === 'Asymmetric' ? ` / Int: ${item.intDiff ?? '-'}` : ''}
                          </div>
                          {(item.coverstock || item.finish) && (
                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                              {item.coverstock ? `커버스탁: ${item.coverstock}` : ''}{item.finish ? ` (${item.finish})` : ''}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {isApproved ? (
                            <>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[9px]">
                                승인됨
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSharedBall(item)}
                                disabled={loading}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                                title="승인 항목 제거"
                              >
                                삭제
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveSharedBall(item)}
                                disabled={loading}
                                className="px-2 py-1 rounded text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
                              >
                                승인
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSharedBall(item)}
                                disabled={loading}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium flex justify-between border-t border-slate-100 pt-1">
                        <span>제보: {item.contributedBy || '익명 지공사'}</span>
                        <span>{formatDateOnly(item.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
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
