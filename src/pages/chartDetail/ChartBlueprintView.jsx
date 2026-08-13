import { useEffect, useState, useRef } from 'react';
import PageShell from '../../components/layout/PageShell.jsx';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import TaskbarHelpBalloon from '../../components/ui/TaskbarHelpBalloon.jsx';
import { commonBoxClass, getEdgePoint } from './chartOptions.js';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

const getChartBlueprintManualSections = (isThumbless) => [
  {
    items: [
      { title: "메모 작성", desc: "상단 테스크바의 [메모] 버튼을 활성화한 후, 도면 위 원하는 위치(중지/약지/엄지/핀 부근 등)를 터치하여 메모(작업 노하우)를 기록합니다." },
      {
        title: "드릴링 가이드",
        desc: isThumbless
          ? "중지 혹은 약지 밑에 표시된 스판 편차값을 클릭하면 상세 드릴링 가이드 팝업이 열립니다."
          : "맥동효과가 적용중인 오발 각도를 클릭하면 상세 드릴링 가이드 팝업이 열립니다."
      },
      { title: "차트 보호", desc: "지공 차트 영역을 빠르게 3회 연속 터치하면 화면이 즉시 잠금 전환됩니다." }
    ]
  }
];

const { PAGE_MAX_WIDTH_PX = 768, PAGE_PADDING_X_PX = { base: 16, sm: 32 } } = PageShell?.tokens || {};

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

export default function ChartBlueprintView({ 
  data = {}, 
  customer = {}, 
  memoOverlay, 
  memosRenderer, 
  innerRef, 
  isMemoActive, 
  onGuideClick
}) {
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
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document?.documentElement) return 1;
    const cw = document.documentElement.clientWidth || 390;
    const isSm = cw >= 640;
    const parentPadding = isSm ? (PAGE_PADDING_X_PX?.sm || 32) : (PAGE_PADDING_X_PX?.base || 16);
    const containerW = Math.min(cw, PAGE_MAX_WIDTH_PX || 768) - parentPadding;
    const wrapperW = Math.min(containerW, PAGE_MAX_WIDTH_PX || 768);
    const innerW = wrapperW - 2; 
    return innerW / 540;
  };

  const [scale, setScale] = useState(getExactScale);
  const [showHelp, setShowHelp] = useState(false);
  const [showManualHelpSetting, setShowManualHelpSetting] = useState(true);
  const syncedPingStyle = useSyncedPingStyle();

  useEffect(() => {
    const handleUpdateSetting = () => {
      setShowManualHelpSetting(localStorage.getItem('show_manual_help') !== 'false');
    };
    handleUpdateSetting();
    window.addEventListener('manual_help_setting_changed', handleUpdateSetting);
    window.addEventListener('storage', handleUpdateSetting);
    return () => {
      window.removeEventListener('manual_help_setting_changed', handleUpdateSetting);
      window.removeEventListener('storage', handleUpdateSetting);
    };
  }, []);

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

  if (isThumbless) {
    const leftF = parseFraction(data?.spanLeft);   
    const rightF = parseFraction(data?.spanRight); 
    
    const baseF = isLeft ? rightF : leftF;
    const compareF = isLeft ? leftF : rightF;

    const diffF = baseF - compareF;
    const absDiff32 = Math.round(Math.abs(diffF) * 32);
    
    showThumblessDiff = true; 
    
    if (absDiff32 === 0) {
      thumblessDiffDisplay = '=';
      thumblessDiffColor = 'text-black';
    } else {
      let n = absDiff32;
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

  const hasOvalData = !!thumbDetails?.ovalSize || !!data?.ovalAngle;

  return (
    <Card className="relative overflow-hidden transition-[height] duration-500 animate-fade-in mt-2 mb-2 sm:mb-2" constrained data-testid="chart-blueprint-surface" elevation="md" gpu layer="content" style={{ height: `${activeCanvasHeight * scale}px` }}>
      {/* 🎯 [순서 정밀 교정]: 3핑거/덤리스 관계없이 상시 스케일링이 작동하도록 핵심 하트비트 애니메이션 정의를 스코프 외부 최상단으로 격리 배치 */}
      <style>{`
        @keyframes heartbeat-thump {
          0%, 100% { transform: scale(1); }
          10% { transform: scale(1.12); }
          20% { transform: scale(1); }
          30% { transform: scale(1.12); }
          40% { transform: scale(1); }
        }
      `}</style>

      {/* 💡 [지공 도면 상단 좌측 반투명 3초 맥동 도움말 버튼 - Card 최상위에 배치하여 스케일 축소 방지] */}
      {showManualHelpSetting && (
        <div className="absolute top-3 left-3 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowHelp(prev => !prev);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200/60 hover:bg-slate-200/90 text-slate-700 border border-slate-300/50 backdrop-blur-xs shadow-xs flex items-center justify-center font-black text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer focus:outline-none"
            aria-label="지공 도면 가이드"
            title="지공 도면 가이드"
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
            ?
          </button>
          <TaskbarHelpBalloon 
            isOpen={showHelp} 
            onClose={() => setShowHelp(false)} 
            title="📖 지공 차트"
            sections={getChartBlueprintManualSections(isThumbless)}
          />
        </div>
      )}

      <div
        ref={innerRef}
        className={`relative shrink-0 select-none ${isMemoActive ? 'touch-none' : 'touch-auto'} transform-gpu chart-blueprint-container`}
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

        {/* 덤리스 상황에서 스판 편차 수치 원형 어그로 버튼 */}
        {isThumbless && showThumblessDiff && (
          <Abs x={170} y={270} z={30}>
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
                  <span className={`text-[13px] font-black tracking-tighter ${thumblessDiffColor}`}>
                    {thumblessDiffDisplay}
                  </span>
                </button>
              </div>
            </div>
          </Abs>
        )}
        </div>
      </div>
    </Card>
  );
}