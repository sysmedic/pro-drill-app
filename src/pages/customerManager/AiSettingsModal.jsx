import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { getApiKeyForProvider, saveApiKeyForProvider } from '../../lib/openaiService.js';

export default function AiSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    // 초기 로딩 시 설정된 API Key 복원
    setGeminiKey(getApiKeyForProvider() || '');
  }, []);

  const handleSaveAiSettings = (e) => {
    if (e) e.preventDefault();
    saveApiKeyForProvider(geminiKey);
    onFeedback({ message: 'Gemini AI 추천 엔진 설정이 안전하게 저장되었습니다.', tone: 'success' });
    onClose(); // 저장 완료 후 모달 닫기
  };

  return (
    <ModalShell onClose={onClose} size="sm" title="✨ ProDrill AI 설정">
      <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
        {/* 설명 단락 */}
        <p className="text-xs text-slate-500 leading-relaxed pl-1">
          구글 제미나이 지공 추천 기능을 활성화하기 위해 API 키를 설정합니다. API 키가 없으신 경우 구글 AI 스튜디오에서 무료로 발급받으실 수 있습니다.
        </p>

        {/* 설정 영역 컨테이너 (클라우드 설정 모달 기준 일치화) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="text-base">✨</span>
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
        </div>

        {/* 액션 버튼 영역 */}
        <div className="flex justify-end gap-2 pt-2">
          <button 
            onClick={onClose} 
            type="button"
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
          >
            취소
          </button>
          <Button 
            onClick={handleSaveAiSettings}
            size="sm"
            variant="primary"
          >
            설정 저장
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
