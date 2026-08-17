import { useState, useEffect, useCallback } from 'react';
import { getLayoutRecommendations, hasApiKey, convertLayoutTo2LS, convert2LSToDualAngle, getApiKeyForProvider, saveApiKeyForProvider } from '../../lib/openaiService.js';
import { searchBallFromLocalDb, formatBallToFactResult, saveCustomBallToLocalDb, searchSeriesBallsFromLocalDb } from '../../lib/ballDbService.js';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

const getConditionColor = (cond) => {
  switch (cond) {
    case 'Heavy Oil': return { bg: 'bg-red-50/80 border-red-200 hover:bg-red-100/90', badge: 'bg-red-200 text-red-800', label: '헤비 오일' };
    case 'Medium Oil': return { bg: 'bg-amber-50/80 border-amber-200 hover:bg-amber-100/90', badge: 'bg-amber-200 text-amber-800', label: '미디엄 오일' };
    case 'Dry Oil': return { bg: 'bg-sky-50/80 border-sky-200 hover:bg-sky-100/90', badge: 'bg-sky-200 text-sky-800', label: '드라이 오일' };
    default: return { bg: 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/90', badge: 'bg-emerald-200 text-emerald-800', label: '표준 레퍼런스' };
  }
};

// Dual 표기 및 각도 기호(°) 자동 보정 헬퍼
const formatLayoutDisplay = (val) => {
  if (!val) return '';
  let str = val.replace(/Dual\s*Angle/gi, 'Dual').trim();
  if (str.includes('(Dual)') || str.startsWith('Dual') || (!str.includes('(2LS)') && /^\d+\s*x/i.test(str))) {
    // 50 x 4 1/2 x 35 형태에 ° 각도 기호 자동 부착
    str = str.replace(/\(Dual\)\s*(\d+)\s*x\s*([\d\s/]+)\s*x\s*(\d+)/gi, '(Dual) $1° x $2 x $3°');
    if (!str.includes('°') && /^\d+\s*x/i.test(str)) {
      str = str.replace(/^(\d+)\s*x\s*([\d\s/]+)\s*x\s*(\d+)$/gi, '(Dual) $1° x $2 x $3°');
    }
  }
  return str;
};

// 해설 텍스트 마침표(.) 다음 무조건 행(줄바꿈) 분리 헬퍼 (숫자 제거)
const formatReasonLines = (reasonText) => {
  if (!reasonText) return [];
  const cleaned = reasonText.replace(/\r/g, '');
  const parts = cleaned.split(/(?<=[가-힣a-zA-Z)"'°인치]\.)\s+|\n+/);
  const lines = [];

  parts.forEach(p => {
    let t = p.trim().replace(/^\d+\.\s*/, '');
    if (t.length > 0) lines.push(t);
  });

  return lines.length > 0 ? lines : [cleaned.replace(/^\d+\.\s*/, '').trim()];
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

  // 3단계 흐름 상태: 'BALL_INFO_INPUT' (볼링공 정보 입력) | 'BALL_INFO_CONFIRM' (볼링공 정보 확인) | 'LAYOUT_RESULT' (레이아웃 추천)
  const [step, setStep] = useState('BALL_INFO_INPUT');

  // ── 볼링공 정보 입력 폼 상태 ──
  const [brandInput, setBrandInput] = useState(''); // 제조사 (브랜드) 입력/선택 상태
  const [ballDisplayName, setBallDisplayName] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('15'); // '13' | '14' | '15' | '16'
  const [coreType, setCoreType] = useState('Symmetric'); // Symmetric | Asymmetric
  const [rg, setRg] = useState('');
  const [diff, setDiff] = useState('');
  const [intDiff, setIntDiff] = useState('');
  const [coverstockInput, setCoverstockInput] = useState(''); 
  const [factoryFinish, setFactoryFinish] = useState(''); 
  const [oilCondition, setOilCondition] = useState('Medium Oil');
  
  // 미입력 필드 강조 피드백 상태
  const [highlightEmpty, setHighlightEmpty] = useState(false);

  // 로컬 DB 매칭 및 백업 메모리 상태
  const [isFactDb, setIsFactDb] = useState(false);
  const [rawMatchedBall, setRawMatchedBall] = useState(null);
  const [savedBackupSpecs, setSavedBackupSpecs] = useState(null); // 지공사가 배지 재클릭 시 100% 원상복구(Restore)할 백업 메모리
  const [isSpecsCleared, setIsSpecsCleared] = useState(false); // 수치 제거 토글 상태

  // 시리즈 검색 추천 칩 목록 상태
  const [seriesSuggestions, setSeriesSuggestions] = useState([]);

  // 🧹 🎯 [로컬 DB] 배지 제자리 클릭 ➔ ✕ (수치 제거) ↔ 다시 클릭 시 수치 100% 원상복구 토글
  const handleToggleLocalDbBadge = () => {
    if (!isSpecsCleared) {
      // 1회 클릭: 대입된 수치 제거 ➔ [ 로컬 DB ✕ ] 토글
      setIsSpecsCleared(true);
      setBrandInput('');
      setRg('');
      setDiff('');
      setIntDiff('');
      setCoverstockInput('');
      setFactoryFinish('');
      setCoreType('Symmetric');
    } else {
      // 다시 클릭: 백업 메모리에서 원래 DB 수치 100% 원상복구 (Restore)
      setIsSpecsCleared(false);
      if (savedBackupSpecs) {
        setBrandInput(savedBackupSpecs.brand || '');
        setCoreType(savedBackupSpecs.coreType || 'Symmetric');
        setRg(savedBackupSpecs.rg || '');
        setDiff(savedBackupSpecs.diff || '');
        setIntDiff(savedBackupSpecs.intDiff || '');
        setCoverstockInput(savedBackupSpecs.coverstock || '');
        setFactoryFinish(savedBackupSpecs.finish || '');
      }
    }
  };

  // 레이아웃 결과
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 2LS 변환 캐시
  const [convertedCache, setConvertedCache] = useState({});
  const [convertingIndex, setConvertingIndex] = useState(null);

  // ── 모달 개출 시 로컬 DB 매칭 및 폼 초기화 ──
  useEffect(() => {
    if (isOpen) {
      const initialName = (ballName || '').trim();
      setStep('BALL_INFO_INPUT');
      setBallDisplayName(initialName || '');
      setRecommendations([]);
      setErrorMsg('');
      setConvertedCache({});
      setHighlightEmpty(false);
      setNeedsKey(!hasApiKey());
      setApiKeyInput(getApiKeyForProvider());

      // 🚀 0초 진입 순간 선제적으로 '수동 직접 입력' 모드로 기본 세팅 (됐 안됐 런타임 현상 원천 방지!)
      setIsFactDb(false);
      setRawMatchedBall(null);
      setIsSpecsCleared(false);

      let isMounted = true;
      (async () => {
        if (!initialName) {
          if (isMounted) {
            setIsFactDb(false);
            setRawMatchedBall(null);
            setSelectedWeight('15');
            setRg('');
            setDiff('');
            setIntDiff('');
            setCoverstockInput('');
            setFactoryFinish('');
          }
          return;
        }

        try {
          const match = await searchBallFromLocalDb(initialName);
          if (match && isMounted) {
            setRawMatchedBall(match);
            const fact = formatBallToFactResult(match);
            setIsFactDb(Boolean(fact?.isFactDb));

            const spec15 = match.specs_by_weight?.['15lb'] || match.specs_by_weight?.['14lb'] || {};
            setSelectedWeight(match.specs_by_weight?.['15lb'] ? '15' : (match.specs_by_weight?.['14lb'] ? '14' : '15'));
            setCoreType(match.core?.type || fact.coreType || 'Symmetric');
            
            const autoBrand = match.brand || fact.brand || 'Driller Custom';
            const autoRg = spec15.rg !== undefined ? String(spec15.rg) : (fact.rg !== undefined ? String(fact.rg) : '');
            const autoDiff = spec15.diff !== undefined ? String(spec15.diff) : (fact.diff !== undefined ? String(fact.diff) : '');
            const autoIntDiff = spec15.int_diff !== undefined ? String(spec15.int_diff) : '';
            
            // 🎯 커버스탁 텍스트에 (#1500 POLISH) 같은 피니쉬 괄호 문구가 겹쳐 들어온 경우 정밀 분리 정제!
            let rawCover = match.coverstock?.name || match.coverstock?.type || fact.coverstockType || '';
            let autoFinish = match.coverstock?.factory_finish || fact.finish || '';
            if (rawCover.includes('(')) {
              const matchFinishInParen = rawCover.match(/\((.*?)\)/);
              if (matchFinishInParen && matchFinishInParen[1] && !autoFinish) {
                autoFinish = matchFinishInParen[1];
              }
              rawCover = rawCover.replace(/\(.*\)/g, '').trim();
            }
            const autoCover = rawCover;
            const autoCore = match.core?.type || fact.coreType || 'Symmetric';

            setBrandInput(autoBrand);
            setRg(autoRg);
            setDiff(autoDiff);
            setIntDiff(autoIntDiff);
            setCoverstockInput(autoCover);
            setFactoryFinish(autoFinish);
            setOilCondition(match.oilCondition || fact.oilCondition || 'Medium Oil');

            // 💡 연관 공 시리즈 칩 상시 노출 알고리즘 적용
            const list = await searchSeriesBallsFromLocalDb(initialName);
            if (list && list.length > 0) {
              setSeriesSuggestions(list);
            }

            // 🎯 원상복구(Restore)용 백업 스펙 메모리 보존
            setSavedBackupSpecs({
              brand: autoBrand,
              rg: autoRg,
              diff: autoDiff,
              intDiff: autoIntDiff,
              coverstock: autoCover,
              finish: autoFinish,
              coreType: autoCore
            });
            setIsSpecsCleared(false);
            return;
          }
        } catch { /* 예외 무시 */ }

        if (isMounted) {
          setIsFactDb(false);
          setRawMatchedBall(null);
          setBrandInput('');
          setSelectedWeight('15');
          setCoreType('Symmetric');
          setRg('');
          setDiff('');
          setIntDiff('');
          setCoverstockInput('');
          setFactoryFinish('');
          setOilCondition('Medium Oil');
        }
      })();

      return () => { isMounted = false; };
    }
  }, [isOpen, ballName]);

  // ── 파운드 변경 시 팩트 DB 동적 수치 연동 ──
  const handleWeightChange = (wNum) => {
    setSelectedWeight(wNum);
    const weightKey = `${wNum}lb`;
    if (rawMatchedBall && rawMatchedBall.specs_by_weight) {
      const specForWeight = rawMatchedBall.specs_by_weight[weightKey];
      if (specForWeight) {
        setRg(specForWeight.rg !== undefined ? String(specForWeight.rg) : '');
        setDiff(specForWeight.diff !== undefined ? String(specForWeight.diff) : '');
        setIntDiff(specForWeight.int_diff !== undefined ? String(specForWeight.int_diff) : '');
      } else {
        setRg('');
        setDiff('');
        setIntDiff('');
      }
    }
  };

  // 🎯 "입력 정보 확인" 클릭 시 누락된 필드에 로즈(Rose) 붉은색 시각 피드백 & iOS 16px 대응 (대칭 코어 시 IntDiff 제외)
  const getFieldInputStyle = (val, isRequired = true, isFieldIntDiff = false) => {
    // 대칭 코어(Symmetric)일 때 IntDiff는 필수 검사 제외!
    const effectiveRequired = isFieldIntDiff ? (coreType === 'Asymmetric') : isRequired;

    if (highlightEmpty && effectiveRequired && (!val || String(val).trim() === '')) {
      return 'bg-rose-50/90 border-rose-500 ring-2 ring-rose-300 animate-pulse text-rose-950 placeholder-rose-400 font-bold shadow-2xs text-[16px]';
    }
    return 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 text-[16px] font-bold';
  };

  // ── Step 3: 레이아웃 추천 AI 연산 ──
  const handleGetLayouts = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    setRecommendations([]);
    setStep('LAYOUT_RESULT');

    const confirmedBall = {
      found: true,
      officialName: ballDisplayName,
      brand: brandInput || rawMatchedBall?.brand || 'Driller Custom',
      weight: `${selectedWeight}lb`,
      coreType,
      rg: parseFloat(rg) || null,
      diff: parseFloat(diff) || null,
      intDiff: coreType === 'Asymmetric' ? (parseFloat(intDiff) || null) : null,
      coverstock: coverstockInput,
      coverstockType: coverstockInput.toLowerCase().includes('solid') ? 'Solid' : (coverstockInput.toLowerCase().includes('pearl') ? 'Pearl' : 'Hybrid'),
      finish: factoryFinish,
      oilCondition
    };

    try {
      await saveCustomBallToLocalDb(confirmedBall);
      setIsFactDb(true);
    } catch (saveErr) {
      console.warn("신규 볼링공 로컬 DB 자동 저장 중 알림:", saveErr);
    }

    try {
      const result = await getLayoutRecommendations({ bowler, spec, ball: confirmedBall });
      const list = Array.isArray(result) ? result : (result?.layouts || []);
      if (list.length === 4) {
        setRecommendations(list);
      } else if (list.length > 0) {
        setRecommendations(list.slice(0, 4));
      } else {
        throw new Error('RECOMMENDATIONS_FORMAT_ERROR');
      }
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') { 
        setNeedsKey(true); 
      } else { 
        setErrorMsg(`레이아웃 추천 실패: ${err.message || '알 수 없는 오류'}`); 
      }
    } finally {
      setLoading(false);
    }
  }, [ballDisplayName, brandInput, rawMatchedBall, selectedWeight, coreType, rg, diff, intDiff, coverstockInput, factoryFinish, oilCondition, bowler, spec, loading]);

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
      <ModalShell isOpen={isOpen} onClose={onClose} title="AI 레이아웃 추천">
        <form onSubmit={(e) => { e.preventDefault(); if (apiKeyInput.trim()) { saveApiKeyForProvider(apiKeyInput); setNeedsKey(false); } }} className="space-y-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-center">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 mb-1">
              <Icon name="settings" size={20} />
            </span>
            <h3 className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base">Gemini API Key 등록</h3>
          </div>
          <div className="space-y-2 text-left px-1">
            <p className="text-[11px] text-slate-500 leading-normal">
              구글 제미나이 지공 추천 기능을 활성화하기 위해 Gemini API Key를 입력해 주세요.
              <br />
              API 키가 없으신 경우{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-black">
                Google AI Studio
              </a>
              에서 무료로 발급받으실 수 있습니다.
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
      </ModalShell>
    );
  }

  // ── STEP 1: 볼링공 정보 입력 (프리미엄 이음새 없는 통합 폼 카드 적용) ──
  if (step === 'BALL_INFO_INPUT') {
    return (
      <ModalShell isOpen={isOpen} onClose={onClose} title="볼링공 정보 입력">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 py-1">

          {/* 상단 통합 헤더 배지 바 (아래쪽 여백 2px 축소 미세조율 mb-0.5) */}
          <div className="flex items-center justify-between px-1 pt-1 mt-0.5 mb-0.5">
            {isFactDb && !isSpecsCleared ? (
              /* [DB 연동 상태 ➔ 🏷️ [ ✓ 로컬 DB ] 고정 규격 (min-w-[92px] h-7)] */
              <button
                type="button"
                onClick={handleToggleLocalDbBadge}
                className="min-w-[92px] h-7 px-2.5 py-1 rounded-full text-[11px] font-black flex items-center justify-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-200 transition-all cursor-pointer shadow-2xs group"
                title="클릭 시 연동을 해제하고 수치를 싹 지웁니다."
              >
                <Icon name="check" size={12} className="text-indigo-600 font-black shrink-0" />
                <span>로컬 DB</span>
              </button>
            ) : isSpecsCleared ? (
              /* [연동 해제 상태 ➔ 🏷️ [ ✕ 로컬 DB ] 동일한 고정 규격 (min-w-[92px] h-7)] */
              <button
                type="button"
                onClick={handleToggleLocalDbBadge}
                className="min-w-[92px] h-7 px-2.5 py-1 rounded-full text-[11px] font-black flex items-center justify-center gap-1.5 bg-slate-200 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 border border-slate-300 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs group"
                title="클릭 시 DB를 즉시 재연동하여 원래 수치를 100% 원상복구 대입합니다!"
              >
                <span className="font-black text-xs text-rose-600 shrink-0">✕</span>
                <span>로컬 DB</span>
              </button>
            ) : (
              /* [DB 미매칭 상태 ➔ 박스 없는 순수 텍스트 라벨 타이틀 형태] */
              <span className="text-[13px] font-black text-slate-700 flex items-center gap-1.5 py-1">
                <Icon name="edit" size={13} className="text-slate-500" />
                직접 입력
              </span>
            )}
          </div>

          {/* 🎯 프리미엄 이음새 없는 통합 폼 카드 (-mt-[1.5px] 상단 여백 축소 미세조율) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-2xs -mt-[1.5px]">
            
            {/* 1. 볼링공 이름 & 파운드 1열 배치 (제조사 텍스트 중앙 정렬) */}
            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-[13px] font-black text-slate-800">
                  볼링공 이름 & 파운드
                </label>
                {/* 제조사 (브랜드) 입력창 (중앙 정렬 text-center 적용) */}
                <input
                  type="text"
                  value={brandInput}
                  onChange={e => setBrandInput(e.target.value)}
                  placeholder="제조사 (예: SWAG)"
                  className={`w-36 px-2.5 py-1 rounded-lg text-[14px] font-bold text-center border outline-none transition-all ${getFieldInputStyle(brandInput, true)}`}
                />
              </div>

              {/* 볼링공 이름 입력창 + 파운드 선택 (숫자만 표시, lb 삭제) */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="text"
                  value={ballDisplayName}
                  onChange={async e => {
                    const nameVal = e.target.value;
                    setBallDisplayName(nameVal);
                    // 🚀 0초 즉시 타자 입력 매칭 (스페이스 추가 필요 없음!)
                    const cleanStr = nameVal.trim().toLowerCase().replace(/[\s\-_]/g, '');
                    if (cleanStr.length >= 1) {
                      const list = await searchSeriesBallsFromLocalDb(nameVal);
                      setSeriesSuggestions(list);
                    } else {
                      setSeriesSuggestions([]);
                    }
                  }}
                  placeholder="볼링공 이름 입력 (예: 크레이즈)"
                  className={`flex-1 px-3 py-2 rounded-xl text-[16px] font-bold border outline-none transition-all ${getFieldInputStyle(ballDisplayName, true)}`}
                />
                {/* 파운드 숫자 전용 선택 (lb 기호 삭제) */}
                <select
                  value={selectedWeight}
                  onChange={e => handleWeightChange(e.target.value)}
                  className="w-16 px-2 py-2 bg-white text-slate-800 font-bold text-[16px] text-center rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="13" className="bg-white text-slate-800 text-center">13</option>
                  <option value="14" className="bg-white text-slate-800 text-center">14</option>
                  <option value="15" className="bg-white text-slate-800 text-center">15</option>
                  <option value="16" className="bg-white text-slate-800 text-center">16</option>
                </select>
              </div>

              {/* 💡 시리즈 / 공통 이름 연관 검색 칩 드롭다운 목록 */}
              {seriesSuggestions.length > 0 && (
                <div className="p-2.5 bg-white border border-indigo-100 rounded-xl shadow-md space-y-1.5 z-30 relative animate-fadeIn">
                  <div className="text-[11px] font-black text-indigo-900 flex justify-between items-center">
                    <span>💡 연관 공 검색 결과 ({seriesSuggestions.length}건)</span>
                    <button type="button" onClick={() => setSeriesSuggestions([])} className="text-slate-400 hover:text-slate-600 font-bold">닫기 ✕</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-0.5">
                    {seriesSuggestions.map(ball => {
                      const ballTitle = ball.model_name_kr || ball.version_name;
                      const spec15 = ball.specs_by_weight?.['15lb'] || {};
                      return (
                        <button
                          key={ball.id}
                          type="button"
                          onClick={() => {
                            setBallDisplayName(ballTitle);
                            setBrandInput(ball.brand || 'Driller Custom');
                            setRawMatchedBall(ball);
                            setIsFactDb(true);
                            setIsSpecsCleared(false);
                            const autoCore = ball.core?.type || 'Symmetric';
                            const autoRg = spec15.rg !== undefined ? String(spec15.rg) : (ball.rg !== undefined ? String(ball.rg) : '');
                            const autoDiff = spec15.diff !== undefined ? String(spec15.diff) : (ball.diff !== undefined ? String(ball.diff) : '');
                            const autoIntDiff = spec15.int_diff !== undefined ? String(spec15.int_diff) : '';
                            
                            let rawCover = ball.coverstock?.name || ball.coverstock?.type || '';
                            let autoFinish = ball.coverstock?.factory_finish || '';
                            if (rawCover.includes('(')) {
                              const matchParen = rawCover.match(/\((.*?)\)/);
                              if (matchParen && matchParen[1] && !autoFinish) autoFinish = matchParen[1];
                              rawCover = rawCover.replace(/\(.*\)/g, '').trim();
                            }

                            setCoreType(autoCore);
                            setRg(autoRg);
                            setDiff(autoDiff);
                            setIntDiff(autoIntDiff);
                            setCoverstockInput(rawCover);
                            setFactoryFinish(autoFinish);

                            setSavedBackupSpecs({
                              brand: ball.brand || 'Driller Custom',
                              rg: autoRg,
                              diff: autoDiff,
                              intDiff: autoIntDiff,
                              coverstock: rawCover,
                              finish: autoFinish,
                              coreType: autoCore
                            });
                            setSeriesSuggestions([]);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 active:scale-95 text-indigo-900 hover:text-white rounded-lg text-[11px] font-black transition-all border border-indigo-100 flex items-center gap-1 cursor-pointer"
                        >
                          <span>🔹 {ballTitle}</span>
                          {spec15.rg && <span className="text-[9px] opacity-80">(RG: {spec15.rg})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 구분선 */}
            <div className="border-t border-slate-200/60 pt-3 space-y-3">
              
              {/* 2. 코어 제원 (대칭 / 비대칭 버튼 서체 13px 통일) */}
              <div className="space-y-2">
                <label className="block text-[13px] font-black text-slate-800">
                  코어 제원
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoreType('Symmetric')}
                    className={`py-2 px-3 rounded-xl text-[13px] font-black border transition-all flex items-center justify-center gap-1.5 ${coreType === 'Symmetric' ? 'bg-slate-700 text-white border-slate-700 shadow-2xs' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'}`}
                  >
                    대칭
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoreType('Asymmetric')}
                    className={`py-2 px-3 rounded-xl text-[13px] font-black border transition-all flex items-center justify-center gap-1.5 ${coreType === 'Asymmetric' ? 'bg-slate-700 text-white border-slate-700 shadow-2xs' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'}`}
                  >
                    비대칭
                  </button>
                </div>

                {/* 예시 숫자가 전면 삭제되고 순수 RG, Diff, Int Diff 명칭만 인풋 센터 표기 */}
                <div className={`grid ${coreType === 'Asymmetric' ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-1`}>
                  <input
                    type="number"
                    step="0.001"
                    value={rg ?? ''}
                    onChange={e => setRg(e.target.value)}
                    placeholder="RG"
                    className={`w-full px-3 py-2 rounded-xl text-[16px] font-bold text-slate-800 text-center border outline-none transition-all ${getFieldInputStyle(rg, true)}`}
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={diff ?? ''}
                    onChange={e => setDiff(e.target.value)}
                    placeholder="Diff"
                    className={`w-full px-3 py-2 rounded-xl text-[16px] font-bold text-slate-800 text-center border outline-none transition-all ${getFieldInputStyle(diff, true)}`}
                  />
                  {/* 비대칭 코어(Asymmetric)일 경우에만 Int Diff 내부 인풋 표시 */}
                  {coreType === 'Asymmetric' && (
                    <input
                      type="number"
                      step="0.001"
                      value={intDiff ?? ''}
                      onChange={e => setIntDiff(e.target.value)}
                      placeholder="Int Diff"
                      className={`w-full px-3 py-2 rounded-xl text-[16px] font-bold text-slate-800 text-center border outline-none transition-all ${getFieldInputStyle(intDiff, true, true)}`}
                    />
                  )}
                </div>
              </div>

            </div>

            {/* 구분선 */}
            <div className="border-t border-slate-200/60 pt-3 space-y-3">
              {/* 4. 커버스탁 & 팩토리 피니쉬 각각 1단씩 세로 배치 */}
              <div>
                <label className="block text-[13px] font-black text-slate-800 mb-1">커버스탁</label>
                <input
                  type="text"
                  value={coverstockInput}
                  onChange={e => setCoverstockInput(e.target.value)}
                  placeholder="예: Pearl / Solid / Hybrid"
                  className={`w-full px-3 py-2 rounded-xl text-[16px] font-bold border outline-none transition-all ${getFieldInputStyle(coverstockInput, true)}`}
                />
              </div>
              <div>
                <label className="block text-[13px] font-black text-slate-800 mb-1">팩토리 피니쉬</label>
                <input
                  type="text"
                  value={factoryFinish}
                  onChange={e => setFactoryFinish(e.target.value)}
                  placeholder="예: 1500 Polish / 2000 Abralon"
                  className={`w-full px-3 py-2 rounded-xl text-[16px] font-bold border outline-none transition-all ${getFieldInputStyle(factoryFinish, true)}`}
                />
              </div>
            </div>

          </div>

          {/* 하단 우측 정렬 컴팩트 버튼 영역 */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              className="px-4 py-2 text-xs font-bold"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              className="px-5 py-2 text-xs font-black shadow-2xs"
              onClick={() => {
                setHighlightEmpty(true);
                const isFormValid = Boolean(
                  ballDisplayName.trim() &&
                  rg.trim() &&
                  diff.trim() &&
                  (coreType !== 'Asymmetric' || intDiff.trim()) &&
                  coverstockInput.trim() &&
                  factoryFinish.trim()
                );
                if (!isFormValid) {
                  return; // 필수 수치 및 커버스탁/피니쉬 미입력 시 차단!
                }
                setStep('BALL_INFO_CONFIRM');
              }}
            >
              입력 정보 확인
            </Button>
          </div>

        </div>
      </ModalShell>
    );
  }

  // ── STEP 2: 볼링공 정보 확인 (원상복구 원형 상태) ──
  if (step === 'BALL_INFO_CONFIRM') {
    return (
      <ModalShell isOpen={isOpen} onClose={onClose} title="볼링공 정보 확인">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 py-1">

          {/* 수치만 노출하는 간결 카드 (16px 시원한 고대비 볼드 폰트 적용) */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="grid grid-cols-10 gap-2.5 text-[16px] text-center">
              
              {/* 1행 1단: 볼링공 이름 (80% 폭 ➔ col-span-8, 16px) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-8 flex items-center justify-center">
                <span className="font-black text-slate-900 text-[16px]">{ballDisplayName || '미입력'}</span>
              </div>

              {/* 1행 2단: 무게 숫자만 (20% 폭 ➔ col-span-2, 16px, lb 제거) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2 flex items-center justify-center">
                <span className="font-black text-slate-900 text-[16px]">{selectedWeight}</span>
              </div>

              {/* 2행 1단: 제조사 이름 (50% 폭 ➔ col-span-5, 16px font-black text-slate-900 통일) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-5 flex items-center justify-center">
                <span className="font-black text-slate-900 text-[16px]">{brandInput || rawMatchedBall?.brand || 'Driller Custom'}</span>
              </div>

              {/* 2행 2단: 코어 형태 (50% 폭 ➔ col-span-5, 16px) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-5 flex items-center justify-center">
                <span className="font-black text-slate-900 text-[16px]">{coreType === 'Symmetric' ? '대칭' : '비대칭'}</span>
              </div>

              {/* 3행: RG / Diff / Int Diff (col-span-10, 16px) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-10 flex items-center justify-center">
                <span className="font-mono font-black text-slate-900 text-[16px]">
                  {rg || '-'}{diff ? ` / ${diff}` : ''}{coreType === 'Asymmetric' && intDiff ? ` / ${intDiff}` : ''}
                </span>
              </div>

              {/* 4행: 커버스탁 (col-span-10, 16px) */}
              {coverstockInput && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-10 flex items-center justify-center">
                  <span className="font-black text-slate-900 text-[16px]">{coverstockInput}</span>
                </div>
              )}

              {/* 5행: 팩토리 피니쉬 (col-span-10, 16px) */}
              {factoryFinish && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-10 flex items-center justify-center">
                  <span className="font-black text-slate-900 text-[16px]">{factoryFinish}</span>
                </div>
              )}

            </div>
          </div>

          {/* 하단 우측 정렬 컴팩트 버튼 영역 */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              className="px-4 py-2 text-xs font-bold"
              onClick={() => setStep('BALL_INFO_INPUT')}
            >
              수정
            </Button>
            <Button
              type="button"
              variant="primary"
              className="px-5 py-2 text-xs font-black shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleGetLayouts}
            >
              레이아웃 추천
            </Button>
          </div>

        </div>
      </ModalShell>
    );
  }

  // ── STEP 3: 레이아웃 추천 결과 ──
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="AI 레이아웃 추천">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">

        {/* 헤더 정보 */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <span className="text-xs font-black text-slate-700">{ballDisplayName} ({selectedWeight})</span>
          <button
            type="button"
            onClick={() => setNeedsKey(true)}
            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <Icon name="settings" size={12} /> API 키
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-14 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="font-black text-slate-800 text-sm">AI 레이아웃 연산 중...</h3>
              <p className="text-xs text-slate-400 mt-1">확인된 볼 스펙과 볼러 특성을 조합하여 최적 지공법을 연산하고 있습니다.</p>
            </div>
          </div>
        )}

        {/* 에러 */}
        {errorMsg && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
            <p className="text-sm font-medium text-red-600">{errorMsg}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setNeedsKey(true)}>API 키 변경</Button>
              <Button variant="primary" size="sm" onClick={handleGetLayouts}>다시 추천받기</Button>
            </div>
          </div>
        )}

        {/* 레이아웃 카드리스트 (클릭 시 즉시 차트 대입 확정) */}
        {recommendations.length === 4 && !loading && (
          <div className="grid grid-cols-1 gap-3 pb-2">
            {recommendations.map((item, idx) => {
              const style = getConditionColor(item.condition);
              const hasConverted = convertedCache[idx];
              let rawVal = item.layout;
              let displayReasonText = item.description || item.intentSummary || '';

              if (hasConverted && hasConverted.activeVal === 'converted') {
                rawVal = hasConverted.converted;
                displayReasonText = hasConverted.reason || '';
              }

              const formattedVal = formatLayoutDisplay(rawVal);
              const reasonLines = formatReasonLines(displayReasonText);
              const isConverting = convertingIndex === idx;
              const isCurrent2LS = formattedVal.includes('(2LS)');

              return (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectRecommendation({
                      layout: formattedVal,
                      intentSummary: item.intentSummary || item.description,
                      condition: style.label
                    });
                    onClose();
                  }}
                  className={`p-4 border rounded-2xl transition-all cursor-pointer flex flex-col gap-2.5 select-none ${style.bg} hover:shadow-md hover:scale-[1.01] active:scale-[0.99]`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${style.badge}`}>
                      {style.label}
                    </span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleConvertLayout(idx, rawVal); }}
                      className="px-2 py-1 rounded border text-[9px] font-black bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      {isConverting ? '변환 중...' : isCurrent2LS ? 'Dual 변환' : '2LS 변환'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-slate-800 tracking-tight">{formattedVal}</span>
                  </div>

                  {/* 마침표 기준 1문장 1행(줄바꿈) 리스트 렌더링 (숫자 번호 없음) */}
                  <div className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-200/50 space-y-1">
                    {reasonLines.map((lineText, lineIdx) => (
                      <p key={lineIdx} className="break-all">
                        {lineText}
                      </p>
                    ))}
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
