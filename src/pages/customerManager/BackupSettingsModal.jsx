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

  const resolveActiveUserEmail = () => {
    if (typeof window === 'undefined') return 'sysmedic3@gmail.com';
    return (
      localStorage.getItem('prodrill_linked_email') ||
      localStorage.getItem('prodrill_certified_email_plain') ||
      'sysmedic3@gmail.com'
    ).trim().toLowerCase();
  };

  const resolveAccountHashKey = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('prodrill_certified_email_hash') || null;
  };

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

    let currentEmail = resolveActiveUserEmail();
    if (isGoogleSignedIn()) {
      try {
        const gEmail = await getGoogleUserEmail();
        if (gEmail) currentEmail = gEmail.trim().toLowerCase();
      } catch (err) {
        console.warn("구글 사용자 이메일 획득 실패:", err);
      }
    }

    console.log(`[TRACE 1: 파일 불러오기] 파일명='${file.name}', 바인딩 이메일='${currentEmail}'`);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data || data.appId !== 'ProDrill') {
          throw new Error('INVALID_FORMAT');
        }

        const incomingCustomers = data.data?.customers || [];
        console.log(`[TRACE 2: JSON 파싱 성공] 파일 내 고객 수: ${incomingCustomers.length}명 (${incomingCustomers.map(c=>c.name).join(', ')}), 소유자: '${data.ownerEmail}', 서명: '${data.signature}'`);

        // 🛡️ 소유자 대조 및 위변조 서명 2중 검증
        const verification = verifyBackupPackage(data, currentEmail);
        console.log(`[TRACE 3: 서명 검증 결과]`, verification);

        if (!verification.valid) {
          if (verification.reason === 'OWNER_MISMATCH') {
            onFeedback({ 
              message: `\u26A0\uFE0F 소유자 불일치: 백업 소유자(${verification.ownerEmail}) != 로그인 계정(${currentEmail})`, 
              tone: 'danger' 
            });
            return;
          }
          if (verification.reason === 'TAMPERED_DATA') {
            onFeedback({ 
              message: '\u274C 위변조 차단: 백업 파일의 내용이나 이메일 주소가 변조되었습니다.', 
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
      let currentEmail = resolveActiveUserEmail();
      const accountHashKey = resolveAccountHashKey();
      if (isGoogleSignedIn()) {
        try {
          const gEmail = await getGoogleUserEmail();
          if (gEmail) currentEmail = gEmail.trim().toLowerCase();
        } catch (e) { console.warn(e); }
      }

      const count = restoreData.data?.customers?.length || 0;
      const names = (restoreData.data?.customers || []).map(c=>c.name).join(', ');

      console.log(`[TRACE 4: 복원 실행 개시] targetEmail='${currentEmail}', accountHashKey='${accountHashKey}', 복원 고객 수=${count}명 (${names})`);

      await unpackAppData(restoreData, 'overwrite', currentEmail, accountHashKey);

      console.log(`[TRACE 5: unpackAppData 완료] 복원 이벤트 발송 및 고객 리스트 갱신 시도...`);

      onFeedback({ message: `🎉 로컬 데이터 복원 성공! 고객 ${count}명 (${names}) 이 등록되었습니다.`, tone: 'success' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prodrill_data_restored'));
        window.dispatchEvent(new Event('storage'));
      }
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e) {
      console.error("[TRACE 복원 실패]:", e);
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

          {/* A. 📊 엑셀 ➔ 백업 JSON 파일 변환 다운로드 */}
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  📊 엑셀 지공차트 ➔ 백업 JSON 변환 다운로드
                </h4>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">.xlsx ➔ .json</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">
                기존 사용 중이시던 엑셀 차트(.xlsx)를 선택하시면, 계정 서명이 주입된 로컬 백업 파일(`prodrill_local_backup_...json`)로 0.01초 만에 변환하여 기기에 다운로드합니다.
              </p>
              <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                <span>📊 엑셀 ➔ 백업 JSON 변환 다운로드</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const { convertExcelToBackupJsonInBrowser } = await import('../../lib/excelMigrationService.js');
                      const activeEmail = localStorage.getItem('prodrill_linked_email') || localStorage.getItem('prodrill_certified_email_plain') || 'sysmedic3@gmail.com';
                      const buffer = await file.arrayBuffer();
                      const res = await convertExcelToBackupJsonInBrowser(buffer, activeEmail);
                      onFeedback({
                        message: `🎉 백업 파일 생성 성공! 다운로드된 '${res.filename}' 파일로 아래 [📤 백업 파일 직접 불러오기]를 실행하세요.`,
                        tone: 'success'
                      });
                    } catch (err) {
                      console.error('엑셀 백업 변환 오류:', err);
                      onFeedback({
                        message: `엑셀 변환 실패: ${err.message || '파일 변환 중 오류가 발생했습니다.'}`,
                        tone: 'danger'
                      });
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* B. 파일 내보내기 */}
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
