import { useState, useEffect, useCallback } from 'react';
import { getAiRecommendations, hasApiKey, convertLayoutTo2LS, convert2LSToDualAngle, getApiKeyForProvider, saveApiKeyForProvider } from '../../lib/openaiService.js';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function AiRecommendationModal({ 
  isOpen, 
  onClose, 
  bowler, 
  spec, 
  ballName,
  onSelectRecommendation 
}) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [needsKey, setNeedsKey] = useState(!hasApiKey());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  


  // 2LS 개별 변환 캐시
  const [convertedCache, setConvertedCache] = useState({});
  const [convertingIndex, setConvertingIndex] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setRecommendations([]);
    try {
      const result = await getAiRecommendations({ bowler, spec, ballName });
      if (Array.isArray(result) && result.length === 4) {
        setRecommendations(result);
      } else {
        throw new Error('RECOMMENDATIONS_FORMAT_ERROR');
      }
    } catch (err) {
      console.error("추천 로드 실패:", err);
      if (err.message === 'API_KEY_MISSING') {
        setNeedsKey(true);
      } else {
        setErrorMsg(`AI 추천 로드 실패: ${err.message || '알 수 없는 오류가 발생했습니다. API 키 및 인터넷 연결을 확인해 주세요.'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [bowler, spec, ballName]);

  useEffect(() => {
    if (isOpen) {
      setNeedsKey(!hasApiKey());
      setApiKeyInput(getApiKeyForProvider());
      setErrorMsg('');
      
      // 이미 키가 있고 모달이 열리면 자동으로 추천 호출 시작
      if (hasApiKey()) {
        fetchRecommendations();
      }
    }
  }, [isOpen, fetchRecommendations]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    saveApiKeyForProvider(apiKeyInput);
    setNeedsKey(false);
    fetchRecommendations();
  };

  // 💡 [양방향 변환 핸들러]: 레이아웃 포맷에 맞춰 2LS 또는 Dual Angle로 상호 변환
  const handleConvertLayout = async (index, currentLayout) => {
    if (convertedCache[index]) {
      setConvertedCache(prev => {
        const cached = prev[index];
        return {
          ...prev,
          [index]: {
            ...cached,
            activeVal: cached.activeVal === 'converted' ? 'original' : 'converted'
          }
        };
      });
      return;
    }

    setConvertingIndex(index);
    try {
      const has2lsPrefix = currentLayout.includes('(2LS)');
      
      if (has2lsPrefix) {
        // 2LS -> Dual Angle 역변환
        const res = await convert2LSToDualAngle({
          currentLayout,
          bowler,
          spec
        });
        if (res && res.dualAngle) {
          setConvertedCache(prev => ({
            ...prev,
            [index]: {
              original: currentLayout,
              converted: res.dualAngle,
              reason: res.reason,
              activeVal: 'converted'
            }
          }));
        }
      } else {
        // Dual Angle -> 2LS 변환
        const res = await convertLayoutTo2LS({
          currentLayout,
          bowler,
          spec
        });
        if (res && res.twoLS) {
          setConvertedCache(prev => ({
            ...prev,
            [index]: {
              original: currentLayout,
              converted: res.twoLS,
              reason: res.reason,
              activeVal: 'converted'
            }
          }));
        }
      }
    } catch (err) {
      console.error("변환 실패:", err);
      setErrorMsg(`변환 실패: ${err.message || '오류가 발생했습니다. 볼러 스펙 및 네트워크 설정을 체크해 주세요.'}`);
    } finally {
      setConvertingIndex(null);
    }
  };

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'Heavy Oil': return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-200 text-red-800', label: '🔴 헤비 오일' };
      case 'Medium Oil': return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-200 text-amber-800', label: '🟡 미디엄 오일' };
      case 'Dry Oil': return { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', badge: 'bg-sky-200 text-sky-800', label: '🔵 드라이 오일' };
      default: return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-200 text-emerald-800', label: '🟢 표준 레퍼런스' };
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="✨ ProDrill AI 레이아웃 추천">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        
        {/* 1. API 키 설정 화면 */}
        {needsKey ? (
          <form onSubmit={handleSaveKey} className="space-y-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-center">
              <span className="text-3xl">🔑</span>
              <h3 className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base">Gemini API Key 등록</h3>
            </div>

            <div className="space-y-2 text-left px-1">
              <p className="text-[11px] text-slate-500 leading-normal">
                구글 제미나이 지공 추천 기능을 활성화하기 위해 Gemini API Key를 입력해 주세요.<br />
                API 키가 없으신 경우 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-black">구글 AI 스튜디오(Google AI Studio)</a>에서 무료로 발급받으실 수 있습니다.
              </p>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>취소</Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={!apiKeyInput.trim()}>저장 후 추천받기</Button>
            </div>
          </form>
        ) : (
          <>
            {/* 2. 로딩 화면 */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="text-center">
                  <h3 className="font-black text-slate-800 text-sm sm:text-base">AI 레이아웃 연산 중...</h3>
                  <p className="text-xs text-slate-400 mt-1">볼러 특성 및 볼링공 궁합에 최적인 지공법을 계산하고 있습니다.</p>
                </div>
              </div>
            )}

            {/* 3. 에러 표시 */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <p className="text-sm font-medium text-red-600 leading-normal">{errorMsg}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setNeedsKey(true)}>🔑 API 키 변경</Button>
                  <Button variant="primary" size="sm" onClick={fetchRecommendations}>🔄 다시 추천받기</Button>
                </div>
              </div>
            )}

            {/* 4. 추천 결과 출력 */}
            {recommendations.length === 4 && (
              <div className="space-y-4 pb-2">
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-600">
                  <span>볼링공: <strong className="text-slate-800">{ballName || '미지정'}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => setNeedsKey(true)} 
                      className="text-slate-400 hover:text-slate-600 mr-2 flex items-center gap-0.5"
                    >
                      ⚙️ API 키 관리
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {recommendations.map((item, idx) => {
                    const style = getConditionColor(item.condition);
                    
                    // 양방향 변환 캐싱 및 스왑 바인딩
                    const hasConverted = convertedCache[idx];
                    let currentVal = item.layout;
                    let displayReason = item.description;

                    if (hasConverted && hasConverted.activeVal === 'converted') {
                      currentVal = hasConverted.converted;
                      displayReason = `[변환] ${hasConverted.reason}`;
                    }

                    const isConverting = convertingIndex === idx;
                    const isCurrent2LS = currentVal.includes('(2LS)');

                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          if (isConverting) return;
                          onSelectRecommendation({
                            layout: currentVal,
                            intentSummary: item.intentSummary || item.description,
                            condition: style.label
                          });
                          onClose();
                        }}
                        className={`p-4 border rounded-2xl cursor-pointer hover:shadow-md active:scale-[0.99] transition-all flex flex-col gap-2 relative ${style.bg} ${isConverting ? 'opacity-70 pointer-events-none' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${style.badge}`}>
                            {style.label}
                          </span>
                          
                          {/* 💡 [양방향 변환 단추]: 2LS 형식일 땐 "Dual 변환", Dual Angle 형식일 땐 "2LS 변환" 버튼 노출 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvertLayout(idx, currentVal);
                            }}
                            className="px-2 py-1 rounded border text-[9px] font-black bg-white text-slate-500 border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            {isConverting ? '변환 중...' : isCurrent2LS ? 'Dual 변환' : '2LS 변환'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex flex-col">
                            <span className="text-xl font-black text-slate-800 tracking-tight">
                              {currentVal}
                            </span>
                            <span className="text-xs font-bold text-slate-600 mt-1 leading-normal">
                              {displayReason}
                            </span>
                          </div>
                          
                          <span className="text-slate-400 self-center">
                            <Icon name="chevronRight" size={16} strokeWidth={3} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
