import { useRef, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { packAppData, unpackAppData } from '../../lib/syncService.js';
import { verifyBackupPackage } from '../../lib/encryption.js';
import { isGoogleSignedIn, getGoogleUserEmail } from '../../lib/googleDriveBackup.js';

export default function BackupSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [restoreData, setRestoreData] = useState(null);
  const fileInputRef = useRef(null);

  // 1. [수동 비상 백업] - JSON 파일 다운로드
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

  // 2. [수동 비상 복원] - 파일 파싱 및 소유자/위변조 서명 검증
  const handleLocalFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let currentEmail = '';
    if (isGoogleSignedIn()) {
      try {
        currentEmail = await getGoogleUserEmail();
      } catch (err) {
        console.warn("구글 사용자 이메일 획득 실패:", err);
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data || data.appId !== 'ProDrill') {
          throw new Error('INVALID_FORMAT');
        }

        // 🛡️ 소유자 대조 및 위변조 서명 2중 검증
        const verification = verifyBackupPackage(data, currentEmail);
        if (!verification.valid) {
          if (verification.reason === 'OWNER_MISMATCH') {
            onFeedback({ 
              message: `\u26A0\uFE0F 소유자 불일치: 해당 백업 파일의 소유자(${verification.ownerEmail || '타인'})와 현재 로그인된 계정이 다릅니다.`, 
              tone: 'danger' 
            });
            return;
          }
          if (verification.reason === 'TAMPERED_DATA') {
            onFeedback({ 
              message: '\u274C 위변조 차단: 백업 파일의 내용이나 이메일 주소가 변조되었습니다. 복원이 차단되었습니다.', 
              tone: 'danger' 
            });
            return;
          }
          onFeedback({ message: '잘못된 백업 파일 서명입니다.', tone: 'danger' });
          return;
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
      let currentEmail = '';
      if (isGoogleSignedIn()) {
        try { currentEmail = await getGoogleUserEmail(); } catch (e) { console.warn(e); }
      }
      await unpackAppData(restoreData, 'overwrite', currentEmail);
      onFeedback({ message: '데이터 로컬 파일 복원 완료!', tone: 'success' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      if (e.message === 'BACKUP_OWNER_MISMATCH') {
        onFeedback({ message: '\u26A0\uFE0F 타인 계정의 백업 파일은 복원할 수 없습니다.', tone: 'danger' });
      } else if (e.message === 'BACKUP_TAMPERED_DATA') {
        onFeedback({ message: '\u274C 위변조가 감지된 백업 파일입니다.', tone: 'danger' });
      } else {
        onFeedback({ message: '로컬 데이터 복원 중 오류가 발생했습니다.', tone: 'danger' });
      }
      setRestoreData(null);
    }
  };

  return (
    <>
      <ModalShell onClose={onClose} size="sm" title="🗂️ 로컬 백업">
        <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
          {/* 설명 단락 */}
          <p className="text-xs text-slate-500 leading-relaxed pl-1">
            현재 기기의 데이터를 JSON 파일로 다운로드하거나, 이전에 보관했던 백업 파일을 직접 가져와 데이터를 복원합니다.
          </p>

          {/* A. 파일 내보내기 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                📥 파일로 내보내기
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                현재 기기에 저장된 모든 지공 차트 및 고객 정보 데이터를 하나의 백업용 파일로 패킹하여 보관합니다.
              </p>
              <Button className="w-full text-xs font-black py-2.5" onClick={handleLocalFileBackup} variant="secondary">
                수동 백업 파일 다운로드
              </Button>
            </div>
          </div>

          {/* B. 파일 가져오기 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-black text-red-800 flex items-center gap-1.5">
                📤 백업 파일 직접 가져오기
              </h4>
              <p className="text-[11px] font-bold text-red-600/80 leading-relaxed">
                주의: 백업 파일을 불러오면 기기 내의 기존 데이터를 완전히 삭제하고 새 파일 데이터로 대체합니다.
              </p>
              <input 
                accept=".json" 
                className="hidden" 
                onChange={handleLocalFileChange} 
                ref={fileInputRef} 
                type="file" 
              />
              <Button 
                className="w-full text-xs font-black py-2.5" 
                onClick={() => fileInputRef.current?.click()} 
                variant="danger"
              >
                백업 파일 직접 불러오기
              </Button>
            </div>
          </div>

          {/* 확인 닫기 영역 */}
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

      {/* 2. 비상용 로컬 복원 컨펌 모달 */}
      {restoreData && (
        <ConfirmModal
          confirmLabel="파일 덮어쓰기 복원"
          danger
          message="주의: 선택한 수동 백업 파일의 내용으로 앱을 덮어씁니다. 현재 기기 내 모든 기존 데이터는 삭제되며 복구할 수 없습니다."
          onCancel={() => setRestoreData(null)}
          onConfirm={executeLocalRestore}
          title="로컬 복원 방식 확인"
          titleId="local-restore-confirm-title"
          zClassName="z-[2000]"
        />
      )}
    </>
  );
}
