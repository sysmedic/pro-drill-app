import { useRef, useState, useEffect } from 'react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { getApiKeyForProvider, saveApiKeyForProvider } from '../../lib/openaiService.js';
import { isLicenseCertified, certifyUserEmail, calculateGracePeriod } from '../../lib/userLicenseManager.js';
import { 
  initGoogleApi, 
  signInGoogle, 
  signOutGoogle, 
  isGoogleSignedIn 
} from '../../lib/googleDriveBackup.js';
import { 
  performBackup, 
  performRestore, 
  packAppData, 
  unpackAppData 
} from '../../lib/syncService.js';

export default function SettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [restoreData, setRestoreData] = useState(null);
  const fileInputRef = useRef(null);

  // AI 및 Google 관련 상태
  const [geminiKey, setGeminiKey] = useState('');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [showSyncModeConfirm, setShowSyncModeConfirm] = useState(false);
  const [syncMode, setSyncMode] = useState('merge'); // 'merge' | 'overwrite'
  const [graceDays, setGraceDays] = useState(() => calculateGracePeriod().daysLeft);

  useEffect(() => {
    // 초기 로딩 시 설정값 복원
    setGeminiKey(getApiKeyForProvider());
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

  // 1. AI 설정 통합 저장
  const handleSaveAiSettings = (e) => {
    if (e) e.preventDefault();
    saveApiKeyForProvider(geminiKey);
    onFeedback({ message: 'Gemini AI 추천 엔진 설정이 안전하게 저장되었습니다.', tone: 'success' });
  };

  // 2. 구글 연동 로그인 및 라이선스 인증
  const handleGoogleConnect = async () => {
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

      const isApproved = await certifyUserEmail(email);
      if (isApproved) {
        setGoogleConnected(true);
        setGraceDays(calculateGracePeriod().daysLeft);
        onFeedback({ message: '정식 지공사 라이선스 인증 및 구글 드라이브 연동에 성공했습니다!', tone: 'success' });
        
        // 인증에 성공하면 클라우드 동기화 즉시 기동
        const { autoSyncOnLaunch } = await import('../../lib/syncService.js');
        autoSyncOnLaunch(onFeedback);
      } else {
        // 미승인 계정이면 즉시 로그아웃 처리하여 백업을 원천 차단
        signOutGoogle();
        setGoogleConnected(false);
        onFeedback({ message: `허용되지 않은 계정입니다: (${email}). 관리자(sysmedic@gmail.com)에게 등록을 문의해 주세요.`, tone: 'danger' });
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
    if (!googleConnected) {
      onFeedback({ message: '구글 계정을 먼저 연동해 주세요.', tone: 'warning' });
      return;
    }
    setGoogleLoading(true);
    try {
      const time = await performBackup();
      setLastBackupTime(time);
      onFeedback({ message: '🎉 구글 드라이브에 안전하게 자동 백업 완료!', tone: 'success' });
    } catch (e) {
      console.error("구글 백업 실패:", e);
      onFeedback({ message: '구글 백업 업로드에 실패했습니다.', tone: 'danger' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // 5. 구글 드라이브에서 복원 실행
  const triggerGoogleRestore = (mode) => {
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

  // 7. [수동 비상 백업] - JSON 파일 다운로드
  const handleLocalFileBackup = async () => {
    try {
      const payload = await packAppData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `prodrill_local_backup_${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onFeedback({ message: '데이터 백업 JSON 파일이 다운로드되었습니다.', tone: 'success' });
    } catch (e) {
      console.error("수동 파일 백업 실패:", e);
      onFeedback({ message: '백업 중 오류가 발생했습니다.', tone: 'danger' });
    }
  };

  // 8. [수동 비상 복원] - 파일 파싱
  const handleLocalFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data || data.appId !== 'ProDrill') {
          throw new Error('Invalid format');
        }
        setRestoreData(data);
      } catch {
        onFeedback({ message: '잘못된 ProDrill 백업 파일 형식입니다.', tone: 'danger' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeLocalRestore = async () => {
    if (!restoreData) return;
    try {
      await unpackAppData(restoreData, 'overwrite');
      onFeedback({ message: '데이터 로컬 파일 복원 완료!', tone: 'success' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      onFeedback({ message: '로컬 데이터 복원 중 오류가 발생했습니다.', tone: 'danger' });
      setRestoreData(null);
    }
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
      <ModalShell onClose={onClose} size="sm" title="⚙️ ProDrill 시스템 설정" titleId="settings-modal-title">
        <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
          
          {/* A. AI 레이아웃 추천 설정 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🤖</span>
              <h3 className="text-sm font-black text-slate-800">ProDrill AI 레이아웃 추천 설정</h3>
            </div>
            
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 leading-normal">
                구글 제미나이 지공 추천 기능을 활성화하기 위해 **Gemini API Key**를 입력해 주세요. (추천 모델: **gemini-3.5-flash**)<br />
                API 키가 없으신 경우 <a href="https://aistudio.google.com/api-keys?project=drilling-chart-support" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-black">구글 AI 스튜디오(Google AI Studio)</a>에서 무료로 발급받으실 수 있습니다.
              </p>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-mono"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button 
                onClick={handleSaveAiSettings}
                size="sm"
                variant="primary"
              >
                설정 저장
              </Button>
            </div>
          </div>

          {/* B. 구글 드라이브 클라우드 동기화 */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-base">☁️</span>
                <h3 className="text-sm font-black text-indigo-900">구글 드라이브 클라우드 동기화</h3>
              </div>
              
              {googleConnected ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  연동 중
                </span>
              ) : (
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  미연동
                </span>
              )}
            </div>

            {/* 🔒 [라이선스 상태 배너 추가] */}
            {isLicenseCertified() ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-extrabold flex justify-between items-center select-none">
                <span>[정식 지공사 라이선스 인증됨]</span>
                <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">무제한 백업 허용</span>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 font-extrabold flex justify-between items-center select-none font-bold">
                <span>[인증 대기 상태: 무료 유예 {graceDays}일 남음]</span>
                <span className="text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">인증 전 백업 제한</span>
              </div>
            )}

            <p className="text-[11px] text-slate-600 leading-normal">
              구글 드라이브에 데이터를 안전하게 백업하고, 여러 기기에서 동기화하여 멀티 디바이스 구동을 지원합니다.
            </p>

            <div className="space-y-2.5">
              {!isLicenseCertified() ? (
                <Button className="w-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleGoogleConnect} variant="primary" disabled={googleLoading}>
                  {googleLoading ? '인증 중...' : '구글 계정 연동 및 정식 인증하기'}
                </Button>
              ) : googleConnected ? (
                <div className="flex gap-2">
                  <Button className="flex-1 text-xs" onClick={handleGoogleBackup} variant="primary" disabled={googleLoading}>
                    {googleLoading ? '백업 중...' : '지금 드라이브 백업'}
                  </Button>
                  <Button className="flex-1 text-xs" onClick={() => triggerGoogleRestore('merge')} variant="secondary" disabled={googleLoading}>
                    드라이브 복원
                  </Button>
                </div>
              ) : (
                <Button className="w-full text-xs font-bold" onClick={handleGoogleConnect} variant="primary" disabled={googleLoading}>
                  {googleLoading ? '연결 중...' : '구글 계정 연동하기'}
                </Button>
              )}

              {googleConnected && (
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
              )}

              {googleConnected && (
                <button 
                  type="button"
                  onClick={handleGoogleDisconnect}
                  className="w-full text-center text-[10px] text-red-400 font-semibold hover:text-red-600 py-1 transition-colors"
                >
                  구글 계정 연동 해제
                </button>
              )}
            </div>
          </div>

          {/* C. 비상용 수동 파일 백업 (아코디언) */}
          <details className="group border border-slate-200 rounded-xl bg-white overflow-hidden transition-all duration-300">
            <summary className="flex justify-between items-center p-4 cursor-pointer font-bold text-xs text-slate-600 hover:bg-slate-50 select-none outline-none">
              <span>🗂️ 비상용 백업 파일 직접 내보내기/가져오기</span>
              <span className="transition-transform duration-200 group-open:rotate-180">▼</span>
            </summary>
            
            <div className="p-4 border-t border-slate-100 space-y-4 bg-slate-50/30">
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1">JSON 파일로 내보내기</h4>
                <p className="text-[10px] text-slate-500 mb-2">현재 기기 내 모든 정보를 파일로 직접 저장해 다운로드합니다.</p>
                <Button className="w-full text-xs" onClick={handleLocalFileBackup} variant="secondary">
                  수동 백업 파일 다운로드
                </Button>
              </div>
              <div className="pt-3 border-t border-slate-200/60">
                <h4 className="text-xs font-bold text-red-800 mb-1">백업 파일 직접 가져오기</h4>
                <p className="text-[10px] text-red-600/80 mb-2">이전 백업 파일을 불러와 앱을 복구합니다. (기존 데이터 삭제 및 덮어쓰기)</p>
                <input accept=".json" className="hidden" onChange={handleLocalFileChange} ref={fileInputRef} type="file" />
                <Button className="w-full text-xs" onClick={() => fileInputRef.current?.click()} variant="danger">
                  백업 파일 직접 불러오기
                </Button>
              </div>
            </div>
          </details>

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

      {/* 2. 비상용 로컬 복원 컨펌 모달 */}
      {restoreData && (
        <ConfirmModal
          confirmLabel="파일 덮어쓰기 복원"
          danger
          message="주의: 선택한 수동 백업 파일의 내용으로 앱을 덮어씁니다. 현재 기기 내 모든 기존 데이터는 삭제되며 복구할 수 없습니다."
          onCancel={() => setRestoreData(null)}
          onConfirm={executeLocalRestore}
          title="로컬 파일 복원 확인"
          titleId="local-restore-confirm-title"
          zClassName="z-[150]"
        />
      )}
    </>
  );
}