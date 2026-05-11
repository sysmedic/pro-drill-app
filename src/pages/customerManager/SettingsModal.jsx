import { useRef, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';

export default function SettingsModal({ onClose, onFeedback }) {
  const [restoreData, setRestoreData] = useState(null);
  const fileInputRef = useRef(null);

  const handleBackup = () => {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `drilling_chart_backup_${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      onFeedback({ message: '데이터 백업 파일이 다운로드되었습니다.', tone: 'success' });
    } catch (e) {
      onFeedback({ message: '백업 중 오류가 발생했습니다.', tone: 'danger' });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data !== 'object' || data === null) throw new Error('Invalid format');
        
        const hasData = Object.keys(data).length > 0;
        if (!hasData) {
            onFeedback({ message: '백업 파일에 데이터가 없습니다.', tone: 'warning' });
            return;
        }

        setRestoreData(data);
      } catch (error) {
        onFeedback({ message: '잘못된 백업 파일 형식입니다.', tone: 'danger' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 동일 파일 재선택 가능하게 초기화
  };

  const executeRestore = () => {
    if (!restoreData) return;
    try {
      localStorage.clear();
      Object.keys(restoreData).forEach(key => {
        localStorage.setItem(key, restoreData[key]);
      });
      window.location.reload(); // 복원 성공 시 새로고침하여 앱 초기화
    } catch (e) {
      onFeedback({ message: '데이터 복원 중 오류가 발생했습니다.', tone: 'danger' });
      setRestoreData(null);
    }
  };

  return (
    <>
      <ModalShell onClose={onClose} size="sm" title="데이터 백업 및 복원" titleId="backup-modal-title">
        <div className="p-5 flex flex-col gap-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-2">데이터 백업</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              현재 기기에 저장된 모든 고객 정보와 지공 차트 기록을 JSON 파일로 저장합니다. 새로운 기기로 이동하거나 데이터를 안전하게 보관할 때 사용하세요.
            </p>
            <Button className="w-full" onClick={handleBackup} variant="primary" icon="memo">
              백업 파일 다운로드
            </Button>
          </div>
          
          <div className="bg-red-50 p-4 rounded-xl border border-red-200">
            <h3 className="text-sm font-bold text-red-800 mb-2">데이터 복원</h3>
            <p className="text-xs text-red-600/80 mb-4 leading-relaxed">
              저장해둔 백업 파일을 불러와 앱 데이터를 복원합니다.<br />
              <strong className="text-red-700">주의: 복원 시 현재 앱에 저장된 모든 데이터가 영구적으로 삭제되고 덮어씌워집니다.</strong>
            </p>
            <input accept=".json" className="hidden" onChange={handleFileChange} ref={fileInputRef} type="file" />
            <Button className="w-full" onClick={() => fileInputRef.current?.click()} variant="danger" icon="warning">
              백업 파일 불러오기
            </Button>
          </div>
        </div>
      </ModalShell>

      {restoreData && (
        <ConfirmModal
          confirmLabel="덮어쓰기 복원"
          danger
          message="현재 기기에 저장된 모든 데이터가 삭제되고 선택한 백업 파일의 내용으로 완전히 덮어씌워집니다. 계속하시겠습니까?"
          onCancel={() => setRestoreData(null)}
          onConfirm={executeRestore}
          title="데이터 복원 확인"
          titleId="restore-confirm-title"
          zClassName="z-[150]"
        />
      )}
    </>
  );
}