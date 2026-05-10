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

const Abs = ({ x, y, children, z = 10 }) => (
  <div className="absolute flex items-center justify-center" style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: z }}>{children}</div>
);

const PitchBox = ({ upValue, downValue }) => {
  const value = upValue || downValue || '';
  return (
    <div className="relative w-[80px] h-[36px] flex justify-center">
      {upValue && (
        <div className="absolute bottom-[100%] flex flex-col items-center mb-1">
          <Icon name="arrowUp" className="text-black mb-0.5" size={14} strokeWidth={3} />
          <span className="text-[12px] font-bold text-black">Reverse</span>
        </div>
      )}
      <div className={`w-full h-full ${commonBoxClass}`}>{value}</div>
      {downValue && (
        <div className="absolute top-[100%] flex flex-col items-center mt-1">
          <span className="text-[12px] font-bold text-black mb-0.5">Forward</span>
          <Icon name="arrowDown" className="text-black" size={14} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

export default function ChartBlueprintView({ data = {}, customer = {}, memoOverlay, memosRenderer, innerRef, isMemoActive }) {
  const isThumbless = data?.isThumbless || false;
  const isLeft = data?.handedness === 'left';
  const midPitch = data?.midPitch || {};
  const ringPitch = data?.ringPitch || {};
  const thumbPitch = data?.thumbPitch || {};
  const thumbDetails = data?.thumbDetails || {};

  const firstPitch = isLeft ? ringPitch : midPitch;
  const secondPitch = isLeft ? midPitch : ringPitch;
  const firstLabel = isLeft ? "약지" : "중지";
  const secondLabel = isLeft ? "중지" : "약지";

  // 부모 컨테이너의 정확한 내부 픽셀 너비를 계산하여 소수점 오차를 없앱니다.
  const getExactScale = () => {
    if (typeof window === 'undefined') return 1;
    const cw = document.documentElement.clientWidth;
    const isSm = cw >= 640;
    const parentPadding = isSm ? PAGE_PADDING_X_PX.sm : PAGE_PADDING_X_PX.base;
    const containerW = Math.min(cw, PAGE_MAX_WIDTH_PX) - parentPadding;
    const wrapperW = Math.min(containerW, PAGE_MAX_WIDTH_PX);
    const innerW = wrapperW - 2; // 테두리(border) 2px 제외
    return innerW / 540;
  };

  const [scale, setScale] = useState(getExactScale);

  useEffect(() => {
    const handleResize = () => setScale(getExactScale());

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layout = { mid: { x: 170, y: 170, r: 70 }, ring: { x: 370, y: 170, r: 70 }, thumb: { x: 270, y: 470, r: 70 } };
  const midEdge = getEdgePoint(layout.mid, layout.thumb, layout.mid.r);
  const thumbEdgeM = getEdgePoint(layout.thumb, layout.mid, layout.thumb.r);
  const ringEdge = getEdgePoint(layout.ring, layout.thumb, layout.ring.r);
  const thumbEdgeR = getEdgePoint(layout.thumb, layout.ring, layout.thumb.r);

  const spanLeftPos = { x: (midEdge.x + thumbEdgeM.x) / 2, y: (midEdge.y + thumbEdgeM.y) / 2 };
  const spanRightPos = { x: (ringEdge.x + thumbEdgeR.x) / 2, y: (ringEdge.y + thumbEdgeR.y) / 2 };
  const activeCanvasHeight = isThumbless ? 320 : 640;

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

        <Abs x={layout.mid.x} y={57}>
          <div className="flex flex-col items-center whitespace-nowrap">
            <span className="text-[17px] font-bold text-black mb-1">{firstLabel}</span>
            <div className="flex items-center gap-1.5 h-[36px]">
              <span className={`font-bold transition-opacity ${firstPitch?.lat && firstPitch?.latDir === 'left' ? 'opacity-100' : 'opacity-0'}`}><Icon name="arrowLeft" className="text-black" size={14} strokeWidth={3} /></span>
              <div className={`w-[80px] h-full ${commonBoxClass}`}>{firstPitch?.lat || ''}</div>
              <span className={`font-bold transition-opacity ${firstPitch?.lat && firstPitch?.latDir === 'right' ? 'opacity-100' : 'opacity-0'}`}><Icon name="arrowRight" className="text-black" size={14} strokeWidth={3} /></span>
            </div>
          </div>
        </Abs>
        <Abs x={50} y={layout.mid.y}><PitchBox upValue={firstPitch?.up} downValue={firstPitch?.down} /></Abs>
        <Abs x={layout.mid.x} y={layout.mid.y}>
          <div className="w-[140px] h-[140px] rounded-full border-[2px] border-black bg-white flex flex-col items-center justify-evenly pt-[7px] pb-[17px] shadow-sm relative">
            <div className="text-[14px] font-medium text-black">{firstPitch?.holeCutSize || getDefaultHoleCutSize(firstPitch?.insertSize)}</div>
            <span className="text-[19px] leading-tight tracking-tight font-semibold text-black whitespace-nowrap">{firstPitch?.insertSize || ''}</span>
            <span className="text-[17px] font-semibold text-black">{firstPitch?.tipType || ''}</span>
          </div>
        </Abs>

        <Abs x={layout.ring.x} y={57}>
          <div className="flex flex-col items-center whitespace-nowrap">
            <span className="text-[17px] font-bold text-black mb-1">{secondLabel}</span>
            <div className="flex items-center gap-1.5 h-[36px]">
              <span className={`font-bold transition-opacity ${secondPitch?.lat && secondPitch?.latDir === 'left' ? 'opacity-100' : 'opacity-0'}`}><Icon name="arrowLeft" className="text-black" size={14} strokeWidth={3} /></span>
              <div className={`w-[80px] h-full ${commonBoxClass}`}>{secondPitch?.lat || ''}</div>
              <span className={`font-bold transition-opacity ${secondPitch?.lat && secondPitch?.latDir === 'right' ? 'opacity-100' : 'opacity-0'}`}><Icon name="arrowRight" className="text-black" size={14} strokeWidth={3} /></span>
            </div>
          </div>
        </Abs>
        <Abs x={490} y={layout.ring.y}><PitchBox upValue={secondPitch?.up} downValue={secondPitch?.down} /></Abs>
        <Abs x={layout.ring.x} y={layout.ring.y}>
          <div className="w-[140px] h-[140px] rounded-full border-[2px] border-black bg-white flex flex-col items-center justify-evenly pt-[7px] pb-[17px] shadow-sm relative">
            <div className="text-[14px] font-medium text-black">{secondPitch?.holeCutSize || getDefaultHoleCutSize(secondPitch?.insertSize)}</div>
            <span className="text-[19px] leading-tight tracking-tight font-semibold text-black whitespace-nowrap">{secondPitch?.insertSize || ''}</span>
            <span className="text-[17px] font-semibold text-black">{secondPitch?.tipType || ''}</span>
          </div>
        </Abs>

        <Abs x={(layout.mid.x + layout.ring.x) / 2} y={layout.mid.y} z={20}>
          <div className="text-[15px] font-bold text-black drop-shadow-md">{data?.bridge || ''}</div>
        </Abs>

        {!isThumbless && (
          <>
            <Abs x={270} y={spanLeftPos.y - 45} z={20}>
              <div className="bg-white px-4 rounded-md text-[16px] font-bold text-black flex items-center gap-1.5">
                {data?.spanType || ''}
                <Icon name="check" className="text-black" size={15} strokeWidth={3} />
              </div>
            </Abs>
            <Abs x={spanLeftPos.x} y={spanLeftPos.y} z={20}><div className={`w-[85px] h-[36px] ${commonBoxClass}`}>{data?.spanLeft || ''}</div></Abs>
            <Abs x={spanRightPos.x} y={spanRightPos.y} z={20}><div className={`w-[85px] h-[36px] ${commonBoxClass}`}>{data?.spanRight || ''}</div></Abs>
            <Abs x={150} y={layout.thumb.y}>
              <div className="relative w-[80px] h-[36px] flex justify-center">
                {thumbPitch?.up && (
                  <div className="absolute bottom-[100%] flex flex-col items-center mb-1">
                    <Icon name="arrowUp" className="text-black mb-0.5" size={14} strokeWidth={3} />
                    <span className="text-[12px] font-bold text-black">Forward</span>
                  </div>
                )}
                <div className={`w-full h-full ${commonBoxClass}`}>{thumbPitch?.up || thumbPitch?.down || ''}</div>
                {thumbPitch?.down && (
                  <div className="absolute top-[100%] flex flex-col items-center mt-1">
                    <span className="text-[12px] font-bold text-black mb-0.5">Reverse</span>
                    <Icon name="arrowDown" className="text-black" size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            </Abs>
            <Abs x={380} y={layout.thumb.y}>
              <div className="border border-slate-400 bg-white w-[46px] h-[46px] rounded-full flex items-center justify-center text-[15px] font-bold text-black shadow-sm" style={{ transform: `rotate(${data?.ovalAngle || 0}deg)` }}>{data?.ovalAngle || ''}°</div>
            </Abs>
            <Abs x={layout.thumb.x} y={570}>
              <div className="flex items-center gap-2 h-[36px] whitespace-nowrap">
                <span className={`font-bold transition-opacity duration-300 flex items-center gap-1 ${thumbPitch?.left ? 'text-black opacity-100' : 'opacity-0'}`}>
                  <Icon name="arrowLeft" className="text-black" size={14} strokeWidth={3} />
                  Left
                </span>
                <div className={`w-[80px] h-full ${commonBoxClass}`}>{thumbPitch?.left || thumbPitch?.right || ''}</div>
                <span className={`font-bold transition-opacity duration-300 flex items-center gap-1 ${thumbPitch?.right ? 'text-black opacity-100' : 'opacity-0'}`}>
                  Right
                  <Icon name="arrowRight" className="text-black" size={14} strokeWidth={3} />
                </span>
              </div>
            </Abs>
            <Abs x={layout.thumb.x} y={layout.thumb.y}>
              <div className="w-[140px] h-[140px] rounded-full border-[2px] border-black bg-white flex flex-col items-center justify-evenly pt-[7px] pb-[17px] shadow-lg relative">
                <div className="text-[14px] font-medium text-black">{thumbDetails?.holeCutSize || getDefaultThumbHoleCutSize(thumbDetails?.slugType, customer?.gender)}</div>
                <span className="text-[22px] font-semibold text-black">{thumbDetails?.holeSize || ''}</span>
                <span className="text-[22px] font-semibold text-black">{thumbDetails?.ovalSize || ''}</span>
              </div>
            </Abs>
          </>
        )}
        </div>
      </div>
    </Card>
  );
}
