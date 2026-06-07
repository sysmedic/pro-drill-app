import { useMemo, useEffect } from 'react';

const GlassBox = ({ title, rightElement, children, className = '' }) => (
  <div className={`bg-black/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div className="text-white/70 text-sm sm:text-base font-black uppercase tracking-widest shrink-0">{title}</div>
      {rightElement && <div className="shrink-0">{rightElement}</div>}
    </div>
    <div className="text-white font-bold leading-relaxed">{children}</div>
  </div>
);

const parseFraction = (str) => {
  if (!str) return 0;
  const cleanStr = String(str).split('(')[0].trim();
  const parts = cleanStr.split(' ');
  if (parts.length === 2 && parts[1].includes('/')) {
    const whole = parseFloat(parts[0]);
    const frac = parts[1].split('/');
    return whole + (parseFloat(frac[0]) / parseFloat(frac[1]));
  } else if (parts.length === 1) {
    if (parts[0].includes('/')) {
      const frac = parts[0].split('/');
      return parseFloat(frac[0]) / parseFloat(frac[1]);
    }
    return parseFloat(parts[0]);
  }
  return 0;
};

const toFraction64 = (num) => {
  if (num <= 0) return '';
  const totalNumerator = Math.round(num * 64);
  const whole = Math.floor(totalNumerator / 64);
  const numerator = totalNumerator % 64;

  if (numerator === 0) return String(whole);

  let n = numerator;
  let d = 64;
  while (n % 2 === 0 && d % 2 === 0) {
    n /= 2;
    d /= 2;
  }

  if (whole > 0) {
    return `${whole} ${n}/${d}`;
  }
  return `${n}/${d}`;
};

const PitchDisplay = ({ value, isNegative }) => {
  if (!value) return <span className="font-bold">-</span>;
  let num = parseFraction(value);
  if (num === 0) return <span className="font-bold">0.000</span>;
  if (isNegative) num = -num;
  const isRed = num < 0;
  return <span className={`font-bold ${isRed ? 'text-red-400' : ''}`}>{num.toFixed(3)}</span>;
};

const formatCalculatedValue = (num) => {
  if (isNaN(num)) return '-';
  if (Math.abs(num) < 0.0005) return <span className="font-bold">0.000</span>;
  const isRed = num < 0;
  return <span className={`font-bold ${isRed ? 'text-red-400' : ''}`}>{num.toFixed(3)}</span>;
};

export default function DrillingGuideView({ data = {}, customer = {}, onClose, onGuideStateChange }) {
  const isLeft = data?.handedness === 'left';
  const midPitch = data?.midPitch || {};
  const ringPitch = data?.ringPitch || {};
  const thumbPitch = data?.thumbPitch || {};
  const thumbDetails = data?.thumbDetails || {};

  const drillingGuide = data?.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false };
  const ovalCorrection = drillingGuide.ovalCorrection || '0';
  const isDetailedMode = drillingGuide.isDetailedMode || false;

  // 차트인풋폼의 "오발 컷"(thumbDetails.ovalCut) 수치를 최우선 기본값으로 동기화
  const ovalCut = thumbDetails.ovalCut || drillingGuide.ovalCut || '';

  // 오발 컷 변경 시 부모 컴포넌트의 drillingGuide와 thumbDetails 양쪽에 실시간 역반영
  const setOvalCut = (val) => {
    if (onGuideStateChange) {
      onGuideStateChange(
        { ...drillingGuide, ovalCut: val },
        { ...thumbDetails, ovalCut: val }
      );
    }
  };
  
  const setOvalCorrection = (val) => onGuideStateChange && onGuideStateChange({ ...drillingGuide, ovalCorrection: val }, thumbDetails);
  const setIsDetailedMode = (val) => onGuideStateChange && onGuideStateChange({ ...drillingGuide, isDetailedMode: val }, thumbDetails);

  const firstPitch = isLeft ? ringPitch : midPitch;
  const secondPitch = isLeft ? midPitch : ringPitch;
  const firstLabel = isLeft ? "약지" : "중지";
  const secondLabel = isLeft ? "중지" : "약지";
  const firstTitle = isLeft ? "약지 (Ring)" : "중지 (Middle)";
  const secondTitle = isLeft ? "중지 (Middle)" : "약지 (Ring)";

  const baseHoleSizeNum = parseFraction(thumbDetails?.holeSize);

  const ovalCutOptions = useMemo(() => {
    if (!baseHoleSizeNum) return [];
    const options = [];
    for (let i = 0; i <= 10; i++) {
      const val = baseHoleSizeNum - (i / 64);
      if (val > 0) options.push(toFraction64(val));
    }
    return options;
  }, [baseHoleSizeNum]);

  useEffect(() => {
    if (ovalCutOptions.length > 0 && !ovalCutOptions.includes(ovalCut)) {
      setOvalCut(ovalCutOptions[0]);
    } else if (ovalCutOptions.length === 0 && ovalCut) {
      setOvalCut('');
    }
  }, [ovalCutOptions, ovalCut]);

  const ovalCutNum = parseFraction(ovalCut);
  const oval = parseFraction(thumbDetails?.ovalSize);
  const correction = parseFraction(ovalCorrection);
  const angle = parseFloat(data?.ovalAngle) || 0;
  const radians = angle * Math.PI / 180;
  const thumbVertical = (thumbPitch?.down ? parseFraction(thumbPitch.down) : 0) - (thumbPitch?.up ? parseFraction(thumbPitch.up) : 0);
  const thumbHorizontal = (thumbPitch?.left ? parseFraction(thumbPitch.left) : 0) - (thumbPitch?.right ? parseFraction(thumbPitch.right) : 0);
  const handMultiplier = isLeft ? -1 : 1;

  const getDrillBitValue = (rowIndex) => {
    if (rowIndex === 0) return '드릴 비트';
    if (!baseHoleSizeNum || !ovalCutNum) return '-';
    if (rowIndex === 1 || rowIndex === 2) return toFraction64(ovalCutNum);
    if (rowIndex === 3 || rowIndex === 4) return toFraction64((ovalCutNum + baseHoleSizeNum) / 2);
    if (rowIndex === 5) return toFraction64(baseHoleSizeNum);
    return '-';
  };

  const getHorizontalValue = (rowIndex) => {
    if (rowIndex === 0) return '수평';
    if (rowIndex === 1) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      return formatCalculatedValue(thumbHorizontal - ((((oval - ovalCutNum) / 2) + correction) * Math.cos(radians) * handMultiplier));
    }
    if (rowIndex === 2) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      return formatCalculatedValue(thumbHorizontal + ((((oval - ovalCutNum) / 2) + correction) * Math.cos(radians) * handMultiplier));
    }
    if (rowIndex === 3) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      const calcValue = ((((oval - ovalCutNum) / 2) + correction) * Math.cos(radians) * handMultiplier);
      return formatCalculatedValue(thumbHorizontal + (calcValue / 2));
    }
    if (rowIndex === 4) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      const calcValue = ((((oval - ovalCutNum) / 2) + correction) * Math.cos(radians) * handMultiplier);
      const firstHorizontal = thumbHorizontal - calcValue;
      return formatCalculatedValue(firstHorizontal + (calcValue / 2));
    }
    if (rowIndex === 5) {
      if (thumbPitch?.left || thumbPitch?.right) {
        return <PitchDisplay value={thumbPitch.left || thumbPitch.right} isNegative={!!thumbPitch.right} />;
      }
    }
    return '-';
  };

  const getVerticalValue = (rowIndex) => {
    if (rowIndex === 0) return '수직';
    if (rowIndex === 1) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      return formatCalculatedValue(thumbVertical + (((oval - ovalCutNum) / 2) + correction) * Math.sin(radians));
    }
    if (rowIndex === 2) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      return formatCalculatedValue(thumbVertical - (((oval - ovalCutNum) / 2) + correction) * Math.sin(radians));
    }
    if (rowIndex === 3) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      const calcValue = (((oval - ovalCutNum) / 2) + correction) * Math.sin(radians);
      return formatCalculatedValue(thumbVertical - (calcValue / 2));
    }
    if (rowIndex === 4) {
      if (!thumbDetails?.ovalSize || !ovalCut) return '-';
      const calcValue = (((oval - ovalCutNum) / 2) + correction) * Math.sin(radians);
      const firstVertical = thumbVertical + calcValue;
      return formatCalculatedValue(firstVertical - (calcValue / 2));
    }
    if (rowIndex === 5) {
      if (thumbPitch?.up || thumbPitch?.down) {
        return <PitchDisplay value={thumbPitch.up || thumbPitch.down} isNegative={!!thumbPitch.up} />;
      }
    }
    return '-';
  };

  return (
    /* 🟢 [교정]: z-[9999] 독점 레이어를 지공 서열에 알맞은 z-[45]로 현실화하여 포탈 기반 ConfirmModal의 정상 상단 노출 확보 */
    <div className="fixed inset-0 z-[45] bg-slate-900 overflow-y-auto overflow-x-hidden touch-auto animate-fade-in flex flex-col items-center">
      {/* Top Bar */}
      <div className="sticky top-0 w-full flex justify-between items-center p-3 px-4 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          드릴링 가이드 <span className="text-white/50 font-medium mx-1">-</span> {customer?.name}
        </h2>
        <button 
          type="button" 
          onClick={onClose} 
          className="text-white/70 hover:text-white p-2 text-xl font-bold transition-colors outline-none cursor-pointer"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* Content Area */}
      <div className="relative w-full max-w-[540px] flex-1 mt-2 p-4 sm:p-6 pb-20">
        {/* Background Circles (도면 실루엣) */}
        <div className="absolute inset-0 flex justify-center opacity-20 pointer-events-none select-none mt-16" style={{ transform: isLeft ? 'scaleX(-1)' : 'none' }}>
          <div className="relative w-[340px] h-[500px]">
            {/* Mid Hole */}
            <div className="absolute left-[30px] top-[0px] w-[120px] h-[120px] rounded-full border-[6px] border-white"></div>
            {/* Ring Hole */}
            <div className="absolute left-[190px] top-[0px] w-[120px] h-[120px] rounded-full border-[6px] border-white"></div>
            {/* Thumb Hole */}
            {!data?.isThumbless && (
              <div className="absolute left-[110px] top-[280px] w-[130px] h-[130px] rounded-full border-[6px] border-white"></div>
            )}
          </div>
        </div>

        {/* Info Boxes (Glassmorphism) */}
        <div className="relative z-10 w-full flex flex-col gap-5 sm:gap-6">
          
          {/* Fingers Row */}
          <div className="flex justify-between gap-4 sm:gap-6">
            <GlassBox title={firstTitle} className="flex-1">
              <div className="p-2 bg-white/5 rounded-lg text-sm sm:text-base">
                <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                  <span className="text-white/50">홀컷</span>
                  <span className="font-bold text-indigo-300">{firstPitch?.holeCutSize || '-'}</span>
                </div>
                <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                  <span className="text-white/50">수평</span>
                  {firstPitch?.lat ? <PitchDisplay value={firstPitch.lat} isNegative={firstPitch.latDir === 'left'} /> : <span className="font-bold">-</span>}
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">수직</span>
                  {firstPitch?.up || firstPitch?.down ? <PitchDisplay value={firstPitch.up || firstPitch.down} isNegative={!!firstPitch.down} /> : <span className="font-bold">-</span>}
                </div>
              </div>
            </GlassBox>

            <GlassBox title={secondTitle} className="flex-1">
              <div className="p-2 bg-white/5 rounded-lg text-sm sm:text-base">
                <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                  <span className="text-white/50">홀컷</span>
                  <span className="font-bold text-indigo-300">{secondPitch?.holeCutSize || '-'}</span>
                </div>
                <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                  <span className="text-white/50">수평</span>
                  {secondPitch?.lat ? <PitchDisplay value={secondPitch.lat} isNegative={secondPitch.latDir === 'left'} /> : <span className="font-bold">-</span>}
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">수직</span>
                  {secondPitch?.up || secondPitch?.down ? <PitchDisplay value={secondPitch.up || secondPitch.down} isNegative={!!secondPitch.down} /> : <span className="font-bold">-</span>}
                </div>
              </div>
            </GlassBox>
          </div>

          {/* Thumb Row */}
          {!data?.isThumbless && (
            <GlassBox title="엄지 (Thumb)" className="w-full">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 p-2 bg-white/5 rounded-lg text-sm sm:text-base">
                  <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                    <span className="text-white/50">홀컷</span>
                    <span className="font-bold text-indigo-300">{thumbDetails?.holeCutSize || '-'}</span>
                  </div>
                  <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                    <span className="text-white/50">수평</span>
                    {thumbPitch?.left || thumbPitch?.right ? <PitchDisplay value={thumbPitch.left || thumbPitch.right} isNegative={!!thumbPitch.right} /> : <span className="font-bold">-</span>}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">수직</span>
                    {thumbPitch?.up || thumbPitch?.down ? <PitchDisplay value={thumbPitch.up || thumbPitch.down} isNegative={!!thumbPitch.up} /> : <span className="font-bold">-</span>}
                  </div>
                </div>
                
                <div className="flex-1 p-2 bg-white/5 rounded-lg text-sm sm:text-base">
                  <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                    <span className="text-white/50">원홀</span>
                    <span className="font-bold text-indigo-300">{thumbDetails?.holeSize || '-'}</span>
                  </div>
                  <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                    <span className="text-white/50">오발</span>
                    <span className="font-bold text-yellow-200">{thumbDetails?.ovalSize || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">각도</span>
                    <span className="font-bold text-yellow-200">{data?.ovalAngle || '0'}°</span>
                  </div>
                </div>
              </div>
            </GlassBox>
          )}

          {/* Oval Calculator Row */}
          {!data?.isThumbless && (
            <GlassBox 
              title={
                <div className="flex items-center gap-3">
                  <span>계산기</span>
                  <label className="flex items-center gap-1.5 cursor-pointer normal-case tracking-normal">
                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-colors ${isDetailedMode ? 'bg-indigo-500 border-indigo-500' : 'border-white/50'}`}>
                      {isDetailedMode && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>}
                    </div>
                    <input type="checkbox" className="hidden" checked={isDetailedMode} onChange={() => setIsDetailedMode(!isDetailedMode)} />
                    <span className={`text-[10px] sm:text-xs font-bold ${isDetailedMode ? 'text-indigo-300' : 'text-white/50'}`}>정밀</span>
                  </label>
                </div>
              }
              className="w-full"
              rightElement={
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-white/70 text-xs sm:text-sm font-black tracking-widest">오발 컷</span>
                    <select
                      value={ovalCut}
                      onChange={(e) => setOvalCut(e.target.value)}
                      className="w-[72px] sm:w-20 bg-white/10 border border-white/20 rounded px-1 sm:px-2 py-1 text-white text-xs sm:text-sm outline-none focus:border-indigo-400 focus:bg-white/20 transition-colors text-center cursor-pointer appearance-none"
                      style={{ textAlignLast: 'center' }}
                    >
                      {ovalCutOptions.length > 0 ? (
                        ovalCutOptions.map(opt => <option key={opt} value={opt} className="text-slate-800">{opt}</option>)
                      ) : (
                        <option value="" disabled className="text-slate-800">미지정</option>
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-white/70 text-xs sm:text-sm font-black tracking-widest">보정</span>
                    <select
                      value={ovalCorrection}
                      onChange={(e) => setOvalCorrection(e.target.value)}
                      className="w-[72px] sm:w-20 bg-white/10 border border-white/20 rounded px-1 sm:px-2 py-1 text-white text-xs sm:text-sm outline-none focus:border-indigo-400 focus:bg-white/20 transition-colors text-center cursor-pointer appearance-none"
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value="0" className="text-slate-800">&nbsp;</option>
                      <option value="1/128" className="text-slate-800">1/128</option>
                      <option value="1/64" className="text-slate-800">1/64</option>
                      <option value="3/128" className="text-slate-800">3/128</option>
                      <option value="1/32" className="text-slate-800">1/32</option>
                    </select>
                  </div>
                </div>
              }
            >
              <div className="flex flex-col border border-white/20 rounded-lg overflow-hidden bg-white/5">
                {Array.from({ length: 6 }).map((_, rowIndex) => {
                  if (!isDetailedMode && (rowIndex === 3 || rowIndex === 4)) return null;
                  return (
                    <div key={rowIndex} className={`grid grid-cols-3 text-sm sm:text-base font-bold text-white/90 ${rowIndex !== 5 ? 'border-b border-white/10' : ''}`}>
                      <div className={`py-2 px-2 text-center border-r border-white/10 flex items-center justify-center min-h-[40px] ${rowIndex === 0 ? 'bg-white/10 text-white/70 text-xs sm:text-sm tracking-wider' : ''}`}>
                        {getDrillBitValue(rowIndex)}
                      </div>
                      <div className={`py-2 px-2 text-center border-r border-white/10 flex items-center justify-center min-h-[40px] ${rowIndex === 0 ? 'bg-white/10 text-white/70 text-xs sm:text-sm tracking-wider' : ''}`}>
                        {getHorizontalValue(rowIndex)}
                      </div>
                      <div className={`py-2 px-2 text-center flex items-center justify-center min-h-[40px] ${rowIndex === 0 ? 'bg-white/10 text-white/70 text-xs sm:text-sm tracking-wider' : ''}`}>
                        {getVerticalValue(rowIndex)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassBox>
          )}

          {/* Bevel Row */}
          {!data?.isThumbless && (thumbDetails?.bevel1 || thumbDetails?.bevel2 || thumbDetails?.bevel3) && (
            <GlassBox title="Bevel" className="w-full">
              {(() => {
                const bevels = [
                  { label: '1st', value: thumbDetails?.bevel1 },
                  { label: '2nd', value: thumbDetails?.bevel2 },
                  { label: '3rd', value: thumbDetails?.bevel3 }
                ].filter(b => b.value);

                if (bevels.length === 1) {
                  return (
                    <div className="flex items-center justify-center p-2 bg-white/5 rounded-lg text-sm sm:text-base text-center">
                      <div className="font-bold text-white">{bevels[0].value.replace(/\|/g, ' : ')}</div>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col sm:flex-row p-2 bg-white/5 rounded-lg text-sm sm:text-base text-center">
                    {bevels.map((b, idx) => (
                      <div key={b.label} className={`flex-1 flex flex-col items-center justify-center py-1.5 sm:py-0 ${idx !== 0 ? 'border-t sm:border-t-0 sm:border-l border-white/10 mt-1.5 pt-1.5 sm:mt-0 sm:pt-0' : ''}`}>
                        <div className="text-[10px] sm:text-xs text-white/50 mb-0.5">{b.label}</div>
                        <div className="font-bold text-white">{b.value.replace(/\|/g, ' : ')}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </GlassBox>
          )}

        </div>
      </div>
    </div>
  );
}