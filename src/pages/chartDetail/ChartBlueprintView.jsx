import { useEffect, useState } from 'react';
import PageShell from '../../components/layout/PageShell.jsx';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { commonBoxClass, getEdgePoint } from './chartOptions.js';

const { PAGE_MAX_WIDTH_PX, PAGE_PADDING_X_PX } = PageShell.tokens;

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

const getDefaultHoleCutSize = (insertSize) => {
  if (!insertSize) return '31/32';
  const num = parseFraction(insertSize);
  if (num >= 27 / 32) return '1 1/32';
  return '31/32';
};

const getDefaultThumbHoleCutSize = (slugType, gender) => {
  const type = String(slugType || '').trim().toUpperCase();
  if (type.includes('IT')) return '1 3/8';
  if (type.includes('스위치') || type.includes('조포')) return '1 1/2';
  if (gender === '여') return '1 1/8';
  return '1 1/4';
};

const renderInsertSize = (size) => {
  if (!size) return '';
  const str = String(size);
  const match = str.match(/(.*?)(\(.*?\))(.*)/);
  if (match) {
    return (
      <>
        {match[1]}
        <span className="text-black/65 text-[19px] font-normal">{match[2]}</span>
        {match[3]}
      </>
    );
  }
  return str;
};

const Abs = ({ x, y, children, z = 10 }) => (
  <div className="absolute flex items-center justify-center" style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: z }}>{children}</div>
);

const SingleValueBox = ({ value, title, iconName, labelPosition = 'top' }) => {
  return (
    <div className="relative w-[80px] h-[36px] flex justify-center">
      {value && value !== '0' && labelPosition === 'top' && (
        <div className="absolute left-0 bottom-[100%] w-full flex flex-col items-center mb-1 whitespace-nowrap">
          {iconName && <Icon name="iconName" className="text-black mb-0.5" size={14} strokeWidth={3} />}
          <span className="text-[12px] font-bold text-black leading-tight">{title}</span>
        </div>
      )}
      {value && value !== '0' && labelPosition === 'bottom' && (
        <div className="absolute left-0 top-[100%] w-full flex flex-col items-center mt-1 whitespace-nowrap">
          <span className="text-[12px] font-bold text-black leading-tight">{title}</span>
          {iconName && <Icon name={iconName} className="text-black mt-0.5" size={14} strokeWidth={3} />}
        </div>
      )}
      {value && value !== '0' && labelPosition === 'left' && (
        <div className="absolute right-[100%] top-0 h-full flex items-center mr-1.5 whitespace-nowrap">
          {iconName && <Icon name={iconName} className="text-black mr-0.5" size={14} strokeWidth={3} />}
          <span className="text-[12px] font-bold text-black">{title}</span>
        </div>
      )}
      {value && value !== '0' && labelPosition === 'right' && (
        <div className="absolute left-[100%] top-0 h-full flex items-center ml-1.5 whitespace-nowrap">
          <span className="text-[12px] font-bold text-black mr-0.5">{title}</span>
          {iconName && <Icon name={iconName} className="text-black" size={14} strokeWidth={3} />}
        </div>
      )}
      <div className={`w-full h-full ${commonBoxClass}`}>{value || ''}</div>
    </div>
  );
};

export default function ChartBlueprintView({ data = {}, customer = {}, memoOverlay, memosRenderer, innerRef, isMemoActive, onGuideClick }) {
  const isThumbless = data?.isThumbless || false;
  const isLeft = data?.handedness === 'left';
  const midPitch = data?.midPitch || {};
  const ringPitch = data?.ringPitch || {};
  const thumbPitch = data?.thumbPitch || {};
  const thumbOffset = data?.thumbOffset || {};
  const thumbDetails = data?.thumbDetails || {};

  const firstPitch = isLeft ? ringPitch : midPitch;
  const secondPitch = isLeft ? midPitch : ringPitch;
  const firstLabel = isLeft ? "약지" : "중지";
  const secondLabel = isLeft ? "중지" : "약지";

  const getExactScale = () => {
    if (typeof window === 'undefined') return 1;
    const cw = document.documentElement.clientWidth;
    const isSm = cw >= 640;
    const parentPadding = isSm ? PAGE_PADDING_X_PX.sm : PAGE_PADDING_X_PX.base;
    const containerW = Math.min(cw, PAGE_MAX_WIDTH_PX) - parentPadding;
    const wrapperW = Math.min(containerW, PAGE_MAX_WIDTH_PX);
    const innerW = wrapperW - 2; 
    return innerW / 540;
  };

  const [scale, setScale] = useState(getExactScale);

  useEffect(() => {
    const handleResize = () => setScale(getExactScale());

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layout = { mid: { x: 170, y: 148, r: 70 }, ring: { x: 370, y: 148, r: 70 }, thumb: { x: 270, y: 470, r: 70 } };
  const midEdge = getEdgePoint(layout.mid, layout.thumb, layout.mid.r);
  const thumbEdgeM = getEdgePoint(layout.thumb, layout.mid, layout.thumb.r);
  const ringEdge = getEdgePoint(layout.ring, layout.thumb, layout.ring.r);
  const thumbEdgeR = getEdgePoint(layout.thumb, layout.ring, layout.thumb.r);

  const spanLeftPos = { x: (midEdge.x + thumbEdgeM.x) / 2, y: (midEdge.y + thumbEdgeM.y) / 2 };
  const spanRightPos = { x: (ringEdge.x + thumbEdgeR.x) / 2, y: (ringEdge.y + thumbEdgeR.y) / 2 };
  const activeCanvasHeight = isThumbless ? 320 : 640;

  let thumblessDiffDisplay = '';
  let thumblessDiffColor = 'text-black';
  let showThumblessDiff = false;

  if (isThumbless && data?.spanLeft && data?.spanRight) {
    const leftF = parseFraction(data.spanLeft);   
    const rightF = parseFraction(data.spanRight); 
    
    if (leftF > 0 && rightF > 0) {
      const baseF = isLeft ? rightF : leftF;
      const compareF = isLeft ? leftF : rightF;

      const diffF = baseF - compareF;
      const diff32 = Math.round(Math.abs(diffF) * 32);
      
      if (diff32 > 0) {
        showThumblessDiff = true;
        let n = diff32;
        let d = 32;
        const whole = Math.floor(n / d);
        n = n % d;
        
        while (n > 0 && n % 2 === 0 && d % 2 === 0) {
          n /= 2;
          d /= 2;
        }
        
        let fracStr = '';
        if (whole > 0) {
          fracStr += whole;
          if (n > 0) fracStr += ` ${n}/${d}`;
        } else if (n > 0) {
          fracStr += `${n}/${d}`;
        }
        
        if (baseF > compareF) {
          thumblessDiffDisplay = `+${fracStr}`;
          thumblessDiffColor = 'text-black';
        } else {
          thumblessDiffDisplay = `-${fracStr}`;
          thumblessDiffColor = 'text-red-500';
        }
      }
    }
  }

  const hasOvalData = !!thumbDetails?.ovalSize || !!data?.ovalAngle;

  return (
    <Card className="overflow-hidden transition-[height] duration-500 animate-fade-in mt-2 mb-4 sm:mb-6" constrained data-testid="chart-blueprint-surface" elevation="md" gpu layer="content" style={{ height: `${activeCanvasHeight * scale}px` }}>
      <div
        ref={innerRef}
        className={`relative shrink-0 select-none ${isMemoActive ? 'touch-none' : 'touch-auto'} transform-gpu`}
        data-testid="chart-blueprint-canvas"
        style={{ width: '540px', height: `${activeCanvasHeight}px`, transform: `scale(${scale}) translateZ(0)`, transformOrigin: 'top left', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
      >
        {memoOverlay}
        {memosRenderer}

        <div className="absolute inset-0 z-0 rounded-xl bg-white overflow-hidden" style={{ filter: isLeft ? 'invert(80%)' : 'none' }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {!isThumbless && (
            <>
              <line x1={midEdge.x} y1={midEdge.y} x2={thumbEdgeM.x} y2={thumbEdgeM.y} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,6" />
              <line x1={ringEdge.x} y1={ringEdge.y} x2={thumbEdgeR.x} y2={thumbEdgeR.y} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,6" />
            </>
          )}
        </svg>

        {/* ========================================================= */}
        {/* 첫 번째 손가락 (우투: 중지 / 좌투: 약지) */}
        {/* ========================================================= */}
        <Abs x={layout.mid.x + 1} y={57}>
          <span className="text-[17px] font-bold text-black">{firstLabel}</span>
        </Abs>

        {firstPitch?.up !== undefined && firstPitch.up !== null && firstPitch.up !== '' && (
          <Abs x={layout.mid.x - 60} y={57}>
            <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
              <span className="font-bold z-10 text-black">{firstPitch.up}</span>
              {String(firstPitch.up).trim() !== '0' && <div className="absolute -right-0"><Icon name="arrowUp" className="text-black" size={14} strokeWidth={3} /></div>}
            </div>
          </Abs>
        )}
        
        {firstPitch?.lat !== undefined && firstPitch.lat !== null && firstPitch.lat !== '' && (
          <Abs x={54} y={layout.mid.y}>
             <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
                {String(firstPitch.lat).trim() !== '0' && firstPitch.latDir === 'left' && <div className="absolute left-[3px]"><Icon name="arrowLeft" className="text-black" size={14} strokeWidth={3} /></div>}
                <span className={`font-bold z-10 ${firstPitch.latDir === 'right' ? 'text-red-500' : 'text-black'}`}>{firstPitch.lat}</span>
                {String(firstPitch.lat).trim() !== '0' && firstPitch.latDir === 'right' && <div className="absolute right-[3px]"><Icon name="arrowRight" className="text-red-500" size={14} strokeWidth={3} /></div>}
              </div>
          </Abs>
        )}

        {firstPitch?.down !== undefined && firstPitch.down !== null && firstPitch.down !== '' && (
          <Abs x={layout.mid.x - 60} y={238}>
            <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
              <span className="font-bold z-10 text-red-500">{firstPitch.down}</span>
              {String(firstPitch.down).trim() !== '0' && <div className="absolute -right-0"><Icon name="arrowDown" className="text-red-500" size={14} strokeWidth={3} /></div>}
            </div>
          </Abs>
        )}

        <Abs x={layout.mid.x} y={layout.mid.y}>
          <div className="w-[140px] h-[140px] rounded-full border-[2px] border-black bg-white relative">
            <div className="absolute top-[1px] left-1/2 transform -translate-x-1/2 w-full text-center text-[14px] font-medium text-black whitespace-nowrap">
              {firstPitch?.holeCutSize || getDefaultHoleCutSize(firstPitch?.insertSize)}
            </div>
            <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[15px] font-medium text-slate-600 whitespace-nowrap z-10">
              {firstPitch?.extraLine || ''}
            </div>
            <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[19px] leading-none tracking-tight font-semibold text-black whitespace-nowrap z-10">
              {renderInsertSize(firstPitch?.insertSize)}
            </div>
            <div className="absolute top-[75%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[17px] font-semibold text-black whitespace-nowrap z-10">
              {firstPitch?.tipType || ''}
            </div>
          </div>
        </Abs>


        {/* ========================================================= */}
        {/* 두 번째 손가락 (우투: 약지 / 좌투: 중지) */}
        {/* ========================================================= */}
        <Abs x={layout.ring.x - 1} y={57}>
          <span className="text-[17px] font-bold text-black">{secondLabel}</span>
        </Abs>

        {secondPitch?.up !== undefined && secondPitch.up !== null && secondPitch.up !== '' && (
          <Abs x={layout.ring.x + 60} y={57}>
            <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
              <span className="font-bold z-10 text-black">{secondPitch.up}</span>
              {String(secondPitch.up).trim() !== '0' && <div className="absolute -left-0"><Icon name="arrowUp" className="text-black" size={14} strokeWidth={3} /></div>}
            </div>
          </Abs>
        )}
        
        {secondPitch?.lat !== undefined && secondPitch.lat !== null && secondPitch.lat !== '' && (
          <Abs x={486} y={layout.ring.y}>
             <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
                {String(secondPitch.lat).trim() !== '0' && secondPitch.latDir === 'left' && <div className="absolute left-[3px]"><Icon name="arrowLeft" className="text-red-500" size={14} strokeWidth={3} /></div>}
                <span className={`font-bold z-10 ${secondPitch.latDir === 'left' ? 'text-red-500' : 'text-black'}`}>{secondPitch.lat}</span>
                {String(secondPitch.lat).trim() !== '0' && secondPitch.latDir === 'right' && <div className="absolute right-[3px]"><Icon name="arrowRight" className="text-black" size={14} strokeWidth={3} /></div>}
              </div>
          </Abs>
        )}

        {secondPitch?.down !== undefined && secondPitch.down !== null && secondPitch.down !== '' && (
          <Abs x={layout.ring.x + 60} y={238}>
            <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
              <span className="font-bold z-10 text-red-500">{secondPitch.down}</span>
              {String(secondPitch.down).trim() !== '0' && <div className="absolute -left-0"><Icon name="arrowDown" className="text-red-500" size={14} strokeWidth={3} /></div>}
            </div>
          </Abs>
        )}
        
        <Abs x={layout.ring.x} y={layout.ring.y}>
          <div className="w-[140px] h-[140px] rounded-full border-[2px] border-black bg-white relative">
            <div className="absolute top-[1px] left-1/2 transform -translate-x-1/2 w-full text-center text-[14px] font-medium text-black whitespace-nowrap">
              {secondPitch?.holeCutSize || getDefaultHoleCutSize(secondPitch?.insertSize)}
            </div>
            <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[15px] font-medium text-slate-600 whitespace-nowrap z-10">
              {secondPitch?.extraLine || ''}
            </div>
            <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[19px] leading-none tracking-tight font-semibold text-black whitespace-nowrap z-10">
              {renderInsertSize(secondPitch?.insertSize)}
            </div>
            <div className="absolute top-[75%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[17px] font-semibold text-black whitespace-nowrap z-10">
              {secondPitch?.tipType || ''}
            </div>
          </div>
        </Abs>

        <Abs x={(layout.mid.x + layout.ring.x) / 2} y={layout.mid.y} z={20}>
          <div className="text-[15px] font-bold text-black drop-shadow-md">{data?.bridge || ''}</div>
        </Abs>

        {!isThumbless && (
          <>
            <Abs x={270} y={spanLeftPos.y - 50} z={20}>
              <div className="bg-white px-4 rounded-md text-[16px] font-bold text-black flex items-center gap-1.5">
                {data?.spanType || ''}
                <Icon name="check" className="text-black" size={15} strokeWidth={3} />
              </div>
            </Abs>
            {/* 🟢 [버그 수정 완료] 기존 </Nav> 오타를 리액트 JSX 규격에 맞는 정밀 </Abs> 태그로 전면 교정 완료 */}
            <Abs x={spanLeftPos.x} y={spanLeftPos.y} z={20}><div className={`w-[85px] h-[36px] ${commonBoxClass}`}>{isLeft ? data?.spanRight : data?.spanLeft || ''}</div></Abs>
            <Abs x={spanRightPos.x} y={spanRightPos.y} z={20}><div className={`w-[85px] h-[36px] ${commonBoxClass}`}>{isLeft ? data?.spanLeft : data?.spanRight || ''}</div></Abs>
            
            {/* 엄지 구역 */}
            {thumbPitch?.up !== undefined && thumbPitch.up !== null && thumbPitch.up !== '' && (
              <Abs x={layout.thumb.x} y={375}>
                  <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
                    <span className="font-bold z-10 text-red-500">{thumbPitch.up}</span>
                    {String(thumbPitch.up).trim() !== '0' && <div className="absolute -right-0"><Icon name="arrowUp" className="text-red-500" size={14} strokeWidth={3} /></div>}
                  </div>
              </Abs>
            )}

            {thumbPitch?.down !== undefined && thumbPitch.down !== null && thumbPitch.down !== '' && (
              <Abs x={layout.thumb.x} y={566}>
                  <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
                    <span className="font-bold z-10 text-black">{thumbPitch.down}</span>
                    {String(thumbPitch.down).trim() !== '0' && <div className="absolute -right-0"><Icon name="arrowDown" className="text-black" size={14} strokeWidth={3} /></div>}
                  </div>
              </Abs>
            )}

            {thumbPitch?.left !== undefined && thumbPitch.left !== null && thumbPitch.left !== '' && (
              <Abs x={152} y={layout.thumb.y}>
                  <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
                    {String(thumbPitch.left).trim() !== '0' && <div className="absolute left-[3px]"><Icon name="arrowLeft" className="text-black" size={14} strokeWidth={3} /></div>}
                    <span className="font-bold z-10 text-black">{thumbPitch.left}</span>
                  </div>
              </Abs>
            )}

            {thumbPitch?.right !== undefined && thumbPitch.right !== null && thumbPitch.right !== '' && (
              <Abs x={388} y={layout.thumb.y}>
                  <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
                    <span className="font-bold z-10 text-black">{thumbPitch.right}</span>
                    {String(thumbPitch.right).trim() !== '0' && <div className="absolute right-[3px]"><Icon name="arrowRight" className="text-black" size={14} strokeWidth={3} /></div>}
                  </div>
              </Abs>
            )}

            {thumbDetails?.slugType && (
              <Abs x={(thumbPitch?.right !== undefined && thumbPitch.right !== null && String(thumbPitch.right).trim() !== '') ? 152 : 388} y={layout.thumb.y}>
                <div className={`relative w-[80px] h-[36px] flex items-center justify-center ${commonBoxClass}`}>
                  <span className="font-bold z-10 text-indigo-800">{thumbDetails.slugType}</span>
                </div>
              </Abs>
            )}

            <Abs x={layout.thumb.x} y={layout.thumb.y}>
              <div className="w-[140px] h-[140px] rounded-full border-[2px] border-black bg-white relative">
                <div className="absolute top-[1px] left-1/2 transform -translate-x-1/2 w-full text-center text-[14px] font-medium text-black whitespace-nowrap">
                  {thumbDetails?.holeCutSize || getDefaultThumbHoleCutSize(thumbDetails?.slugType, customer?.gender)}
                </div>

                {hasOvalData ? (
                  <>
                    <div className="absolute top-[calc(25%-2px)] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[21px] font-semibold text-black whitespace-nowrap z-10">
                      {thumbDetails?.holeSize || ''}
                    </div>

                    <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                      <style>{`
                        @keyframes heartbeat-thump {
                          0%, 100% { transform: scale(1); }
                          10% { transform: scale(1.12); }
                          20% { transform: scale(1); }
                          30% { transform: scale(1.12); }
                          40% { transform: scale(1); }
                        }
                      `}</style>
                      <div className="relative flex items-center justify-center">
                        <div 
                          className="absolute w-[55px] h-[55px] rounded-full bg-indigo-500/30 blur-md animate-pulse pointer-events-none"
                          style={{ animationDuration: '2s' }}
                        ></div>
                        <div style={{ animation: 'heartbeat-thump 2s infinite', position: 'relative', zIndex: 10 }}>
                          <button
                            onClick={onGuideClick}
                            className="group relative w-[45px] h-[45px] rounded-full bg-white border-[2px] border-indigo-400 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-all duration-300 hover:scale-110 hover:border-indigo-600 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] active:scale-95 outline-none cursor-pointer"
                            title="드릴링 가이드 보기"
                          >
                            <span className="text-[14px] font-bold text-slate-800 transition-colors group-hover:text-black" style={{ transform: `rotate(${data?.ovalAngle || 0}deg)` }}>
                              {data?.ovalAngle || ''}°
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-[calc(75%+2px)] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[21px] font-semibold text-black whitespace-nowrap z-10">
                      {thumbDetails?.ovalSize || ''}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-[21px] font-semibold text-black whitespace-nowrap z-10">
                      {thumbDetails?.holeSize || ''}
                    </div>
                  </>
                )}
              </div>
            </Abs>
            
            {(thumbDetails?.bevel1 || thumbDetails?.bevel2 || thumbDetails?.bevel3) && (
              <div className="absolute z-30" style={{ left: '450px', bottom: '52px', transform: 'translateX(-50%)' }}>
                <div className="bg-white border-b border-r border-slate-400 px-3 py-2 rounded-lg shadow-sm text-xs font-bold text-slate-700 flex flex-col justify-end whitespace-nowrap">
                  <div className="text-center border-b border-slate-300 pb-1 mb-1.5 text-[10px] text-slate-500 uppercase tracking-widest">Bevel</div>
                  <div className="grid grid-cols-[auto_auto_1fr_auto_1fr] gap-x-1.5 gap-y-0.5 items-center">
                    {thumbDetails?.bevel1 && (
                      <>
                        <span className="text-slate-500 text-right">1st</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbDetails.bevel1.split('|')[0] || '-'}</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbDetails.bevel1.split('|')[1] || '-'}</span>
                      </>
                    )}
                    {thumbDetails?.bevel2 && (
                      <>
                        <span className="text-slate-500 text-right">2nd</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbDetails.bevel2.split('|')[0] || '-'}</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbDetails.bevel2.split('|')[1] || '-'}</span>
                      </>
                    )}
                    {thumbDetails?.bevel3 && (
                      <>
                        <span className="text-slate-500 text-right">3rd</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbDetails.bevel3.split('|')[0] || '-'}</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbDetails.bevel3.split('|')[1] || '-'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {(thumbOffset?.left || thumbOffset?.right) && (
              <div className="absolute z-30" style={{ left: '90px', bottom: '52px', transform: 'translateX(-50%)' }}>
                <div className="bg-white border-b border-l border-slate-400 px-3 py-2 rounded-lg shadow-sm text-xs font-bold text-slate-700 flex flex-col justify-end whitespace-nowrap min-w-[70px]">
                  <div className="text-center border-b border-slate-300 pb-1 mb-1.5 text-[10px] text-slate-500 uppercase tracking-widest">Offset</div>
                  <div className="grid grid-cols-[auto_auto_1fr] gap-x-1.5 gap-y-0.5 items-center">
                    {thumbOffset?.left && (
                      <>
                        <span className="text-slate-500 text-right">Left</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbOffset.left}</span>
                      </>
                    )}
                    {thumbOffset?.right && (
                      <>
                        <span className="text-slate-500 text-right">Right</span>
                        <span className="text-slate-300">:</span>
                        <span className="text-center">{thumbOffset.right}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 덤리스 상태 지정 좌표 X: 170, Y: 270 고정 렌더러 */}
        {isThumbless && showThumblessDiff && (
          <Abs x={170} y={270} z={30}>
            <div className={`w-[85px] h-[36px] flex items-center justify-center text-[16px] font-bold ${thumblessDiffColor}`}>
              {thumblessDiffDisplay}
            </div>
          </Abs>
        )}
        </div>
      </div>
    </Card>
  );
}