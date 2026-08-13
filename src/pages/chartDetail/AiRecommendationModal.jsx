import { useState, useEffect, useCallback, useRef } from 'react';
import { searchBowlingBall, getLayoutRecommendations, hasApiKey, convertLayoutTo2LS, convert2LSToDualAngle, getApiKeyForProvider, saveApiKeyForProvider } from '../../lib/openaiService.js';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

const getCoreTypeBadge = (type) => {
  if (!type) return 'bg-slate-100 text-slate-600';
  return type === 'Asymmetric' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
};

const getCoverstockBadge = (type) => {
  if (!type) return 'bg-slate-100 text-slate-600';
  if (type === 'Solid') return 'bg-red-100 text-red-700';
  if (type === 'Pearl') return 'bg-sky-100 text-sky-700';
  return 'bg-purple-100 text-purple-700';
};

const getConditionColor = (cond) => {
  switch (cond) {
    case 'Heavy Oil': return { bg: 'bg-red-50 border-red-200', badge: 'bg-red-200 text-red-800', label: '\uD83D\uDD34 \ud5e4\ube44 \uc624\uc77c' };
    case 'Medium Oil': return { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-200 text-amber-800', label: '\uD83D\uDFE1 \ubbf8\ub514\uc5c4 \uc624\uc77c' };
    case 'Dry Oil': return { bg: 'bg-sky-50 border-sky-200', badge: 'bg-sky-200 text-sky-800', label: '\uD83D\uDD35 \ub4dc\ub77c\uc774 \uc624\uc77c' };
    default: return { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-200 text-emerald-800', label: '\uD83D\uDFE2 \ud45c\uc900 \ub808\ud37c\ub7f0\uc2a4' };
  }
};

export default function AiRecommendationModal({ 
  isOpen, 
  onClose, 
  bowler, 
  spec, 
  ballName,
  onSelectRecommendation 
}) {
  // API 키
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [needsKey, setNeedsKey] = useState(!hasApiKey());

  // 2단계 흐름 상태
  const [step, setStep] = useState('BALL_SEARCH'); // 'BALL_SEARCH' | 'LAYOUT_RESULT'
  const [localBallName, setLocalBallName] = useState(ballName || '');
  const [ballInfo, setBallInfo] = useState(null);

  // 볼 재검색 입력창 표시 상태
  const [showReSearch, setShowReSearch] = useState(false);
  const [reSearchInput, setReSearchInput] = useState('');

  // 레이아웃 결과
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 2LS 변환 캐시
  const [convertedCache, setConvertedCache] = useState({});
  const [convertingIndex, setConvertingIndex] = useState(null);

  // 중복 호출 방지용 Ref
  const isSearchingRef = useRef(false);
  const searchedNameRef = useRef('');

  // ── 볼 검색 함수 ──
  const handleSearchBall = useCallback(async (nameOverride) => {
    const name = (nameOverride !== undefined ? nameOverride : localBallName).trim();
    if (!name || isSearchingRef.current) return;
    
    isSearchingRef.current = true;
    setLoading(true);
    setErrorMsg('');
    setBallInfo(null);
    setShowReSearch(false);
    setReSearchInput('');

    try {
      const result = await searchBowlingBall({ ballName: name });
      setLocalBallName(name);
      setBallInfo(result);
      searchedNameRef.current = name;
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') { 
        setNeedsKey(true); 
      } else { 
        setErrorMsg(`볼 검색 실패: ${err.message || '알 수 없는 오류'}`); 
      }
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  }, [localBallName]);

  // 모달 열릴 때 → 단 1회 자동 볼 검색 시작
  useEffect(() => {
    if (isOpen) {
      const initialName = (ballName || '').trim();
      setStep('BALL_SEARCH');
      setLocalBallName(initialName);
      setBallInfo(null);
      setRecommendations([]);
      setErrorMsg('');
      setConvertedCache({});
      setShowReSearch(false);
      setReSearchInput('');
      setNeedsKey(!hasApiKey());
      setApiKeyInput(getApiKeyForProvider());

      // 중복 검색 방지 (이미 동일 이름으로 검색 진행 중이거나 검색된 경우 스킵)
      if (hasApiKey() && initialName && searchedNameRef.current !== initialName) {
        handleSearchBall(initialName);
      }
    } else {
      searchedNameRef.current = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Step 2: 레이아웃 추천 ──
  const handleGetLayouts = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    setRecommendations([]);
    setStep('LAYOUT_RESULT');
    try {
      const result = await getLayoutRecommendations({ bowler, spec, ball: ballInfo });
      if (Array.isArray(result) && result.length === 4) {
        setRecommendations(result);
      } else {
        throw new Error('RECOMMENDATIONS_FORMAT_ERROR');
      }
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') { setNeedsKey(true); }
      else { setErrorMsg(`레이아웃 추천 실패: ${err.message || '알 수 없는 오류'}`); }
    } finally {
      setLoading(false);
    }
  }, [bowler, spec, ballInfo, loading]);

  // 재검색 실행
  const handleReSearch = (e) => {
    e.preventDefault();
    const name = reSearchInput.trim();
    if (!name) return;
    searchedNameRef.current = '';
    handleSearchBall(name);
  };

  // 2LS ↔ Dual Angle 변환
  const handleConvertLayout = async (index, currentLayout) => {
    if (convertedCache[index]) {
      setConvertedCache(prev => ({
        ...prev,
        [index]: { ...prev[index], activeVal: prev[index].activeVal === 'converted' ? 'original' : 'converted' }
      }));
      return;
    }
    setConvertingIndex(index);
    try {
      const has2ls = currentLayout.includes('(2LS)');
      if (has2ls) {
        const res = await convert2LSToDualAngle({ currentLayout, bowler, spec });
        if (res?.dualAngle) {
          setConvertedCache(prev => ({ ...prev, [index]: { original: currentLayout, converted: res.dualAngle, reason: res.reason, activeVal: 'converted' } }));
        }
      } else {
        const res = await convertLayoutTo2LS({ currentLayout, bowler, spec });
        if (res?.twoLS) {
          setConvertedCache(prev => ({ ...prev, [index]: { original: currentLayout, converted: res.twoLS, reason: res.reason, activeVal: 'converted' } }));
        }
      }
    } catch (err) {
      setErrorMsg(`변환 실패: ${err.message}`);
    } finally {
      setConvertingIndex(null);
    }
  };

  if (!isOpen) return null;

  // ── API 키 입력 화면 ──
  if (needsKey) {
    return (
      <ModalShell isOpen={isOpen} onClose={onClose} title={"\u2728 ProDrill AI \ub808\uc774\uc544\uc6c3 \ucd94\ucc9c"}>
        <form onSubmit={(e) => { e.preventDefault(); if (apiKeyInput.trim()) { saveApiKeyForProvider(apiKeyInput); setNeedsKey(false); } }} className="space-y-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-center">
            <span className="text-3xl">{"\uD83D\uDD11"}</span>
            <h3 className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base">Gemini API Key {"\ub4f1\ub85d"}</h3>
          </div>
          <div className="space-y-2 text-left px-1">
            <p className="text-[11px] text-slate-500 leading-normal">
              {"\uAD6C\uAE00 \uC81C\uBBF8\ub098\uc774 \uc9c0\uacf5 \ucd94\ucc9c \uae30\ub2a5\uc744 \ud65c\uc131\ud654\ud558\uae30 \uc704\ud574 Gemini API Key\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694."}
              <br />
              API {"\ud0a4\uac00 \uc5c6\uc73c\uc2e0 \uacbd\uc6b0"}{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-black">
                Google AI Studio
              </a>
              {"\uc5d0\uc11c \ubb34\ub8cc\ub85c \ubc1c\uae09\ubc1b\uc73c\uc2e4 \uc218 \uc788\uc2b5\ub2c8\ub2e4."}
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
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{"\ucde8\uc18c"}</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={!apiKeyInput.trim()}>{"\uc800\uc7a5 \ud6c4 \ucd94\ucc9c\ubc1b\uae30"}</Button>
          </div>
        </form>
      </ModalShell>
    );
  }

  // ── STEP 1: 볼링공 검색 ──
  if (step === 'BALL_SEARCH') {
    return (
      <ModalShell isOpen={isOpen} onClose={onClose} title={"\uD83C\uDFB3 \uBCFC\ub9c1\uacf5 \uac80\uc0c9"}>
        <div className="space-y-4 max-h-[72vh] overflow-y-auto px-1">

          {/* 조회 중 볼 이름 표시 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-black text-slate-700">{localBallName}</p>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{"\ubcfc\ub9c1\uacf5 \uc815\ubcf4 \uc870\ud68c \uc911..."}</p>
              </div>
            </div>
          )}

          {/* 에러 */}
          {errorMsg && !loading && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <p className="text-xs font-medium text-red-600">{errorMsg}</p>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => {
                  searchedNameRef.current = '';
                  handleSearchBall(localBallName);
                }}
              >
                {"\uD83D\uDD04 \ub2e4\uc2dc \uc2dc\ub3c4"}
              </Button>
            </div>
          )}

          {/* 볼 검색 결과 카드 (이미지 대신 컴팩트 헤더 + 제원 정보) */}
          {ballInfo && !loading && (
            <div className={`rounded-2xl border overflow-hidden ${ballInfo.found ? 'border-indigo-200' : 'border-amber-300'}`}>

              {/* 제원 정보 */}
              <div className={`p-4 space-y-3 ${ballInfo.found ? 'bg-indigo-50/70' : 'bg-amber-50/70'}`}>

                {/* 이름 / 브랜드 / 출시년도 / 상태 뱃지 */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-800 text-lg leading-tight">
                        {ballInfo.officialName || localBallName || '\uC54C \uc218 \uc5c6\ub294 \ubcfc'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {ballInfo.brand && <span className="text-xs text-slate-600 font-extrabold">{ballInfo.brand}</span>}
                      {ballInfo.releaseYear && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[11px] font-black">
                          {"\uD83D\uDCC5 "}{ballInfo.releaseYear}{"\ub144 \ucd9c\uc2dc"}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${ballInfo.found ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {ballInfo.found ? '\uD655\uc778\ub428' : '\uBBF8\uc778\uc2dd'}
                  </span>
                </div>

                {/* 음차 변환 안내 */}
                {ballInfo.phoneticNote && (
                  <div className="flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                    <span className="text-blue-500 text-xs mt-0.5">{"\uD83D\uDD35"}</span>
                    <span className="text-[11px] text-blue-700 font-bold leading-snug">{ballInfo.phoneticNote}</span>
                  </div>
                )}

                {/* 스펙 뱃지 */}
                {ballInfo.found && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ballInfo.coreType && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${getCoreTypeBadge(ballInfo.coreType)}`}>
                        {ballInfo.coreType === 'Asymmetric' ? '\u2B21 \ube44\ub300\uce6d \ucf54\uc5b4' : '\u25CB \ub300\uce6d \ucf54\uc5b4'}
                      </span>
                    )}
                    {ballInfo.coverstockType && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${getCoverstockBadge(ballInfo.coverstockType)}`}>
                        {ballInfo.coverstockType}
                      </span>
                    )}
                    {ballInfo.rg > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white border border-slate-200 text-slate-700">RG {ballInfo.rg}</span>
                    )}
                    {ballInfo.diff > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white border border-slate-200 text-slate-700">Diff {ballInfo.diff}</span>
                    )}
                    {ballInfo.oilCondition && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700">{ballInfo.oilCondition}</span>
                    )}
                  </div>
                )}

                {/* 커버스톡 / 피니시 */}
                {ballInfo.found && (ballInfo.coverstock || ballInfo.finish) && (
                  <p className="text-[11px] text-slate-500 leading-snug pt-0.5">
                    {ballInfo.coverstock && <span className="mr-2">{"\ucee4\ubc84: "}<strong className="text-slate-700">{ballInfo.coverstock}</strong></span>}
                    {ballInfo.finish && <span>{"\ud53c\ub2c8\uc2dc: "}<strong className="text-slate-700">{ballInfo.finish}</strong></span>}
                  </p>
                )}

                {!ballInfo.found && (
                  <p className="text-xs text-amber-700 font-bold">{"\ubcfc\ub9c1\uacf5\uc744 \uc778\uc2dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc544\ub798 \uc7ac\uac80\uc0c9 \ubc84\ud2bc\uc744 \ub20c\ub7ec \ub2e4\uc2dc \uc785\ub825\ud574 \uc8fc\uc138\uc694."}</p>
                )}

                <p className="text-[10px] text-slate-400 italic pt-1">{"* AI \ucd94\uc815 \uc815\ubcf4 \u2014 \uc815\ud655\ud55c \uc81c\uc6d0\uc740 \uc81c\uc870\uc0ac \uacf5\uc2dd \uc0ac\uc774\ud2b8\ub97c \ud655\uc778\ud558\uc138\uc694."}</p>
              </div>

              {/* 액션 버튼 영역 */}
              <div className="px-3.5 pb-3.5 pt-2 flex flex-col gap-2 bg-white">
                {/* 이 볼로 레이아웃 추천 버튼 (볼 인식된 경우만) */}
                {ballInfo.found && (
                  <Button
                    variant="primary"
                    className="w-full py-3 font-black text-sm"
                    onClick={handleGetLayouts}
                  >
                    {"\uc774 \ubcfc\ub85c \ub808\uc774\uc544\uc6c3 \ucd94\ucc9c\ubc1b\uae30 \u2192"}
                  </Button>
                )}

                {/* 화면한 재검색 버튼 — 항상 표시 */}
                {!showReSearch ? (
                  <button
                    type="button"
                    onClick={() => setShowReSearch(true)}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-xs font-black text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Icon name="search" size={13} strokeWidth={2.5} />
                    {"\ub2e4\ub978 \ubcfc \uc774\ub984\uc73c\ub85c \uc7ac\uac80\uc0c9"}
                  </button>
                ) : (
                  <form onSubmit={handleReSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={reSearchInput}
                      onChange={e => setReSearchInput(e.target.value)}
                      placeholder={"\ubcfc \uc774\ub984 \uc785\ub825 (예: Storm Phaze II...)"}
                      autoFocus
                      className="flex-1 px-3 py-2.5 bg-white border-2 border-indigo-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 outline-none transition-all"
                    />
                    <Button type="submit" variant="primary" size="sm" disabled={!reSearchInput.trim()}>
                      {"\uac80\uc0c9"}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setShowReSearch(false); setReSearchInput(''); }}>
                      {"\ucde8\uc18c"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* API 키 관리 링크 */}
          {!loading && (
            <button
              type="button"
              onClick={() => setNeedsKey(true)}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              {"\u2699\uFE0F API \ud0a4 \uad00\ub9ac"}
            </button>
          )}
        </div>
      </ModalShell>
    );
  }

  // ── STEP 2: 레이아웃 추천 결과 ──
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={"\u2728 ProDrill AI \ub808\uc774\uc544\uc6c3 \ucd94\ucc9c"}>
      <div className="space-y-4 max-h-[72vh] overflow-y-auto px-1">

        {/* 볼 변경 헤더 */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <button
            type="button"
            onClick={() => { setStep('BALL_SEARCH'); setRecommendations([]); setErrorMsg(''); }}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Icon name="chevronLeft" size={14} strokeWidth={3} />
            {"\ubcfc \ubcc0\uacbd"}
          </button>
          <span className="text-xs font-black text-slate-700">{"\uD83C\uDFB3 "}{ballInfo?.officialName || localBallName}</span>
          <button
            type="button"
            onClick={() => setNeedsKey(true)}
            className="text-[11px] text-slate-400 hover:text-slate-600"
          >
            {"\u2699\uFE0F API \ud0a4"}
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-14 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="font-black text-slate-800 text-sm">AI {"\ub808\uc774\uc544\uc6c3 \uc5f0\uc0b0 \uc911..."}</h3>
              <p className="text-xs text-slate-400 mt-1">{"\ubcfc\ub7ec \ud2b9\uc131 \ubc0f \ubcfc\ub9c1\uacf5 \uad81\ud569\uc5d0 \ucd5c\uc801\uc778 \uc9c0\uacf5\ubc95\uc744 \uacc4\uc0b0\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4."}</p>
            </div>
          </div>
        )}

        {/* 에러 */}
        {errorMsg && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
            <p className="text-sm font-medium text-red-600">{errorMsg}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNeedsKey(true)}>{"\uD83D\uDD11 API \ud0a4 \ubcc0\uacbd"}</Button>
              <Button variant="primary" size="sm" onClick={handleGetLayouts}>{"\uD83D\uDD04 \ub2e4\uc2dc \ucd94\ucc9c\ubc1b\uae30"}</Button>
            </div>
          </div>
        )}

        {/* 레이아웃 카드 */}
        {recommendations.length === 4 && !loading && (
          <div className="grid grid-cols-1 gap-3 pb-2">
            {recommendations.map((item, idx) => {
              const style = getConditionColor(item.condition);
              const hasConverted = convertedCache[idx];
              let currentVal = item.layout;
              let displayReason = item.description;

              if (hasConverted && hasConverted.activeVal === 'converted') {
                currentVal = hasConverted.converted;
                displayReason = `[\ubcc0\ud658] ${hasConverted.reason}`;
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
                  className={`p-4 border rounded-2xl cursor-pointer hover:shadow-md active:scale-[0.99] transition-all flex flex-col gap-2 ${style.bg} ${isConverting ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${style.badge}`}>
                      {style.label}
                    </span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleConvertLayout(idx, currentVal); }}
                      className="px-2 py-1 rounded border text-[9px] font-black bg-white text-slate-500 border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      {isConverting ? '\ubcc0\ud658 \uc911...' : isCurrent2LS ? 'Dual \ubcc0\ud658' : '2LS \ubcc0\ud658'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-slate-800 tracking-tight">{currentVal}</span>
                      <span className="text-xs font-bold text-slate-600 mt-1 leading-normal">{displayReason}</span>
                    </div>
                    <span className="text-slate-400 self-center">
                      <Icon name="chevronRight" size={16} strokeWidth={3} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
