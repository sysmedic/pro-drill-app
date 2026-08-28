import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { parseSpanFraction, getTipOffset } from '../../lib/spanConverter.js';
import { calculateSphericalMidline } from '../../lib/midlineCalculator.js';
import { useI18n } from '../../lib/i18n.jsx';

export default function Marking2DLayoutRenderer({
  isOpen,
  onClose,
  midlineResult,
  sharedState = {},
  onChangeMarkingType,
}) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // 📐 뷰포트 크기 실시간 감지 상태 (창 크기 조절 시 찌그러짐 100% 방지)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // 줌 및 드래그 팬(Pan) 상태
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFormulaPanel, setShowFormulaPanel] = useState(true);
  const touchDistRef = useRef(null);

  const {
    fromType = 'Cut to Cut',
    midSpanStr = '4 1/4',
    ringSpanStr = '4 3/8',
    midHoleCut = '31/32',
    ringHoleCut = '31/32',
    thumbHoleCut = '1 1/4',
    holeSize = '31/32',
    ovalSize = '31/32',
    ovalCut = '',
    ovalAngle = '25',
    midInsert = '',
    ringInsert = '',
    midTipType = '',
    ringTipType = '',
    bridgeStr = '3/16',
    isLeftHanded = false,
    denomMode = 32,
  } = sharedState;

  // 📌 모달 내부 로컬 마킹 타입 관리 (C-C ↔ Cut-Cut 전환 시 0초 즉시 반응)
  const [localMarkingType, setLocalMarkingType] = useState(midlineResult?.markingType || 'Cut to Cut');

  useEffect(() => {
    if (midlineResult?.markingType) {
      setLocalMarkingType(midlineResult.markingType);
    }
  }, [midlineResult?.markingType]);

  // 실시간 즉시 계산된 마킹 결과 (모달 내부에서 모드 변경 시 0ms 실시간 반영)
  const effectiveResult = useMemo(() => {
    return calculateSphericalMidline({
      midSpanStr,
      ringSpanStr,
      bridgeDiamStr: bridgeStr,
      fromType,
      markingType: localMarkingType,
      fingerDrillDiamStr: midHoleCut,
      ringDrillDiamStr: ringHoleCut,
      fingerInsertDiamStr: midInsert,
      thumbDrillDiamStr: thumbHoleCut,
      thumbEffectiveDiamStr: ovalSize || holeSize,
      ovalCutDiamStr: ovalCut || holeSize,
      ovalAngleDeg: ovalAngle,
      midTipType,
      ringTipType,
      denomMode,
    });
  }, [
    midSpanStr,
    ringSpanStr,
    bridgeStr,
    fromType,
    localMarkingType,
    midHoleCut,
    ringHoleCut,
    midInsert,
    thumbHoleCut,
    ovalSize,
    holeSize,
    ovalCut,
    ovalAngle,
    midTipType,
    ringTipType,
    denomMode,
  ]);

  const {
    dNTHalfFormatted = '-',
    dNTFormatted = '-',
    dMTFormatted = '-',
    dRTFormatted = '-',
    dCenterlineMidFormatted = '-',
    dMRFormatted = '-',
    dCenterlineMidCCFormatted = '-',
    dMRCCFormatted = '-',
    midActualFormatted = '-',
    ringActualFormatted = '-',
    dNTActualFormatted = '-',
    dNTActualHalfFormatted = '-',
    thumbAllowanceFormatted = '-',
    thumbEffectiveRadiusFormatted = '-',
    markingType = localMarkingType,
  } = effectiveResult || {};

  const isCutToCut = markingType !== 'Center to Center';

  // 📌 윈도우 및 컨테이너 리사이징 이벤트 감지 (도면 찌그러짐 방지 엔진)
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    if (isOpen) {
      setShowFormulaPanel(true);
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(container);

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen]);

  // 캔버스 초기 1:1 뷰 리셋 핸들러
  const handleResetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // 모드 변경 핸들러
  const handleMarkingTypeSwitch = (type) => {
    setLocalMarkingType(type);
    if (onChangeMarkingType) {
      onChangeMarkingType(type);
    }
  };

  // 줌 인/아웃
  const handleZoomIn = () => setScale((s) => Math.min(3.0, s * 1.15));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, s * 0.85));

  // 마우스 휠 줌 핸들러
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((s) => Math.min(3.0, Math.max(0.4, s * zoomFactor)));
  };

  // 마우스 및 터치 드래그 핸들러
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // 모바일 1손가락 드래그 & 2손가락 핀치 줌 핸들러
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      touchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2 && touchDistRef.current) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = newDist / touchDistRef.current;
      setScale((s) => Math.min(3.0, Math.max(0.4, s * factor)));
      touchDistRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistRef.current = null;
  };

  // 📐 캔버스 2D 고해상도 드로잉 엔진
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;
    const width = rect.width || (window.innerWidth);
    const height = rect.height || (window.innerHeight * 0.85);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. 다크 슬레이트 테크니컬 배경 클리어
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // 2. 물리 제원 수치 파싱 (인치 단위)
    const midCutR = (parseSpanFraction(midHoleCut) || 31 / 32) / 2;
    const ringCutR = (parseSpanFraction(ringHoleCut) || 31 / 32) / 2;
    const thumbCutR = (parseSpanFraction(thumbHoleCut) || 1.25) / 2;
    const bridgeVal = parseSpanFraction(bridgeStr) || 3 / 16;
    const midInsertR = (parseSpanFraction(midInsert) || 43 / 64) / 2;
    const ringInsertR = (parseSpanFraction(ringInsert) || 43 / 64) / 2;
    const thumbMajorR = (parseSpanFraction(ovalSize) || parseSpanFraction(holeSize) || 31 / 32) / 2;
    const thumbMinorR = (parseSpanFraction(holeSize) || 31 / 32) / 2;
    const angleNum = parseFloat(ovalAngle) || 0;

    // 📌 [지공사님 절대 기준]: 볼링공의 물리적 Center-to-Center 절대 거리는 입력 원본 기준(fromType)으로 100% 영구 고정
    const rawMidSpan = parseSpanFraction(midSpanStr) || 4.25;
    const rawRingSpan = parseSpanFraction(ringSpanStr) || 4.375;

    let fixedCcMid = rawMidSpan;
    let fixedCcRing = rawRingSpan;

    if (fromType === 'Cut to Cut') {
      fixedCcMid = rawMidSpan + midCutR + thumbCutR;
      fixedCcRing = rawRingSpan + ringCutR + thumbCutR;
    } else if (fromType === 'Actual Span') {
      const midTipOffset = getTipOffset(midTipType);
      const ringTipOffset = getTipOffset(ringTipType);
      fixedCcMid = rawMidSpan + midCutR + thumbCutR - midTipOffset;
      fixedCcRing = rawRingSpan + ringCutR + thumbCutR - ringTipOffset;
    }

    // 1:1 기하학적 홀 중심 좌표 (엄지 중심: (0, 0)) - 오른손/왼손 손구분에 따라 좌우 위치 반전
    const midCenterX_in = isLeftHanded ? +(bridgeVal / 2 + midCutR) : -(bridgeVal / 2 + midCutR);
    const ringCenterX_in = isLeftHanded ? -(bridgeVal / 2 + ringCutR) : +(bridgeVal / 2 + ringCutR);

    // 피타고라스 정리를 통한 실제 Y축 높이 산출 (y = sqrt(CC^2 - x^2))
    const midCenterY_in = Math.sqrt(Math.max(0, fixedCcMid * fixedCcMid - midCenterX_in * midCenterX_in));
    const ringCenterY_in = Math.sqrt(Math.max(0, fixedCcRing * fixedCcRing - ringCenterX_in * ringCenterX_in));

    // 미드라인 Y 절대 좌표 (중지-약지 중심과 엄지 중심의 절반) - 절대 불변
    const avgSpanY_in = (midCenterY_in + ringCenterY_in) / 2;
    const midlineY_in = avgSpanY_in / 2;

    // 1인치당 픽셀 스케일 및 뷰포트 정중앙 정밀 캘리브레이션
    const topMargin_in = Math.max(midCenterY_in + midCutR, ringCenterY_in + ringCutR) + 0.6; // 상단 중약지 라벨 여유
    const bottomMargin_in = thumbCutR + 0.6; // 하단 엄지 라벨 여유
    const totalSpanHeight_in = topMargin_in + bottomMargin_in;

    // 화면 높이 78%에 완벽하게 들어맞는 기본 배율 (스판 길이에 맞춰 자동 최적화)
    const basePpi = (height * 0.78) / totalSpanHeight_in;
    const ppi = basePpi * scale;

    // 도면 전체(상단 라벨 ~ 하단 라벨)의 기하학적 중심을 화면 정중앙에 1:1 배치
    const verticalCenterOffset_in = (topMargin_in - bottomMargin_in) / 2;
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + verticalCenterOffset_in * ppi + pan.y;

    ctx.save();
    ctx.translate(centerX, centerY);

    // 3. 테크니컬 그리드 모눈망 렌더링
    const gridSpanX = width / ppi;
    const gridSpanY = height / ppi;
    const startGridX = -Math.ceil(gridSpanX + Math.abs(pan.x / ppi));
    const endGridX = Math.ceil(gridSpanX + Math.abs(pan.x / ppi));
    const startGridY = -Math.ceil(gridSpanY + Math.abs(pan.y / ppi));
    const endGridY = Math.ceil(gridSpanY + Math.abs(pan.y / ppi));

    // 미세 보조 격자 (1/4인치) - 0.4px
    ctx.lineWidth = 0.4;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    for (let x = startGridX; x <= endGridX; x += 0.25) {
      ctx.beginPath();
      ctx.moveTo(x * ppi, startGridY * ppi);
      ctx.lineTo(x * ppi, endGridY * ppi);
      ctx.stroke();
    }
    for (let y = startGridY; y <= endGridY; y += 0.25) {
      ctx.beginPath();
      ctx.moveTo(startGridX * ppi, y * ppi);
      ctx.lineTo(endGridX * ppi, y * ppi);
      ctx.stroke();
    }

    // 주 격자 (1인치) - 0.7px
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    for (let x = startGridX; x <= endGridX; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * ppi, startGridY * ppi);
      ctx.lineTo(x * ppi, endGridY * ppi);
      ctx.stroke();
    }
    for (let y = startGridY; y <= endGridY; y += 1) {
      ctx.beginPath();
      ctx.moveTo(startGridX * ppi, y * ppi);
      ctx.lineTo(endGridX * ppi, y * ppi);
      ctx.stroke();
    }

    // 4. 홀 중심 픽셀 좌표 (화면 상단이 -Y)
    const midX = midCenterX_in * ppi;
    const midY = -midCenterY_in * ppi;
    const ringX = ringCenterX_in * ppi;
    const ringY = -ringCenterY_in * ppi;
    const thumbX = 0;
    const thumbY = 0;
    const midlinePixelY = -midlineY_in * ppi;

    // 5. 십자 기준선 (Centerline & Midline) 렌더링
    // 💜 센터라인 (Centerline - 수직선) - 0.8px
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, -height * 1.5);
    ctx.lineTo(0, height * 1.5);
    ctx.stroke();

    // 🩵 미드라인 (Midline - 수평선) - 0.8px
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(-width * 1.5, midlinePixelY);
    ctx.lineTo(width * 1.5, midlinePixelY);
    ctx.stroke();
    ctx.setLineDash([]); // 점선 해제

    // 6. 스판 마킹 측정선 및 화살표 렌더링 (C-C vs Cut to Cut 측정 위치 차별화) - 1px
    ctx.lineWidth = 1;

    // 1) 중지 스판 측정선 (에메랄드 그린)
    ctx.strokeStyle = '#10b981';
    let midMeasureStartX = thumbX;
    let midMeasureStartY = thumbY;
    let midMeasureEndX = midX;
    let midMeasureEndY = midY;

    if (isCutToCut) {
      // 컷투컷: 엄지 상단 가장자리 ~ 중지 하단 가장자리
      const angleMT = Math.atan2(midY - thumbY, midX - thumbX);
      midMeasureStartX = thumbX + Math.cos(angleMT) * thumbCutR * ppi;
      midMeasureStartY = thumbY + Math.sin(angleMT) * thumbCutR * ppi;
      midMeasureEndX = midX - Math.cos(angleMT) * midCutR * ppi;
      midMeasureEndY = midY - Math.sin(angleMT) * midCutR * ppi;
    }

    ctx.beginPath();
    ctx.moveTo(midMeasureStartX, midMeasureStartY);
    ctx.lineTo(midMeasureEndX, midMeasureEndY);
    ctx.stroke();

    // 2) 약지 스판 측정선 (로열 블루)
    ctx.strokeStyle = '#3b82f6';
    let ringMeasureStartX = thumbX;
    let ringMeasureStartY = thumbY;
    let ringMeasureEndX = ringX;
    let ringMeasureEndY = ringY;

    if (isCutToCut) {
      // 컷투컷: 엄지 상단 가장자리 ~ 약지 하단 가장자리
      const angleRT = Math.atan2(ringY - thumbY, ringX - thumbX);
      ringMeasureStartX = thumbX + Math.cos(angleRT) * thumbCutR * ppi;
      ringMeasureStartY = thumbY + Math.sin(angleRT) * thumbCutR * ppi;
      ringMeasureEndX = ringX - Math.cos(angleRT) * ringCutR * ppi;
      ringMeasureEndY = ringY - Math.sin(angleRT) * ringCutR * ppi;
    }

    ctx.beginPath();
    ctx.moveTo(ringMeasureStartX, ringMeasureStartY);
    ctx.lineTo(ringMeasureEndX, ringMeasureEndY);
    ctx.stroke();

    // 3) 미드라인 ↔ 엄지 수직 마킹선 - 1px
    const thumbTopCutY = thumbY - thumbCutR * ppi;
    const midlineMeasureEndY = isCutToCut ? thumbTopCutY : thumbY;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#38bdf8'; // 네온 시안
    ctx.beginPath();
    ctx.moveTo(0, midlinePixelY);
    ctx.lineTo(0, midlineMeasureEndY);
    ctx.stroke();

    // 4) 브릿지(중지-약지) 마킹선 - 1px
    const bridgeY = (midY + ringY) / 2;
    const bridgeStartX = isCutToCut
      ? (isLeftHanded ? ringX + ringCutR * ppi : midX + midCutR * ppi)
      : (isLeftHanded ? ringX : midX);
    const bridgeEndX = isCutToCut
      ? (isLeftHanded ? midX - midCutR * ppi : ringX - ringCutR * ppi)
      : (isLeftHanded ? midX : ringX);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#c084fc'; // 퍼플
    ctx.beginPath();
    ctx.moveTo(bridgeStartX, bridgeY);
    ctx.lineTo(bridgeEndX, bridgeY);
    ctx.stroke();

    // 7. 홀(중지, 약지, 엄지) 원형 드로잉 (실제 크기 비례)
    // 🟢 [중지 홀] - 홀컷 1.5px
    ctx.save();
    ctx.translate(midX, midY);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, midCutR * ppi, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5; // 1.5px
    ctx.strokeStyle = '#10b981'; // 에메랄드
    ctx.stroke();
    if (midInsertR > 0) {
      ctx.lineWidth = 0.8; // 0.8px
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, midInsertR * ppi, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 센터 십자선 - 0.5px
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
    ctx.moveTo(0, -7); ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.restore();

    // 🔵 [약지 홀] - 홀컷 1.5px
    ctx.save();
    ctx.translate(ringX, ringY);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, ringCutR * ppi, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5; // 1.5px
    ctx.strokeStyle = '#3b82f6'; // 블루
    ctx.stroke();
    if (ringInsertR > 0) {
      ctx.lineWidth = 0.8; // 0.8px
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, ringInsertR * ppi, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 센터 십자선 - 0.5px
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
    ctx.moveTo(0, -7); ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.restore();

    // 🔴 [엄지 홀 & 오발 각도 65도 기준 타원 회전] - 홀컷 1.5px
    ctx.save();
    ctx.translate(thumbX, thumbY);
    // 슬러그 홀컷 외곽선 - 1.5px
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, thumbCutR * ppi, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5; // 1.5px
    ctx.strokeStyle = '#ef4444'; // 레드
    ctx.stroke();

    // 📌 오발 각도 회전 (수직 센터라인 기준 angleNum, 즉 도면 수평 기준 90 - angleNum = 65도)
    const handSign = isLeftHanded ? -1 : 1;
    const drawAngleDeg = 90 - angleNum;
    const drawRadians = (drawAngleDeg * Math.PI) / 180;

    if (thumbMajorR > 0 && thumbMinorR > 0) {
      ctx.save();
      ctx.rotate(-drawRadians * handSign);
      ctx.lineWidth = 0.9; // 0.9px
      ctx.strokeStyle = '#f87171';
      ctx.beginPath();
      ctx.ellipse(0, 0, thumbMinorR * ppi, thumbMajorR * ppi, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 센터 십자선 - 0.5px
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
    ctx.moveTo(0, -8); ctx.lineTo(0, 8);
    ctx.stroke();
    ctx.restore();

    // 8. 🏷️ 한글 치수 및 뱃지 라벨 드로잉
    const drawBadge = (text, x, y, bgColor = '#1e293b', textColor = '#f8fafc', borderColor = '#475569') => {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const paddingX = 7;
      const paddingY = 4;
      const boxW = textWidth + paddingX * 2;
      const boxH = 19;

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;

      const bx = x - boxW / 2;
      const by = y - boxH / 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 0.5);
      ctx.restore();
    };

    // 📌 [지공사님 지침 100% 반영]: 심플 라벨 표기 (중지 31/32, 약지 31/32, 엄지 1 1/4)
    drawBadge(`중지 ${midHoleCut}`, midX, midY - (midCutR * ppi) - 16, 'rgba(15, 23, 42, 0.95)', '#6ee7b7', '#059669');
    drawBadge(`약지 ${ringHoleCut}`, ringX, ringY - (ringCutR * ppi) - 16, 'rgba(15, 23, 42, 0.95)', '#93c5fd', '#2563eb');
    drawBadge(`엄지 ${thumbHoleCut}`, thumbX, thumbY + (thumbCutR * ppi) + 16, 'rgba(15, 23, 42, 0.95)', '#fca5a5', '#dc2626');

    // 📌 [지공사님 지침 100% 반영]: 영문(dNT, dMT 등) 제거 및 100% 한글 지공 용어 표기
    // 1) 미드라인 마킹
    const midNT_Y = (midlinePixelY + midlineMeasureEndY) / 2;
    drawBadge(`미드라인 마킹: ${dNTHalfFormatted}`, 0, midNT_Y, '#0f172a', '#38bdf8', '#0284c7');

    // 2) 중지 스판 (오른손은 좌측 -20, 왼손은 우측 +20 / 에메랄드 테마)
    const midSpanBadgeX = (midMeasureStartX + midMeasureEndX) / 2 + (isLeftHanded ? 20 : -20);
    const midSpanBadgeY = (midMeasureStartY + midMeasureEndY) / 2;
    drawBadge(`중지 스판: ${dMTFormatted}`, midSpanBadgeX, midSpanBadgeY, '#0f172a', '#34d399', '#059669');

    // 3) 약지 스판 (오른손은 우측 +20, 왼손은 좌측 -20 / 블루 테마)
    const ringSpanBadgeX = (ringMeasureStartX + ringMeasureEndX) / 2 + (isLeftHanded ? -20 : 20);
    const ringSpanBadgeY = (ringMeasureStartY + ringMeasureEndY) / 2;
    drawBadge(`약지 스판: ${dRTFormatted}`, ringSpanBadgeX, ringSpanBadgeY, '#0f172a', '#60a5fa', '#2563eb');

    // 4) 브릿지 간격 (컷투컷: 브릿지, C-C: 중약지 센터 거리)
    const bridgeBadgeText = isCutToCut
      ? `브릿지: ${bridgeStr}`
      : `중약지 센터 거리: ${dMRCCFormatted || dMRFormatted}`;
    drawBadge(bridgeBadgeText, (midX + ringX) / 2, bridgeY - 15, '#0f172a', '#c084fc', '#9333ea');

    ctx.restore();
  }, [
    isOpen,
    scale,
    pan,
    viewportSize,
    fromType,
    localMarkingType,
    midSpanStr,
    ringSpanStr,
    midHoleCut,
    ringHoleCut,
    thumbHoleCut,
    holeSize,
    ovalSize,
    ovalAngle,
    midInsert,
    ringInsert,
    midTipType,
    ringTipType,
    bridgeStr,
    isLeftHanded,
    dNTHalfFormatted,
    dMTFormatted,
    dRTFormatted,
    dCenterlineMidFormatted,
    dMRFormatted,
    dCenterlineMidCCFormatted,
    dMRCCFormatted,
    isCutToCut,
  ]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      ref={containerRef}
      className="fixed inset-0 z-50 w-full h-full h-[100vh] h-[100dvh] bg-[#090d16] select-none animate-fade-in overflow-hidden text-white"
    >
      {/* 📌 메인 2D 도면 캔버스 뷰포트 (전면 100% 풀스크린 캔버스) */}
      <div
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* 📌 [좌측 상단 플로팅 HUD]: [ ● Cut to Cut ] [ ○ Center to Center ] 및 [ ● 산출 근거 ] */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 select-none pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleMarkingTypeSwitch('Cut to Cut')}
            className={`h-8 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md border shadow-md ${
              isCutToCut
                ? 'bg-slate-800 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/70'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                isCutToCut
                  ? 'scale-110 shadow-[0_0_8px_rgba(6,182,212,0.9)] bg-cyan-400'
                  : 'bg-slate-700'
              }`}
            />
            <span className="tracking-tight">Cut to Cut</span>
          </button>

          <button
            type="button"
            onClick={() => handleMarkingTypeSwitch('Center to Center')}
            className={`h-8 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md border shadow-md ${
              !isCutToCut
                ? 'bg-slate-800 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/70'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                !isCutToCut
                  ? 'scale-110 shadow-[0_0_8px_rgba(6,182,212,0.9)] bg-cyan-400'
                  : 'bg-slate-700'
              }`}
            />
            <span className="tracking-tight">Center to Center</span>
          </button>
        </div>

        {/* 산출 근거 토글 버튼 (가이드 오발 버튼처럼 밑에 단독 배치) */}
        <div>
          <button
            type="button"
            onClick={() => setShowFormulaPanel((prev) => !prev)}
            className={`h-8 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md border shadow-md ${
              showFormulaPanel
                ? 'bg-slate-800 text-amber-400 border-amber-500/60 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/70'
            }`}
            title="마킹 수치 산출 근거 보기"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                showFormulaPanel
                  ? 'scale-110 shadow-[0_0_8px_rgba(251,191,36,0.9)] bg-amber-400'
                  : 'bg-slate-700'
              }`}
            />
            <span className="tracking-tight">산출 근거</span>
          </button>
        </div>
      </div>

      {/* 📌 [우측 상단 플로팅 HUD]: [ ✕ ] [ ◎ ] */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 select-none pointer-events-auto">
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center font-bold transition-all cursor-pointer shadow-md active:scale-95 text-sm"
          title="닫기"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center font-bold transition-all cursor-pointer shadow-md active:scale-95 text-xs"
          title="첫 화면 1:1 뷰로 리셋"
        >
          ◎
        </button>
      </div>

      {/* 📐 [글래스모피즘 산출 근거 & 계산 공식 오버레이 패널 - 화면 정중앙 표출] */}
      {showFormulaPanel && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 pointer-events-none animate-fade-in">
          <div
            className="w-[94%] sm:w-96 max-w-md p-4 sm:p-5 bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-3 text-xs animate-scale-up select-text pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
              <div className="flex items-center gap-2 text-cyan-300 font-black text-sm">
                <span>📐</span>
                <span>마킹 산출 근거</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaPanel(false)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

          {/* 1단계: 엑추얼 스판 (Actual Span) */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>1. 엑추얼 스판 (Actual Span)</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/90 space-y-0.5 font-mono text-[11px]">
              <div className="text-emerald-300">중지: {midSpanStr}" ({fromType}) ➔ <strong className="text-emerald-200">{midActualFormatted}"</strong></div>
              <div className="text-blue-300">약지: {ringSpanStr}" ({fromType}) ➔ <strong className="text-blue-200">{ringActualFormatted}"</strong></div>
              <div className="text-slate-300 pt-1 border-t border-slate-800 text-[10.5px]">
                구면 중선 Actual = <strong className="text-cyan-300">{dNTActualFormatted}"</strong>
              </div>
            </div>
          </div>

          {/* 2단계: 미드라인 절대 위치 (엑추얼 스판) */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>2. 미드라인 절대 위치 (엑추얼 스판)</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/90 font-mono text-[11px] text-cyan-200">
              {dNTActualFormatted}" ÷ 2 = <strong className="text-white text-xs">{dNTActualHalfFormatted}"</strong>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">※ 엑추얼 스판 정중앙에 영구 고정</div>
            </div>
          </div>

          {/* 3단계: 선택된 모드 최종 마킹값 */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>3. {isCutToCut ? 'Cut to Cut' : 'Center to Center'} 최종 마킹</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/90 font-mono text-[11px] space-y-1">
              {isCutToCut ? (
                <>
                  <div className="text-amber-300 leading-tight">
                    미드라인 1/2 ({dNTActualHalfFormatted}") - 엄지여유 ({thumbAllowanceFormatted}")
                  </div>
                  <div className="text-white font-bold text-xs pt-1 border-t border-slate-800 flex items-center justify-between">
                    <span>미드라인 마킹:</span>
                    <span className="text-cyan-400 font-black text-sm">{dNTHalfFormatted}"</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">※ 엄지홀 외경 컷(Edge)에서 잰 거리</div>
                </>
              ) : (
                <>
                  <div className="text-amber-300 leading-tight">
                    미드라인 1/2 ({dNTActualHalfFormatted}") + 엄지홀 반경 ({thumbEffectiveRadiusFormatted}")
                  </div>
                  <div className="text-white font-bold text-xs pt-1 border-t border-slate-800 flex items-center justify-between">
                    <span>미드라인 마킹:</span>
                    <span className="text-cyan-400 font-black text-sm">{dNTHalfFormatted}"</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">※ 엄지홀 중심(+)에서 잰 거리</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>,
  document.body
);
}
