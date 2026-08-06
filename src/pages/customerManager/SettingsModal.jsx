import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { isLicenseCertified, certifyUserEmail, calculateGracePeriod } from '../../lib/userLicenseManager.js';
import { 
  initGoogleApi, 
  signInGoogle, 
  signOutGoogle, 
  isGoogleSignedIn 
} from '../../lib/googleDriveBackup.js';
import { 
  performBackup, 
  performRestore
} from '../../lib/syncService.js';

export default function SettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});

  // AI 및 Google 관련 상태
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [showSyncModeConfirm, setShowSyncModeConfirm] = useState(false);
  const [syncMode, setSyncMode] = useState('merge'); // 'merge' | 'overwrite'
  const [graceDays, setGraceDays] = useState(() => calculateGracePeriod().daysLeft);

  useEffect(() => {
    // 초기 로딩 시 설정값 복원
    setGoogleConnected(isGoogleSignedIn());
    setLastBackupTime(localStorage.getItem('prodrill_last_backup_time') || '기록 없음');
    setAutoSync(localStorage.getItem('prodrill_auto_sync_enabled') !== 'false');

    // 구글 API 사전 초기화 시도
    initGoogleApi().then(() => {
      setGoogleConnected(isGoogleSignedIn());
    }).catch(e => {
      console.warn("구글 API 초기 이닛 생략 (Vite 환경 변수가 비어있는 경우 등):", e);
    });
  }, []);



  // 2. 구글 연동 로그인 및 라이선스 인증
  const handleGoogleConnect = async () => {
    // 🛑 만약 트라이얼 90일이 만료된 상태라면 연동을 차단
    const { isExpired } = calculateGracePeriod();
    if (isExpired && !isLicenseCertified()) {
      onFeedback({ 
        message: '90일 무료 트라이얼 기간이 만료되어 구글 계정 연동이 차단되었습니다. 정식 라이선스 등록 후 이용하실 수 있습니다. (문의: sysmedic@gmail.com)', 
        tone: 'danger' 
      });
      return;
    }

    setGoogleLoading(true);
    try {
      const { getGoogleUserEmail } = await import('../../lib/googleDriveBackup.js');
      await initGoogleApi();
      await signInGoogle(true);
      const email = await getGoogleUserEmail();
      
      if (!email) {
        onFeedback({ message: '구글 계정의 이메일 정보를 획득할 수 없습니다.', tone: 'danger' });
        signOutGoogle();
        setGoogleConnected(false);
        return;
      }

      // 🛡️ [안전장치]: 현재 ProDrill 앱에 로그인된 계정과 구글 선택 계정이 다르면 연동 차단
      const activeAppEmail = localStorage.getItem('prodrill_active_user_email') || '';
      if (activeAppEmail && email.toLowerCase() !== activeAppEmail.toLowerCase()) {
        onFeedback({ 
          message: `\u26A0\uFE0F 계정 불일치: 현재 앱 로그인 계정(${activeAppEmail})과 선택한 구글 계정(${email})이 다릅니다. 데이터 보호를 위해 동일한 계정으로만 연동할 수 있습니다.`, 
          tone: 'danger' 
        });
        signOutGoogle();
        setGoogleConnected(false);
        return;
      }

      const isApproved = await certifyUserEmail(email);
      if (isApproved) {
        setGoogleConnected(true);
        setGraceDays(calculateGracePeriod().daysLeft);
        onFeedback({ message: '구글 계정 연동 및 클라우드 백업 기능이 활성화되었습니다!', tone: 'success' });
        
        // 연동에 성공하면 클라우드 동기화 기동
        const { autoSyncOnLaunch } = await import('../../lib/syncService.js');
        autoSyncOnLaunch(onFeedback);
      } else {
        signOutGoogle();
        setGoogleConnected(false);
        onFeedback({ message: '구글 계정 연동에 실패했습니다.', tone: 'danger' });
      }
    } catch (e) {
      console.error("구글 연동 실패:", e);
      if (e.message === 'GOOGLE_API_KEYS_MISSING') {
        onFeedback({ message: '구글 OAuth 클라이언트 키가 설정되지 않았습니다. .env 파일을 먼저 설정해 주세요.', tone: 'warning' });
      } else if (e.message === 'REQUIRED_SCOPES_MISSING') {
        onFeedback({ message: '구글 로그인 동의 화면에서 [Google 드라이브 권한] 체크박스를 반드시 직접 체크(허용)해 주셔야 백업 연동이 가능합니다.', tone: 'warning' });
      } else {
        onFeedback({ message: '구글 연동 및 인증에 실패했습니다.', tone: 'danger' });
      }
      signOutGoogle();
      setGoogleConnected(false);
    } finally {
      setGoogleLoading(false);
    }
  };

  // 3. 구글 연동 해제
  const handleGoogleDisconnect = () => {
    signOutGoogle();
    setGoogleConnected(false);
    onFeedback({ message: '구글 드라이브 연동이 해제되었습니다.', tone: 'info' });
  };

  // 4. 구글 드라이브 즉시 백업
  const handleGoogleBackup = async () => {
    const { isExpired } = calculateGracePeriod();
    if (isExpired && !isLicenseCertified()) {
      onFeedback({ 
        message: '90일 무료 유예 기간이 만료되어 클라우드 백업을 이용하실 수 없습니다. 정식 라이선스를 승인받으시면 무제한 클라우드 백업 및 실시간 동기화가 활성화됩니다. (문의: sysmedic@gmail.com)', 
        tone: 'warning' 
      });
      return;
    }

    setGoogleLoading(true);
    try {
      if (!isGoogleSignedIn()) {
        await initGoogleApi();
        await signInGoogle(true);
        setGoogleConnected(true);
      }

      const time = await performBackup();
      setLastBackupTime(time);
      onFeedback({ message: '🎉 구글 드라이브에 안전하게 자동 백업 완료!', tone: 'success' });
    } catch (e) {
      console.error("구글 백업 실패:", e);
      if (e.message === 'ACCOUNT_MISMATCH') {
        const activeAppEmail = localStorage.getItem('prodrill_active_user_email') || '';
        onFeedback({ 
          message: `\u26A0\uFE0F 계정 불일치: 현재 앱 로그인 계정(${activeAppEmail})의 구글 드라이브로만 백업할 수 있습니다.`, 
          tone: 'danger' 
        });
      } else {
        onFeedback({ message: '구글 백업 업로드에 실패했습니다.', tone: 'danger' });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 5. 구글 드라이브에서 복원 실행
  const triggerGoogleRestore = (mode) => {
    const { isExpired } = calculateGracePeriod();
    if (isExpired && !isLicenseCertified()) {
      onFeedback({ 
        message: '90일 무료 유예 기간이 만료되어 클라우드 복원을 이용하실 수 없습니다. 정식 라이선스를 승인받으시면 무제한 클라우드 백업 및 실시간 동기화가 활성화됩니다. (문의: sysmedic@gmail.com)', 
        tone: 'warning' 
      });
      return;
    }

    setSyncMode(mode);
    setShowSyncModeConfirm(true);
  };

  const handleConfirmGoogleRestore = async () => {
    setShowSyncModeConfirm(false);
    setGoogleLoading(true);
    onFeedback({ message: '☁️ 구글 드라이브에서 데이터를 가져오는 중...', tone: 'info' });
    try {
      await performRestore(syncMode);
      onFeedback({ message: '🎉 동기화 복원이 완료되었습니다!', tone: 'success' });
      setTimeout(() => {
        window.location.reload(); // 복원 성공 시 새로고침하여 앱 화면 데이터 동기화
      }, 1000);
    } catch (e) {
      console.error("구글 복원 실패:", e);
      if (e.message === 'BACKUP_FILE_NOT_FOUND') {
        onFeedback({ message: '구글 드라이브에 저장된 백업 파일이 없습니다.', tone: 'warning' });
      } else {
        onFeedback({ message: '복원에 실패했습니다. 네트워크 상태를 확인해주세요.', tone: 'danger' });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 6. 자동 동기화 토글 제어
  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    localStorage.setItem('prodrill_auto_sync_enabled', String(nextVal));
    onFeedback({ message: nextVal ? '☁️ 자동 동기화 및 실시간 백업이 활성화되었습니다.' : '자동 동기화가 중단되었습니다. (수동 백업만 가능)', tone: 'info' });
  };



  const formatBackupDate = (isoStr) => {
    if (!isoStr || isoStr === '기록 없음') return '기록 없음';
    try {
      const date = new Date(isoStr);
      return date.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  return (
    <>
      <ModalShell onClose={onClose} size="sm" title="☁️ 클라우드 백업" titleId="settings-modal-title">
        <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
          

          {/* B. 구글 드라이브 클라우드 동기화 */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
            {/* 🔒 [사용자 라이선스 및 트라이얼 상태 안내 배너] */}
            {isLicenseCertified() ? (
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-black text-indigo-900 flex justify-between items-center select-none shadow-sm">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-500">✓</span> ProDrill 라이선스 인증 완료
                </span>
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  정식 계정
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs font-black text-amber-900 flex justify-between items-center select-none shadow-sm">
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-500">⏳</span> 무료 트라이얼 이용 중
                </span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  잔여 {graceDays}일
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-600 leading-normal">
              로그인된 구글 계정의 드라이브에 데이터를 안전하게 백업하고, 여러 기기에서 실시간으로 동기화합니다.
            </p>

            <div className="space-y-2.5">
              <div className="flex gap-2">
                <Button className="flex-1 text-xs font-bold" onClick={handleGoogleBackup} variant="primary" disabled={googleLoading}>
                  {googleLoading ? '백업 중...' : '드라이브에 백업'}
                </Button>
                <Button className="flex-1 text-xs font-bold" onClick={() => triggerGoogleRestore('merge')} variant="secondary" disabled={googleLoading}>
                  로컬에 복원
                </Button>
              </div>

              <div className="bg-white border border-indigo-100 rounded-xl p-2.5 space-y-2">
                <div className="flex justify-between items-center text-[10px] sm:text-xs">
                  <span className="text-slate-400 font-bold">마지막 동기화 시점:</span>
                  <span className="text-slate-700 font-black">{formatBackupDate(lastBackupTime)}</span>
                </div>
                
                {/* 자동 동기화 스위치 */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                  <span className="text-[11px] text-slate-500 font-bold">앱 실행/종료 시 자동 백업 및 동기화</span>
                  <button 
                    type="button"
                    onClick={handleToggleAutoSync}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoSync ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSync ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>



        </div>
      </ModalShell>

      {/* 1. 구글 드라이브 복원 컨펌 모달 */}
      {showSyncModeConfirm && (
        <ConfirmModal
          confirmLabel={syncMode === 'overwrite' ? '완전 덮어쓰기' : '동기화 병합(권장)'}
          danger={syncMode === 'overwrite'}
          message={
            syncMode === 'overwrite' 
              ? '주의: 구글 드라이브의 백업본으로 복원하면 현재 기기의 모든 지공 차트가 삭제되고 클라우드 데이터로 완전히 덮어씌워집니다. 계속하시겠습니까?'
              : '구글 드라이브의 백업본과 현재 기기의 데이터를 합쳐 중복 없는 최신본으로 통합합니다. 계속하시겠습니까?'
          }
          onCancel={() => setShowSyncModeConfirm(false)}
          onConfirm={handleConfirmGoogleRestore}
          title="클라우드 복원 방식 확인"
          titleId="google-restore-confirm-title"
          zClassName="z-[150]"
        />
      )}

    </>
  );
}