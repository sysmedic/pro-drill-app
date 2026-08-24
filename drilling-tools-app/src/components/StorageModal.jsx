import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateShareText, downloadTextFile } from '../lib/shareHelper.js';

const STORAGE_SLOTS_KEY = 'prodrill_tools_saved_slots';

export default function StorageModal({ isOpen, onClose, currentSharedState, onLoadState }) {
  const [modalTab, setModalTab] = useState('save'); // 'save' | 'load'
  const [slots, setSlots] = useState([]);
  const [slotTitle, setSlotTitle] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // 저장된 슬롯 목록 로드
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(STORAGE_SLOTS_KEY);
      if (saved) {
        setSlots(JSON.parse(saved));
      } else {
        setSlots([]);
      }
    } catch (e) {
      console.error('Failed to load slots', e);
      setSlots([]);
    }

    setSlotTitle('');
    setFeedbackMsg(null);
  }, [isOpen]);

  if (!isOpen) return null;

  // 요약 텍스트 생성
  const generateSummary = (state) => {
    const parts = [];
    if (state.midSpanStr || state.ringSpanStr) {
      parts.push(`스판: M ${state.midSpanStr || '-'} / R ${state.ringSpanStr || '-'}`);
    }
    if (state.holeSize || state.ovalSize) {
      parts.push(`오발: ${state.holeSize || '-'} x ${state.ovalSize || '-'}${state.ovalAngle ? ` @ ${state.ovalAngle}°` : ''}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '기본 설정';
  };

  // 현재 상태 저장 핸들러
  const handleSaveCurrent = (e) => {
    e.preventDefault();
    const now = new Date();
    const defaultDateTitle = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 저장`;
    const finalTitle = slotTitle.trim() || defaultDateTitle;
    const newSlot = {
      id: `slot_${Date.now()}`,
      title: finalTitle,
      createdAt: now.toISOString(),
      createdAtDisplay: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      summary: generateSummary(currentSharedState),
      data: JSON.parse(JSON.stringify(currentSharedState)),
    };

    const nextSlots = [newSlot, ...slots];
    setSlots(nextSlots);
    try {
      localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(nextSlots));
      setFeedbackMsg('현재 수치가 성공적으로 저장되었습니다!');
      setTimeout(() => {
        setFeedbackMsg(null);
        setModalTab('load');
      }, 700);
    } catch (err) {
      console.error('Save failed', err);
      setFeedbackMsg('저장에 실패했습니다.');
    }
  };

  // 슬롯 불러오기 핸들러
  const handleLoadSlot = (slot) => {
    if (slot && slot.data) {
      onLoadState(slot.data);
      onClose();
    }
  };

  // 슬롯 삭제 핸들러
  const handleDeleteSlot = (e, slotId) => {
    e.stopPropagation();
    const nextSlots = slots.filter((s) => s.id !== slotId);
    setSlots(nextSlots);
    try {
      localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(nextSlots));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  // 📤 슬롯 공유 핸들러 (모바일: 카톡/문자 텍스트 공유, 데스크탑: .txt 파일 다운로드 + 클립보드 복사)
  const handleShareSlot = async (e, slot) => {
    if (e) e.stopPropagation();
    const stateToShare = slot?.data || currentSharedState;
    const titleToShare = slot?.title || '현재 제원 세팅';

    try {
      const shareText = generateShareText(titleToShare, stateToShare);
      const isMobile =
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && navigator.maxTouchPoints > 1);

      if (isMobile && navigator.share) {
        await navigator.share({
          title: `[ProDrill Tools] ${titleToShare}`,
          text: shareText,
        });
      } else {
        // 데스크탑: 텍스트 파일(.txt) 자동 다운로드 + 클립보드 복사
        const safeTitle = (titleToShare || '제원').replace(/[/\\?%*:|"<>]/g, '_');
        const filename = `ProDrill_지공제원_${safeTitle}.txt`;
        downloadTextFile(filename, shareText);
        await navigator.clipboard.writeText(shareText);
        setFeedbackMsg('제원 파일(.txt)이 저장되고 클립보드에 복사되었습니다!');
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          const shareText = generateShareText(titleToShare, stateToShare);
          const safeTitle = (titleToShare || '제원').replace(/[/\\?%*:|"<>]/g, '_');
          const filename = `ProDrill_지공제원_${safeTitle}.txt`;
          downloadTextFile(filename, shareText);
          await navigator.clipboard.writeText(shareText);
          setFeedbackMsg('제원 파일(.txt)이 저장되고 클립보드에 복사되었습니다!');
          setTimeout(() => setFeedbackMsg(null), 3000);
        } catch (copyErr) {
          console.error('Share failed', copyErr);
          setFeedbackMsg('공유 중 오류가 발생했습니다.');
        }
      }
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 & 닫기 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight font-sans">
              ARCHIVE
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 탭 스위처: [ 저장 ] vs [ 불러오기 ] */}
        <div className="grid grid-cols-2 gap-1 bg-[#f8fafc] border border-slate-200/80 p-1 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setModalTab('save')}
            className={`py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              modalTab === 'save'
                ? 'bg-[#1e293b] text-white shadow-md font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            저장
          </button>

          <button
            type="button"
            onClick={() => setModalTab('load')}
            className={`py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              modalTab === 'load'
                ? 'bg-[#1e293b] text-white shadow-md font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            불러오기
          </button>
        </div>

        {/* 탭 내용 영역 (덜컹임 방지 고정 높이 h-[320px] 및 좌우 여백 px-1) */}
        <div className="h-[320px] overflow-y-auto space-y-3 px-1 pr-1.5 py-1">
          {modalTab === 'save' && (
            <form onSubmit={handleSaveCurrent} className="space-y-4 py-1 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={slotTitle}
                    onChange={(e) => setSlotTitle(e.target.value)}
                    placeholder="이름 입력 (미입력 시 현재 날짜로 저장)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-[16px] font-semibold text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/20 focus:bg-white transition-all"
                  />
                </div>

                {/* 현재 데이터 요약 카드 */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    {generateSummary(currentSharedState)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    스판, 미드라인, 오발 수치 전체가 안전하게 보관됩니다.
                  </div>
                </div>

                {feedbackMsg && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold text-center animate-fade-in">
                    {feedbackMsg}
                  </div>
                )}
              </div>

              <div className="space-y-2 shrink-0">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#1e293b] hover:bg-[#0f172a] text-white font-black text-sm rounded-md transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-98"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={(e) => handleShareSlot(e, { title: slotTitle || '현재 제원', data: currentSharedState })}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-md transition-all flex items-center justify-center cursor-pointer active:scale-98 border border-slate-300"
                >
                  공유
                </button>
              </div>
            </form>
          )}

          {modalTab === 'load' && (
            <div className="space-y-2 py-1">
              {feedbackMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold text-center animate-fade-in">
                  {feedbackMsg}
                </div>
              )}

              {slots.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <div className="text-xs font-bold">저장된 제원 기록이 없습니다.</div>
                  <div className="text-[11px]">
                    [저장] 탭에서 수치를 저장해 보세요.
                  </div>
                </div>
              ) : (
                slots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => handleLoadSlot(slot)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <div className="space-y-1 truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm truncate">
                          {slot.title}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                          {slot.createdAtDisplay || '저장됨'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold truncate">
                        {slot.summary}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleShareSlot(e, slot)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-md transition-all"
                        title="카카오톡/문자 제원표 및 원클릭 복원 링크 공유"
                      >
                        공유
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSlot(slot);
                        }}
                        className="px-2.5 py-1.5 bg-[#1e293b] text-white text-xs font-bold rounded-md hover:bg-black transition-all"
                      >
                        불러오기
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSlot(e, slot.id)}
                        className="px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        title="삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

