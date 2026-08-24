import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { parseSpanFraction, formatFractionByDenom } from '../../lib/spanConverter.js';

// 📌 7-Bit 마스터 전용 컬러 팔레트 (1:Red, 2:Amber, 3:Purple, 4:Blue, 5:Pink, 6:Lime, 7:Emerald)
const FULL_PALETTE = ['#ef4444', '#f59e0b', '#a855f7', '#3b82f6', '#ec4899', '#84cc16', '#10b981'];

export default function Midline2DLayoutRenderer({
  holeSize = '',
  ovalSize = '',
  ovalCut = '',
  ovalCut1 = '',
  ovalCut2 = '',
  ovalAngle = 45,
  hand = 'right',
  results = null,
  getDrillBitValue = () => '-',
  isDetailedMode = true,
  onDetailedModeChange = null,
  height = 360,
  thumbHoleCut = '',
  forceFullScreenOpen = false,
  onlyFullScreenPortal = false,
  onCloseFullScreen = null,
  updateSharedState = null,
  sharedState = null,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Full Screen 전용 컨테이너/캔버스 레퍼런스
  const fullScreenContainerRef = useRef(null);
  const fullScreenCanvasRef = useRef(null);

  // 최상단 100% 전면 풀스크린 모달 열림 상태
  const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(forceFullScreenOpen);

  // 📌 [지공사님 핵심 수술]: 좌상단 [ 🔓 오발 수정 ] / [ 🔒 오발 고정 ] 스위치 모드 (기본값: false - 프리뷰 모드)
  const [isEditMode, setIsEditMode] = useState(false);

  // 📌 현재 선택된 원 비트 인덱스 (1: 1번 오발컷1, 2: 2번 오발컷2, 3: 3번, 4: 4번, 5: 5번, null: 전체 비선택)
  const [selectedBitIndex, setSelectedBitIndex] = useState(1);

  // 📌 비트 개별 커스텀 오프셋 (3번, 4번, 5번 비트의 자유 이동 지원)
  const [bitCustomOffsets, setBitCustomOffsets] = useState({
    3: { x: 0, y: 0 },
    4: { x: 0, y: 0 },
    5: { x: 0, y: 0 },
  });

  // 📌 비트 개별 커스텀 크기 (3번, 4번 비트 자유 크기 지원)
  const [bitCustomSizes, setBitCustomSizes] = useState({
    3: null,
    4: null,
  });

  // 리프레시 키 (모드 전환 및 리사이즈 시 즉시 캔버스 리프레시 강제 트리거)
  const [refreshKey, setRefreshKey] = useState(0);

  // 📌 1, 2, 3, 4, 5번 각 드릴 비트 독립 개별 활성화 상태
  const [showBit1, setShowBit1] = useState(true);
  const [showBit2, setShowBit2] = useState(true);
  const [showBit3, setShowBit3] = useState(isDetailedMode);
  const [showBit4, setShowBit4] = useState(isDetailedMode);
  const [showBit5, setShowBit5] = useState(true);

  // 📌 드릴 비트 추가 증설 카운트 (지공사님 지침: 3컷/5컷 공통 총 7개 비트 도달 시까지 + 클릭 증설, 7개 도달 시 + 버튼 자동 소거)
  const [extraBitCount, setExtraBitCount] = useState(0);
  const [bitVisibilities, setBitVisibilities] = useState({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true });

  // 📌 D-Pad 길게 눌러 자유 위치 이동 (Repositioning) 상태
  const [dpadOffset, setDpadOffset] = useState({ x: 0, y: 0 });
  const isDraggingDpadRef = useRef(false);
  const dpadDragStartRef = useRef({ x: 0, y: 0 });

  // 📌 캔버스 직접 터치/드래그 비트 이동 상태
  const isDraggingBitRef = useRef(false);
  const bitDragStartRef = useRef(null);
  const lastBitPositionsRef = useRef({});

  // 📌 비트 롱프레스 삭제 상태 및 타이머 레퍼런스
  const [bitToDelete, setBitToDelete] = useState(null);
  const longPressTimerRef = useRef(null);

  // 📌 180도 도면 회전 상태 토글 (지공사님 전역 절대 정의: 아래쪽을 향하는 상태 [▼]가 기본 기본값 true)
  const [isFlipped180, setIsFlipped180] = useState(true);
  const isFlipped180Ref = useRef(true);

  const handleSetRotation = (flipVal) => {
    isFlipped180Ref.current = flipVal;
    setIsFlipped180(flipVal);
    setRefreshKey((prev) => prev + 1);
    requestAnimationFrame(() => {
      requestDirectRender();
    });
  };

  // 📌 [지공사님 지침]: 프리뷰 모드에서 시뮬레이터는 기본 꺼짐(false)으로 시작 (버튼 클릭으로 켜기/끄기 가능)
  const [isCheckFillMode, setIsCheckFillMode] = useState(false);
  // 📌 [지공사님 핵심 지침]: 실제 오발선은 상시 기본 표출되며, 이론적 오발선(초록 타원선)은 GUIDE LINE 스위치 ON 시에만 표출
  const [showGuideLine, setShowGuideLine] = useState(false);

  // 부모의 isDetailedMode 변경 시 3~4 중간비트 동기화
  useEffect(() => {
    setShowBit3(isDetailedMode);
    setShowBit4(isDetailedMode);
  }, [isDetailedMode]);

  // 📌 부모 sharedState 수치 1:1 동기화
  useEffect(() => {
    if (sharedState) {
      if (sharedState.extraBitCount !== undefined) {
        setExtraBitCount(sharedState.extraBitCount);
      }
      if (sharedState.bitCustomSizes) {
        setBitCustomSizes(sharedState.bitCustomSizes);
      }
      if (sharedState.bitCustomOffsets) {
        setBitCustomOffsets(sharedState.bitCustomOffsets);
      }
    }
  }, [sharedState]);

  // 📌 특정 비트 렌더링 활성화 상태 판별 유틸 (EDIT 모드 가동 시 selectedBitIndex 단독 가시화, PREVIEW 모드 시 bitVisibilities 참조)
  const isBitVisible = useCallback(
    (rowIdx) => {
      if (isEditMode) {
        return rowIdx === selectedBitIndex;
      }
      return bitVisibilities[rowIdx] !== false;
    },
    [isEditMode, selectedBitIndex, bitVisibilities]
  );

  // 📌 현재 활성화된 총 비트 수 연산 (기본: 3컷 모드 3개 / 5컷 모드 5개 + extraBitCount, MAX 7개 제한)
  const baseBitsCount = isDetailedMode ? 5 : 3;
  const totalActiveBits = Math.min(7, baseBitsCount + extraBitCount);

  // 📌 D-Pad 컨트롤러 버튼 비활성화(잠금) 상태 계산
  const isSelectedBitSizeDisabled = selectedBitIndex === null || selectedBitIndex === totalActiveBits;
  const isSelectedBitMoveDisabled = selectedBitIndex === null || selectedBitIndex === 1 || selectedBitIndex === 2 || selectedBitIndex === totalActiveBits;
  const isSelectedBitHorizDisabled = isSelectedBitMoveDisabled;

  // 📌 드릴 비트 칩 클릭 선택/토글 핸들러 (지공사님 지침 100% 반영: 모바일 터치 고스트 클릭 방지 및 클릭 시 선택 확실화)
  const handleSelectBitChip = (e, rowIdx) => {
    if (e) {
      e.stopPropagation();
    }
    if (isEditMode) {
      // EDIT 모드: 단일 선택 및 재클릭 시 비활성화(null) 1:1 토글, 선택된 비트는 가시성 true 100% 보장
      setSelectedBitIndex((prev) => {
        const next = prev === rowIdx ? null : rowIdx;
        if (next !== null) {
          setBitVisibilities((v) => ({ ...v, [next]: true }));
        }
        return next;
      });
    } else {
      // PREVIEW 모드: 1~7번 비트 가림/노출 1:1 토글 (꺼진 비트만 클릭 시 켬)
      setBitVisibilities((prev) => {
        const isCurrentlyHidden = prev[rowIdx] === false;
        return {
          ...prev,
          [rowIdx]: isCurrentlyHidden ? true : false,
        };
      });
    }
    setRefreshKey((prev) => prev + 1);
    requestAnimationFrame(() => requestDirectRender());
  };

  // 📌 신규 드릴 비트 추가 (+) 핸들러 (초기 Cut1 64분율 규격 고정 등록으로 1스톱 조절 보장)
  const handleAddExtraBit = (e) => {
    e?.stopPropagation();
    if (totalActiveBits >= 7) return;

    // 현재 totalActiveBits (예: 3)가 새로 추가되는 비트의 인덱스가 됨 (원홀은 4로 자동 릴레이 이동)
    const newBitIdx = totalActiveBits;
    const initialSizeStr = (getDrillBitValue && getDrillBitValue(newBitIdx) !== '-')
      ? getDrillBitValue(newBitIdx)
      : formatFractionByDenom(cutNum1, 64);

    const newExtraCount = extraBitCount + 1;
    const nextSizes = { ...bitCustomSizes, [newBitIdx]: initialSizeStr };

    setExtraBitCount(newExtraCount);
    setBitCustomSizes(nextSizes);
    setSelectedBitIndex(newBitIdx);
    setBitVisibilities((prev) => ({
      ...prev,
      [newBitIdx]: true,
      [newBitIdx + 1]: true,
    }));
    notifyRealtimeChange(nextSizes, bitCustomOffsets, newExtraCount);
    setRefreshKey((prev) => prev + 1);
    requestAnimationFrame(() => requestDirectRender());
  };

  // 📌 0.001초 전역 상태 실시간 1:1 디스패치 유틸
  const notifyRealtimeChange = (newSizes = bitCustomSizes, newOffsets = bitCustomOffsets, newExtraCount = extraBitCount) => {
    if (updateSharedState) {
      updateSharedState({
        extraBitCount: newExtraCount,
        bitCustomSizes: newSizes,
        bitCustomOffsets: newOffsets,
      });
    }
  };

  // 📌 드릴 비트 칩 롱프레스(600ms) 감지 핸들러
  const handleChipTouchStart = (rowIdx) => {
    if (!isEditMode || extraBitCount <= 0) return;
    // 마스터 원홀 및 기본 오발컷 비트 제외, 추가된 비트만 삭제 가능
    if (rowIdx < baseBitsCount || rowIdx >= totalActiveBits) return;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setBitToDelete(rowIdx);
    }, 600);
  };

  const handleChipTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 📌 드릴 비트 삭제 확정 및 번호 자동 재정렬 (Renumbering & Realtime dispatch)
  const confirmDeleteBit = () => {
    if (bitToDelete === null) return;
    const target = bitToDelete;
    const newExtraCount = Math.max(0, extraBitCount - 1);

    const newSizes = { ...bitCustomSizes };
    const newOffsets = { ...bitCustomOffsets };

    delete newSizes[target];
    delete newOffsets[target];

    for (let b = target + 1; b <= totalActiveBits; b++) {
      if (newSizes[b] !== undefined) {
        newSizes[b - 1] = newSizes[b];
        delete newSizes[b];
      }
      if (newOffsets[b] !== undefined) {
        newOffsets[b - 1] = newOffsets[b];
        delete newOffsets[b];
      }
    }

    setExtraBitCount(newExtraCount);
    setBitCustomSizes(newSizes);
    setBitCustomOffsets(newOffsets);
    setSelectedBitIndex(null);
    setBitToDelete(null);

    notifyRealtimeChange(newSizes, newOffsets, newExtraCount);
    setRefreshKey((prev) => prev + 1);
    requestAnimationFrame(() => requestDirectRender());
  };

  // 📌 PREVIEW 모드 전환 핸들러 (시뮬레이터 기본 꺼짐, 나머지 드릴 모두 켜짐 출발)
  const handleSwitchToPreviewMode = (e) => {
    e?.stopPropagation();
    setIsEditMode(false);
    setIsCheckFillMode(false); // 📌 [지공사님 지침]: 프리뷰 모드에서 시뮬레이터는 기본 꺼짐으로 시작
    setBitVisibilities({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true }); // 📌 [지공사님 지침]: 나머지 드릴 모두 켜짐 시작
    setRefreshKey((prev) => prev + 1);
    requestAnimationFrame(() => requestDirectRender());
  };

  // 📌 EDIT 모드 전환 핸들러 (시뮬레이터 기본 켜짐 출발(끌 수 있음), 나머지 드릴 꺼짐 출발(선택 비트만 켜짐))
  const handleSwitchToEditMode = (e) => {
    e?.stopPropagation();
    setIsEditMode(true);
    setIsCheckFillMode(true); // 📌 [지공사님 지침]: 에디트 모드의 시뮬레이터는 기본 켜짐으로 시작 (끌 수 있음)
    setSelectedBitIndex(null); // 📌 [지공사님 지침]: 나머지 드릴은 꺼짐 출발 (선택 비트만 켜짐)
    setRefreshKey((prev) => prev + 1);
    requestAnimationFrame(() => requestDirectRender());
  };

  // 📌 차트 설정 상 활성화된 비트인가? (selectedBitIndex와 무관한 가림/노출 연동)
  const isBitActiveInChart = useCallback(
    (rowIdx) => {
      if (rowIdx > totalActiveBits) return false;
      return bitVisibilities[rowIdx] !== false;
    },
    [totalActiveBits, bitVisibilities]
  );

  // 📌 [수학 수치 100% 팩트 파싱 및 앱 전역 상태 실사이즈 맵핑]:
  const slugNum = parseSpanFraction(thumbHoleCut) || (1 + 1 / 4); 

  const holeNum = parseSpanFraction(holeSize) || (31 / 32);
  const ovalNum = parseSpanFraction(ovalSize) || (63 / 64);
  const cutNum1 = parseSpanFraction(ovalCut1 || ovalCut) || (31 / 32);
  const cutNum2 = parseSpanFraction(ovalCut2 || ovalCut || ovalCut1) || cutNum1;
  const angleNum = Number(ovalAngle) || 0;

  // 📌 [Direct Canvas Engine Architecture]: React State 딜레이 100% 우회 레퍼런스 및 픽셀 락
  const zoomRef = useRef(1.08);
  const panRef = useRef({ x: 0, y: 0 });
  const fitZoomRef = useRef(1.08);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 📌 [Mobile Pinch Zoom & Touch Firewall Guard]: 모바일 2지 핀치 줌 및 터치 이탈 방화벽 레퍼런스
  const touchStartDistRef = useRef(null);
  const initialPinchZoomRef = useRef(1.08);

  // 📌 [Canvas GPU Buffer Guard]: 캔버스 크기 재할당으로 인한 GPU 프레임 드랍 및 iOS WebKit 메모리 누수 100% 방지
  const inlineCanvasSizeRef = useRef({ w: 0, h: 0, dpr: 0 });
  const fullCanvasSizeRef = useRef({ w: 0, h: 0, dpr: 0 });
  const offscreenCanvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // 📌 [공통 2D 청사진 렌더링 코어 함수]: 도면 흔들림 100% 제거 픽셀 락 연산 반영
  const drawBlueprint = useCallback(
    (targetCanvas, targetContainer, customHeight) => {
      if (!targetCanvas || !targetContainer) return;

      const ctx = targetCanvas.getContext('2d');
      const rect = targetContainer.getBoundingClientRect();
      // 📌 iOS Safari 0px 마운트 가드: 최소 320px 뷰포트 보장
      const rawW = Math.floor(rect.width);
      const rawH = Math.floor(rect.height);
      const displayWidth = rawW > 50 ? rawW : (window.innerWidth || 460);
      const displayHeight = rawH > 50 ? rawH : customHeight || displayWidth;

      // 📌 디바이스 맞춤 1:1 fitZoom 계산 및 픽셀 락 (도면 흔들림 100% 제거)
      const minDim = Math.min(displayWidth, displayHeight) || 460;
      const targetSpanInches = 2 * (slugNum / 1.5) * 1.22;
      const computedFitZoom = Math.max(0.5, minDim / (targetSpanInches * 175));

      if (fitZoomRef.current === null || Math.abs(computedFitZoom - fitZoomRef.current) > 0.05) {
        fitZoomRef.current = computedFitZoom;
        if (!zoomRef.current || isNaN(zoomRef.current) || zoomRef.current < computedFitZoom) {
          zoomRef.current = computedFitZoom;
        }
      }

      // 📌 [Mobile Canvas Safety Firewall]: panRef / zoomRef 수치 무결성 강제 검증 방화벽 (NaN 발생 100% 방지)
      if (!panRef.current || typeof panRef.current.x !== 'number' || isNaN(panRef.current.x) || typeof panRef.current.y !== 'number' || isNaN(panRef.current.y)) {
        panRef.current = { x: 0, y: 0 };
      }
      if (typeof zoomRef.current !== 'number' || isNaN(zoomRef.current) || zoomRef.current <= 0) {
        zoomRef.current = fitZoomRef.current || 1.08;
      }

      const activePan = {
        x: isNaN(panRef.current.x) ? 0 : panRef.current.x,
        y: isNaN(panRef.current.y) ? 0 : panRef.current.y,
      };
      const rawActiveZoom = Math.max(fitZoomRef.current || 0.5, zoomRef.current || 1.08);
      const activeZoom = (isNaN(rawActiveZoom) || rawActiveZoom <= 0) ? 1.08 : rawActiveZoom;
      const dpr = window.devicePixelRatio || 1;

      const isInline = targetCanvas === canvasRef.current;
      const sizeRef = isInline ? inlineCanvasSizeRef : fullCanvasSizeRef;

      if (sizeRef.current.w !== displayWidth || sizeRef.current.h !== displayHeight || sizeRef.current.dpr !== dpr) {
        targetCanvas.width = Math.floor(displayWidth * dpr);
        targetCanvas.height = Math.floor(displayHeight * dpr);
        sizeRef.current = { w: displayWidth, h: displayHeight, dpr };
      }

      // 📌 [컨텍스트 스택 완전 초기화]: 이전 렌더에서 누출된 save() 스택을 한 번에 리셋
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // 📌 [물리 픽셀 완전 클리어]: dpr 스케일 적용 전 물리 캔버스 전체를 완전 소거
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

      const scale = 175 * activeZoom;
      const handSign = hand === 'left' ? -1 : 1;
      const radians = (angleNum * Math.PI) / 180;

      // 📌 픽셀 라운딩 정밀 고정 및 safe activePan 연산으로 도면 증발 100% 차단
      const cx = Math.round(displayWidth / 2 + activePan.x);
      const cy = Math.round(displayHeight * 0.50 + activePan.y);

      // 1. 다크 청사진 배경
      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // 📌 모눈 그리드 (0.5px 초정밀 극세선)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 0.5;
      const gridSize = (1 / 8) * scale;

      if (gridSize > 5) {
        for (let x = cx % gridSize; x < displayWidth; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, displayHeight);
          ctx.stroke();
        }
        for (let y = cy % gridSize; y < displayHeight; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(displayWidth, y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 슬러그 지름 및 반지름 픽셀 수치
      const slugDiameterPx = slugNum * scale;
      const slugRadiusPx = slugDiameterPx / 2;
      const crosshairLengthPx = slugDiameterPx / 1.5;

      const calcOffset1 = ((ovalNum - cutNum1) / 2) * scale;
      const calcOffset2 = ((ovalNum - cutNum2) / 2) * scale;

      const effectiveRadians = radians + (isFlipped180 ? Math.PI : 0);
      const flipSign = isFlipped180 ? -1 : 1;

      // 📌 지공사님 지침 반영: 최대 7개 비트 동적 위치 배열 구성 (180도 회전 시 flipSign 1:1 대칭 합성)
      const bitPositions = [];
      // 1번 (Cut 1)
      bitPositions.push({ x: cx + calcOffset1 * Math.cos(effectiveRadians) * handSign, y: cy + calcOffset1 * Math.sin(effectiveRadians) });
      // 2번 (Cut 2)
      bitPositions.push({ x: cx - calcOffset2 * Math.cos(effectiveRadians) * handSign, y: cy - calcOffset2 * Math.sin(effectiveRadians) });

      if (isDetailedMode) {
        // 3번 (중간비트 1)
        bitPositions.push({
          x: cx - (calcOffset2 / 2) * Math.cos(effectiveRadians) * handSign + (bitCustomOffsets[3]?.x || 0) * scale * flipSign,
          y: cy - (calcOffset2 / 2) * Math.sin(effectiveRadians) + (bitCustomOffsets[3]?.y || 0) * scale * flipSign,
        });
        // 4번 (중간비트 2)
        bitPositions.push({
          x: cx + (calcOffset1 / 2) * Math.cos(effectiveRadians) * handSign + (bitCustomOffsets[4]?.x || 0) * scale * flipSign,
          y: cy + (calcOffset1 / 2) * Math.sin(effectiveRadians) + (bitCustomOffsets[4]?.y || 0) * scale * flipSign,
        });
        // 5번 ~ (totalActiveBits - 1)번: 신규 추가된 드릴비트 (원홀 중심 위치 기본)
        for (let b = 5; b < totalActiveBits; b++) {
          bitPositions.push({
            x: cx + (bitCustomOffsets[b]?.x || 0) * scale * flipSign,
            y: cy + (bitCustomOffsets[b]?.y || 0) * scale * flipSign,
          });
        }
      } else {
        // 3번 ~ (totalActiveBits - 1)번: 신규 추가된 드릴비트 (원홀 중심 위치 기본)
        for (let b = 3; b < totalActiveBits; b++) {
          bitPositions.push({
            x: cx + (bitCustomOffsets[b]?.x || 0) * scale * flipSign,
            y: cy + (bitCustomOffsets[b]?.y || 0) * scale * flipSign,
          });
        }
      }
      // 마스터 원홀 비트 (마지막 인덱스 totalActiveBits)
      bitPositions.push({
        x: cx + (bitCustomOffsets[totalActiveBits]?.x || 0) * scale * flipSign,
        y: cy + (bitCustomOffsets[totalActiveBits]?.y || 0) * scale * flipSign,
      });

      const getBitDiameter = (rowIdx) => {
        if (rowIdx === 1) return cutNum1;
        if (rowIdx === 2) return cutNum2;
        if (rowIdx === totalActiveBits) return holeNum; // 마스터 원홀 사이즈
        if (isDetailedMode) {
          if (rowIdx === 3) return bitCustomSizes[3] ? parseSpanFraction(bitCustomSizes[3]) : (cutNum2 + holeNum) / 2;
          if (rowIdx === 4) return bitCustomSizes[4] ? parseSpanFraction(bitCustomSizes[4]) : (cutNum1 + holeNum) / 2;
          return bitCustomSizes[rowIdx] ? parseSpanFraction(bitCustomSizes[rowIdx]) : cutNum1; // 📌 지공사님 지침: 레프트 오발컷 사이즈 기본
        } else {
          return bitCustomSizes[rowIdx] ? parseSpanFraction(bitCustomSizes[rowIdx]) : cutNum1; // 📌 지공사님 지침: 레프트 오발컷 사이즈 기본
        }
      };

      bitPositions.forEach((pos, idx) => {
        const rowIdx = idx + 1;
        const bitDiameter = getBitDiameter(rowIdx);
        const bitRadiusPx = (bitDiameter / 2) * scale;
        lastBitPositionsRef.current[rowIdx] = { x: pos.x, y: pos.y, r: bitRadiusPx };
      });

      const r1Pos = bitPositions[0];
      const r2Pos = bitPositions[1];

      // 7색 전용 시그니처 컬러 팔레트 (원홀 비트는 항상 마지막 비트로서 Emerald Green #10b981 고정)
      const bitColors = bitPositions.map((_, idx) => {
        const rowIdx = idx + 1;
        if (rowIdx === totalActiveBits) return '#10b981';
        return FULL_PALETTE[idx] || '#a855f7';
      });

      // 📌 [EDIT & PREVIEW 모드 공통 도면 렌더링 가시성]: EDIT 모드에서 선택된 비트 및 active 비트 100% 상시 표출 보전 (터치 시 사라짐 100% 방지)
      const isBitVisibleInCanvas = (rowIdx) => {
        if (isEditMode) {
          if (selectedBitIndex === rowIdx) return true;
          return isBitActiveInChart(rowIdx);
        }
        return isBitVisible(rowIdx);
      };

      // A) 0.5px 백색 십자선 & 1.0px 슬러그 원곽
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.moveTo(cx - crosshairLengthPx, cy);
      ctx.lineTo(cx + crosshairLengthPx, cy);
      ctx.moveTo(cx, cy - crosshairLengthPx);
      ctx.lineTo(cx, cy + crosshairLengthPx);
      ctx.stroke();

      // 📌 [지공사님 지침 100% 반영]: isFlipped180 회전 토글에 맞춰 화살표(▲/▼) 및 "중 약지 방향" 2/3 지점 180° 반전
      const verticalAxisY = isFlipped180 ? cy + crosshairLengthPx : cy - crosshairLengthPx;
      const gap = crosshairLengthPx - slugRadiusPx;
      const target23Y = isFlipped180
        ? cy + (slugRadiusPx + gap * (2 / 3))
        : cy - (slugRadiusPx + gap * (2 / 3));

      // 1) 진행방향 화살표 (▲/▼) - 📌 [지공사님 지침 100% 반영]: 원래 스카이블루(#38bdf8) 복구
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8'; // 원래 스카이블루 선명 화살표
      if (!isFlipped180) {
        // 상향 화살표 (▲) - 점선 상단 끝
        ctx.moveTo(cx, verticalAxisY - 6);
        ctx.lineTo(cx - 5, verticalAxisY + 3);
        ctx.lineTo(cx + 5, verticalAxisY + 3);
      } else {
        // 하향 화살표 (▼) - 점선 하단 끝
        ctx.moveTo(cx, verticalAxisY + 6);
        ctx.lineTo(cx - 5, verticalAxisY - 3);
        ctx.lineTo(cx + 5, verticalAxisY - 3);
      }
      ctx.closePath();
      ctx.fill();

      // 2) "중약지" 텍스트 - 📌 [지공사님 지침 100% 반영]: 원래 색상(#93c5fd) & "중약지" 문구 적용
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('중약지', cx, target23Y);

      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.arc(cx, cy, slugRadiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.restore();

      // 📌 [시뮬레이터 & EDIT 최박선 렌더링]:
      if (isEditMode) {
        // 📌 EDIT 모드: iOS Safari 호환 단일 오프스크린 캔버스 재사용 및 1.0px 백색 외곽선 표출
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offCanvas = offscreenCanvasRef.current;
        if (offCanvas.width !== targetCanvas.width || offCanvas.height !== targetCanvas.height) {
          offCanvas.width = targetCanvas.width;
          offCanvas.height = targetCanvas.height;
        }

        const offCtx = offCanvas.getContext('2d');
        offCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        offCtx.save();
        offCtx.scale(dpr, dpr);

        // Step 1. 활성화된 비트 원들을 오프스크린 캔버스에 면 채우기 (에디트 모드: 1 ~ totalActiveBits 전체 즉시 합성)
        offCtx.fillStyle = '#ffffff';
        bitPositions.forEach((pos, idx) => {
          const rowIdx = idx + 1;
          if (rowIdx > totalActiveBits) return;

          const bitDiameter = getBitDiameter(rowIdx);
          const bitRadiusPx = (bitDiameter / 2) * scale;

          offCtx.beginPath();
          offCtx.arc(pos.x, pos.y, bitRadiusPx, 0, Math.PI * 2);
          offCtx.fill();
        });

        // Step 2. 백색 외곽선 1.6px stroke 생성 (내부 소거 후 0.8px 초정밀 합산 외곽 연결선 보존)
        offCtx.lineWidth = 1.6;
        offCtx.strokeStyle = '#ffffff';
        bitPositions.forEach((pos, idx) => {
          const rowIdx = idx + 1;
          if (rowIdx > totalActiveBits) return;

          const bitDiameter = getBitDiameter(rowIdx);
          const bitRadiusPx = (bitDiameter / 2) * scale;

          offCtx.beginPath();
          offCtx.arc(pos.x, pos.y, bitRadiusPx, 0, Math.PI * 2);
          offCtx.stroke();
        });

        // Step 3. destination-out 모드로 내부 영역 소거 ➔ 오직 전체 비트의 [합산 외곽 연결선]만 남김!
        offCtx.globalCompositeOperation = 'destination-out';
        bitPositions.forEach((pos, idx) => {
          const rowIdx = idx + 1;
          if (rowIdx > totalActiveBits) return;

          const bitDiameter = getBitDiameter(rowIdx);
          const bitRadiusPx = (bitDiameter / 2) * scale;

          offCtx.beginPath();
          offCtx.arc(pos.x, pos.y, bitRadiusPx, 0, Math.PI * 2);
          offCtx.fill();
        });

        offCtx.restore();

        // Step 4. 메인 청사진 위에 선명한 백색 연결선 오버레이 렌더링
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // iOS Safari 좌표 스케일 이탈 100% 차단 1:1 매핑
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 4;
        ctx.drawImage(offCanvas, 0, 0);
        ctx.restore();
      } else if (isCheckFillMode) {
        // 📌 [프리뷰 모드 시뮬레이터]: 순백색 면 채우기 렌더링
        bitPositions.forEach((pos, idx) => {
          const rowIdx = idx + 1;
          if (!isBitVisible(rowIdx)) return;

          const bitDiameter = getBitDiameter(rowIdx);
          const bitRadiusPx = (bitDiameter / 2) * scale;

          ctx.save();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, bitRadiusPx, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.6;
          ctx.stroke();
          ctx.restore();
        });

        // 내부 검은색 십자선 클리핑
        ctx.save();
        ctx.beginPath();
        bitPositions.forEach((pos, idx) => {
          const rowIdx = idx + 1;
          if (!isBitVisible(rowIdx)) return;

          const bitDiameter = getBitDiameter(rowIdx);
          const bitRadiusPx = (bitDiameter / 2) * scale;
          ctx.moveTo(pos.x + bitRadiusPx, pos.y);
          ctx.arc(pos.x, pos.y, bitRadiusPx, 0, Math.PI * 2);
        });
        ctx.clip();

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.moveTo(cx - crosshairLengthPx, cy);
        ctx.lineTo(cx + crosshairLengthPx, cy);
        ctx.moveTo(cx, cy - crosshairLengthPx);
        ctx.lineTo(cx, cy + crosshairLengthPx);
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.arc(cx, cy, slugRadiusPx, 0, Math.PI * 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
      }

      // B) 개별 비트 원선 및 중심점 도트 렌더링 (에디트 모드: 활성화된 1개 비트만 외곽선 표출, 내부 투명)
      bitPositions.forEach((pos, idx) => {
        const rowIdx = idx + 1;
        if (!isBitVisibleInCanvas(rowIdx)) return;

        const bitDiameter = getBitDiameter(rowIdx);
        const bitRadiusPx = (bitDiameter / 2) * scale;
        const isSelected = isEditMode && selectedBitIndex === rowIdx;
        
        // 📌 [지공사님 지침 100% 반영]: 에디트 모드에서는 오직 활성화(선택)된 1개 비트만 외곽선 표출 (비활성 비트는 외곽선 미표출 & 내부 100% 투명)
        const shouldDrawCircleOutline = isEditMode ? isSelected : !isCheckFillMode;

        if (shouldDrawCircleOutline) {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.arc(pos.x, pos.y, bitRadiusPx, 0, Math.PI * 2);
          ctx.strokeStyle = bitColors[idx];
          ctx.lineWidth = 0.5; // 활성화(선택)된 드릴 비트 외곽선 0.5px / #1~#7 모두 0.5px
          if (isSelected) {
            ctx.shadowColor = bitColors[idx];
            ctx.shadowBlur = 6;
          }
          ctx.stroke();

          // 📌 중심점 도트 표출 (선택된 비트 2.0px, 일반 비트 1.5px)
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, isSelected ? 2.0 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = bitColors[idx];
          ctx.fill();
          ctx.restore();
        }
      });

      // C) 0.5px 옥색 각도 사선축선 & 각도 라벨 텍스트 (#06b6d4)
      const rawAngle = (r1Pos && r2Pos && Number.isFinite(r1Pos.x) && Number.isFinite(r2Pos.x) && Number.isFinite(r1Pos.y) && Number.isFinite(r2Pos.y))
        ? Math.atan2(r1Pos.y - r2Pos.y, r1Pos.x - r2Pos.x)
        : 0;
      const actualCutAngle = Number.isFinite(rawAngle) ? rawAngle : 0;

      const absCos = Math.abs(Math.cos(actualCutAngle));
      const absSin = Math.abs(Math.sin(actualCutAngle));
      const rawLineLen = Math.min(
        crosshairLengthPx / (absCos < 0.001 ? 0.001 : absCos),
        crosshairLengthPx / (absSin < 0.001 ? 0.001 : absSin)
      );
      const angleLineLen = Number.isFinite(rawLineLen) ? rawLineLen : crosshairLengthPx;

      const ax1 = cx + angleLineLen * Math.cos(actualCutAngle);
      const ay1 = cy + angleLineLen * Math.sin(actualCutAngle);
      const ax2 = cx - angleLineLen * Math.cos(actualCutAngle);
      const ay2 = cy - angleLineLen * Math.sin(actualCutAngle);

      if (Number.isFinite(ax1) && Number.isFinite(ay1) && Number.isFinite(ax2) && Number.isFinite(ay2)) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(ax2, ay2);
        ctx.lineTo(ax1, ay1);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 0.8; // 옥색 오발 각도 사선 0.8px
        ctx.stroke();
        ctx.restore();
      }

      // ∠ 오발 각도 라벨
      ctx.save();
      ctx.font = 'bold 10px Pretendard, sans-serif';
      ctx.fillStyle = '#06b6d4';

      if (hand === 'left') {
        const labelStr = `∠ 오발 각도: ${angleNum}° (왼손)`;
        ctx.fillText(labelStr, cx + 28, cy - 4);
      } else {
        ctx.translate(cx, cy);
        let textRotAngle = actualCutAngle;

        if (textRotAngle > Math.PI / 2) textRotAngle -= Math.PI;
        if (textRotAngle < -Math.PI / 2) textRotAngle += Math.PI;

        ctx.rotate(textRotAngle);
        const labelStr = `∠ 오발 각도: ${angleNum}° (오른손)`;
        ctx.fillText(labelStr, 28, -4);
      }
      ctx.restore();

      // D-1) 📌 [골드 실제 오발선]: 모든 상황에서 도면 기본 베이스 가이드라인으로 상시 100% 표출 (#fbbf24)
      try {
        const r1Diameter = getBitDiameter(1);
        const R1 = (r1Diameter / 2) * scale;
        const r2Diameter = getBitDiameter(2);
        const R2 = (r2Diameter / 2) * scale;
        const holeRadiusPx = (holeNum / 2) * scale;

        const p1 = r1Pos;
        const p2 = r2Pos;

        if (p1 && p2 && Number.isFinite(p1.x) && Number.isFinite(p2.x) && Number.isFinite(p1.y) && Number.isFinite(p2.y)) {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          const theta = dist > 0.001 ? Math.atan2(dy, dx) : actualCutAngle;
          const uX = Math.cos(theta);
          const uY = Math.sin(theta);
          const vX = -Math.sin(theta);
          const vY = Math.cos(theta);

          // 허리 폭 반경 W (중심 원홀 반경)
          const W = holeRadiusPx > 0 ? holeRadiusPx : ((R1 + R2) / 2);
          const RwX = cx + W * vX;
          const RwY = cy + W * vY;
          const LwX = cx - W * vX;
          const LwY = cy - W * vY;

          // #1번 원호 각도 (상단 apex 기준 +-60도)
          const a1_end = theta + Math.PI / 3;
          const a1_start = theta - Math.PI / 3;
          const ArX = p1.x + R1 * Math.cos(a1_end);
          const ArY = p1.y + R1 * Math.sin(a1_end);
          const AlX = p1.x + R1 * Math.cos(a1_start);
          const AlY = p1.y + R1 * Math.sin(a1_start);

          // #2번 원호 각도 (하단 apex 기준 +-60도)
          const a2_start = theta + (2 * Math.PI) / 3;
          const a2_end = theta + (4 * Math.PI) / 3;
          const BrX = p2.x + R2 * Math.cos(a2_start);
          const BrY = p2.y + R2 * Math.sin(a2_start);
          const BlX = p2.x + R2 * Math.cos(a2_end);
          const BlY = p2.y + R2 * Math.sin(a2_end);

          // 접선 단위 벡터
          const t1rX = -Math.sin(a1_end);
          const t1rY = Math.cos(a1_end);
          const t2rX = -Math.sin(a2_start);
          const t2rY = Math.cos(a2_start);
          const t2lX = -Math.sin(a2_end);
          const t2lY = Math.cos(a2_end);
          const t1lX = -Math.sin(a1_start);
          const t1lY = Math.cos(a1_start);

          const d1 = Math.hypot(RwX - ArX, RwY - ArY) * 0.35;
          const d2 = Math.hypot(BrX - RwX, BrY - RwY) * 0.35;
          const d3 = Math.hypot(LwX - BlX, LwY - BlY) * 0.35;
          const d4 = Math.hypot(AlX - LwX, AlY - LwY) * 0.35;

          ctx.save();
          ctx.beginPath();

          // 1. #1번 상단 원형 호 (좌측 접점 -> 상단 정점 -> 우측 접점)
          ctx.arc(p1.x, p1.y, R1, a1_start, a1_end, false);

          // 2. 우측 상단 곡선 (#1번 우측 접점 -> 우측 허리 Rw)
          ctx.bezierCurveTo(
            ArX + d1 * t1rX,
            ArY + d1 * t1rY,
            RwX + d1 * uX,
            RwY + d1 * uY,
            RwX,
            RwY
          );

          // 3. 우측 하단 곡선 (우측 허리 Rw -> #2번 우측 접점)
          ctx.bezierCurveTo(
            RwX - d2 * uX,
            RwY - d2 * uY,
            BrX - d2 * t2rX,
            BrY - d2 * t2rY,
            BrX,
            BrY
          );

          // 4. #2번 하단 원형 호 (우측 접점 -> 하단 정점 -> 좌측 접점)
          ctx.arc(p2.x, p2.y, R2, a2_start, a2_end, false);

          // 5. 좌측 하단 곡선 (#2번 좌측 접점 -> 좌측 허리 Lw)
          ctx.bezierCurveTo(
            BlX + d3 * t2lX,
            BlY + d3 * t2lY,
            LwX - d3 * uX,
            LwY - d3 * uY,
            LwX,
            LwY
          );

          // 6. 좌측 상단 곡선 (좌측 허리 Lw -> #1번 좌측 접점)
          ctx.bezierCurveTo(
            LwX + d4 * uX,
            LwY + d4 * uY,
            AlX - d4 * t1lX,
            AlY - d4 * t1lY,
            AlX,
            AlY
          );

          ctx.closePath();

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.0;
          ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.restore();
        }
      } catch (err) {
        // Safe fallback guard
      }

      // D-2) 📌 [이론적 오발선]: GUIDE LINE 스위치가 켜졌을 때만 도면 위에 오버레이 표출 (골드/앰버 #fbbf24)
      if (showGuideLine) {
        try {
          const rawDist = (r1Pos && r2Pos && Number.isFinite(r1Pos.x) && Number.isFinite(r2Pos.x) && Number.isFinite(r1Pos.y) && Number.isFinite(r2Pos.y))
            ? Math.hypot(r1Pos.x - r2Pos.x, r1Pos.y - r2Pos.y)
            : 0;
          const distR1R2 = Number.isFinite(rawDist) ? rawDist : 0;
          const rawRx = distR1R2 / 2 + (((cutNum1 + cutNum2) / 4)) * scale;
          const rawRy = (holeNum / 2) * scale;

          const rxPx = (Number.isFinite(rawRx) && rawRx > 0) ? rawRx : 10;
          const ryPx = (Number.isFinite(rawRy) && rawRy > 0) ? rawRy : 10;

          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.ellipse(cx, cy, rxPx, ryPx, actualCutAngle, 0, Math.PI * 2);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 0.6; // 골드 오발 타원선 0.6px
          ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.restore();
        } catch (err) {
          // Safe fallback guard to prevent graphics context crash
        }
      }

      // 📌 [ctx.save() 스택 누출 100% 차단]: 함수 최상단 ctx.save()/ctx.scale(dpr,dpr) 짝 복구
      ctx.restore();
    },
    [holeNum, ovalNum, cutNum1, cutNum2, angleNum, hand, results, getDrillBitValue, holeSize, slugNum, isBitVisible, isBitActiveInChart, isCheckFillMode, showGuideLine, thumbHoleCut, isEditMode, selectedBitIndex, bitCustomOffsets, bitCustomSizes, isFlipped180]
  );

  // 📌 [Direct Canvas GPU Render Trigger]: 클로저 래핑 무관 100% Direct Canvas Drawing 보장
  const requestDirectRender = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(() => {
      if (canvasRef.current && containerRef.current) {
        drawBlueprint(canvasRef.current, containerRef.current, height);
      }
      if (fullScreenCanvasRef.current && fullScreenContainerRef.current) {
        drawBlueprint(fullScreenCanvasRef.current, fullScreenContainerRef.current, window.innerHeight || 800);
      }
    });
  }, [drawBlueprint, height]);

  // 📌 외부 forceFullScreenOpen 변경 감지 ➔ 풀스크린 캔버스 버퍼 리셋 및 GPU 즉시 렌더링 트리거
  useEffect(() => {
    setIsFullScreenModalOpen(forceFullScreenOpen);
    fullCanvasSizeRef.current = { w: 0, h: 0, dpr: 0 };
    if (forceFullScreenOpen) {
      const timer = setTimeout(() => {
        requestDirectRender();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [forceFullScreenOpen, requestDirectRender]);

  // 📌 프리셋 뷰 복귀
  const setInitialOvalView = () => {
    zoomRef.current = fitZoomRef.current;
    panRef.current = { x: 0, y: 0 };
    requestDirectRender();
  };

  // 📌 3회 드릴링 마스터 연동
  const set3CutDrillMode = () => {
    setShowBit1(true);
    setShowBit2(true);
    setShowBit3(false);
    setShowBit4(false);
    setShowBit5(true);
    setIsCheckFillMode(false);
    if (onDetailedModeChange) onDetailedModeChange(false);
    requestDirectRender();
  };

  // 📌 5회 드릴링 마스터 연동
  const set5CutDrillMode = () => {
    setShowBit1(true);
    setShowBit2(true);
    setShowBit3(true);
    setShowBit4(true);
    setShowBit5(true);
    setIsCheckFillMode(false);
    if (onDetailedModeChange) onDetailedModeChange(true);
    requestDirectRender();
  };

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const handleResize = () => requestDirectRender();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [requestDirectRender]);

  const openFullScreenModal = () => {
    fullCanvasSizeRef.current = { w: 0, h: 0, dpr: 0 };
    setIsFullScreenModalOpen(true);
    setTimeout(() => {
      requestDirectRender();
    }, 50);
  };

  const closeFullScreenModal = () => {
    fullCanvasSizeRef.current = { w: 0, h: 0, dpr: 0 };
    setIsFullScreenModalOpen(false);
    if (onCloseFullScreen) onCloseFullScreen();
    setTimeout(() => {
      requestDirectRender();
    }, 50);
  };

  // 📌 [고정밀 1/64" 규격 조정 조작 함수 (0.001초 실시간 100% 즉각 반영)]:
  const handleSizeAdjust = (delta64) => {
    if (!isEditMode || selectedBitIndex === null) return;
    const targetBit = selectedBitIndex;

    // 마스터 원홀 비트는 크기 고정!
    if (targetBit === totalActiveBits) return;

    if (targetBit === 1) {
      const currentStr = ovalCut1 || ovalCut || '31/32';
      const currentFrac = parseSpanFraction(currentStr) || (31 / 32);
      const current64 = Math.round(currentFrac * 64);
      const new64 = Math.max(32, Math.min(64, current64 + delta64));
      const newStr = formatFractionByDenom(new64 / 64, 64);

      if (updateSharedState) {
        updateSharedState({ ovalCut1: newStr, ovalCut: newStr });
      }
    } else if (targetBit === 2) {
      const currentStr = ovalCut2 || ovalCut || ovalCut1 || '31/32';
      const currentFrac = parseSpanFraction(currentStr) || (31 / 32);
      const current64 = Math.round(currentFrac * 64);
      const new64 = Math.max(32, Math.min(64, current64 + delta64));
      const newStr = formatFractionByDenom(new64 / 64, 64);

      if (updateSharedState) {
        updateSharedState({ ovalCut2: newStr });
      }
    } else if (targetBit >= 3 && targetBit < totalActiveBits) {
      const currentStr = bitCustomSizes[targetBit] || (getDrillBitValue ? getDrillBitValue(targetBit) : null) || formatFractionByDenom(cutNum1, 64);
      const currentFrac = parseSpanFraction(currentStr) || cutNum1;
      const current64 = Math.round(currentFrac * 64);
      const new64 = Math.max(32, Math.min(64, current64 + delta64));
      const newStr = formatFractionByDenom(new64 / 64, 64);

      const nextSizes = { ...bitCustomSizes, [targetBit]: newStr };
      setBitCustomSizes(nextSizes);
      notifyRealtimeChange(nextSizes, bitCustomOffsets, extraBitCount);
    }
    requestDirectRender();
  };

  // 📌 [지공사님 핵심 지침 100% 반영]: D-Pad 이동키 화면 visual 시야 방향(▲: 위, ▼: 아래, ◄: 좌, ►: 우) 100% 명확 일치 연동
  const handleMoveDpad = (dir) => {
    if (!isEditMode || selectedBitIndex === null || selectedBitIndex === 1 || selectedBitIndex === 2 || selectedBitIndex === totalActiveBits) return;
    const targetBit = selectedBitIndex;

    const stepInch = 0.005; // 0.005인치 정밀 이동
    const flipSign = isFlipped180 ? -1 : 1;

    const cur = bitCustomOffsets[targetBit] || { x: 0, y: 0 };
    let nx = cur.x;
    let ny = cur.y;

    if (dir === 'left') nx -= stepInch * flipSign;
    if (dir === 'right') nx += stepInch * flipSign;
    if (dir === 'up') ny -= stepInch * flipSign;
    if (dir === 'down') ny += stepInch * flipSign;

    const nextOffsets = {
      ...bitCustomOffsets,
      [targetBit]: { x: nx, y: ny },
    };

    setBitCustomOffsets(nextOffsets);
    notifyRealtimeChange(bitCustomSizes, nextOffsets, extraBitCount);
    requestDirectRender();
  };

  // 📌 D-Pad 자유 드래그 이동 이벤트 핸들러
  const handleDpadPointerDown = (e) => {
    e.stopPropagation();
    isDraggingDpadRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dpadDragStartRef.current = { x: clientX - dpadOffset.x, y: clientY - dpadOffset.y };
  };

  const handleDpadPointerMove = (e) => {
    if (!isDraggingDpadRef.current) return;
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDpadOffset({
      x: clientX - dpadDragStartRef.current.x,
      y: clientY - dpadDragStartRef.current.y,
    });
  };

  const handleDpadPointerUp = () => {
    isDraggingDpadRef.current = false;
  };

  // 📌 캔버스 직접 터치/드래그(비트 대략 이동) & 도면 드래그(Pan) & 휠 줌(Zoom) 안전 핸들러
  const handlePointerDown = (clientX, clientY, targetElement) => {
    if (typeof clientX !== 'number' || isNaN(clientX) || typeof clientY !== 'number' || isNaN(clientY)) return;

    if (!panRef.current || isNaN(panRef.current.x) || isNaN(panRef.current.y)) {
      panRef.current = { x: 0, y: 0 };
    }

    const container = targetElement || (isFullScreenModalOpen ? fullScreenContainerRef.current : containerRef.current);
    if (isEditMode && selectedBitIndex !== null && selectedBitIndex >= 3 && selectedBitIndex < totalActiveBits && container) {
      try {
        const rect = container.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        const targetPos = lastBitPositionsRef.current[selectedBitIndex];
        if (targetPos) {
          const dist = Math.hypot(canvasX - targetPos.x, canvasY - targetPos.y);
          if (dist <= targetPos.r + 35) {
            isDraggingBitRef.current = true;
            bitDragStartRef.current = {
              clientX,
              clientY,
              initialOffset: { ...(bitCustomOffsets[selectedBitIndex] || { x: 0, y: 0 }) },
              targetElement: container,
            };
            return;
          }
        }
      } catch (err) {
        // Safe fallback
      }
    }

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: clientX - (isNaN(panRef.current.x) ? 0 : panRef.current.x),
      y: clientY - (isNaN(panRef.current.y) ? 0 : panRef.current.y),
    };
    requestDirectRender();
  };

  const handlePointerMove = (clientX, clientY) => {
    if (typeof clientX !== 'number' || isNaN(clientX) || typeof clientY !== 'number' || isNaN(clientY)) return;

    if (isDraggingBitRef.current && bitDragStartRef.current && selectedBitIndex !== null) {
      const dxPx = clientX - bitDragStartRef.current.clientX;
      const dyPx = clientY - bitDragStartRef.current.clientY;

      const targetEl = bitDragStartRef.current.targetElement;
      const cWidth = targetEl ? targetEl.clientWidth : 300;
      const currentScale = (cWidth / (slugNum * 3.6)) * (zoomRef.current || 1.08);
      const flipSign = isFlipped180Ref.current ? -1 : 1;

      const dxInch = (dxPx / currentScale) * flipSign;
      const dyInch = (dyPx / currentScale) * flipSign;

      const nextOffsets = {
        ...bitCustomOffsets,
        [selectedBitIndex]: {
          x: (bitDragStartRef.current.initialOffset.x || 0) + dxInch,
          y: (bitDragStartRef.current.initialOffset.y || 0) + dyInch,
        },
      };

      setBitCustomOffsets(nextOffsets);
      notifyRealtimeChange(bitCustomSizes, nextOffsets, extraBitCount);
      requestDirectRender();
      return;
    }

    if (!isDraggingRef.current) return;
    const currentPanX = isNaN(panRef.current.x) ? 0 : panRef.current.x;
    const currentPanY = isNaN(panRef.current.y) ? 0 : panRef.current.y;
    const startX = dragStartRef.current ? dragStartRef.current.x : clientX - currentPanX;
    const startY = dragStartRef.current ? dragStartRef.current.y : clientY - currentPanY;

    const newPanX = clientX - startX;
    const newPanY = clientY - startY;

    if (!isNaN(newPanX) && !isNaN(newPanY)) {
      panRef.current = { x: newPanX, y: newPanY };
      requestDirectRender();
    }
  };

  const handlePointerUp = () => {
    isDraggingBitRef.current = false;
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
  };

  // 📌 [Mobile Multi-Touch Pinch Zoom Firewall Engine]: 모바일 2손가락 핀치 줌 & 0.6x~3.5x 안전 스케일 방화벽
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      isDraggingBitRef.current = false;
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (!isNaN(dist) && dist > 0) {
        touchStartDistRef.current = dist;
        initialPinchZoomRef.current = zoomRef.current || 1.08;
      }
    } else if (e.touches.length === 1) {
      touchStartDistRef.current = null;
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  const handleTouchMove = (e) => {
    if (!e || !e.touches) return;
    if (e.touches.length === 2 && touchStartDistRef.current) {
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (!isNaN(currentDist) && currentDist > 0 && touchStartDistRef.current > 0) {
        const scaleRatio = currentDist / touchStartDistRef.current;
        const baseZoom = initialPinchZoomRef.current || 1.08;
        const newZoom = Math.max(0.6, Math.min(3.5, baseZoom * scaleRatio));
        if (!isNaN(newZoom)) {
          zoomRef.current = newZoom;
          requestDirectRender();
        }
      }
    } else if (e.touches.length === 1 && !touchStartDistRef.current) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e) => {
    if (e && e.touches && e.touches.length < 2) {
      touchStartDistRef.current = null;
    }
    handlePointerUp();
  };

  const handleWheel = (e) => {
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.max(0.6, Math.min(3.5, zoomRef.current * zoomFactor));
    zoomRef.current = newZoom;
    requestDirectRender();
  };

  // 📌 모바일 전용 줌 조절 헬퍼 함수 [ + ] [ - ] [ 1:1 ]
  const handleZoomIn = () => {
    const newZoom = Math.min(3.5, zoomRef.current * 1.15);
    zoomRef.current = newZoom;
    requestDirectRender();
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.6, zoomRef.current * 0.85);
    zoomRef.current = newZoom;
    requestDirectRender();
  };

  const handleResetZoom = () => {
    zoomRef.current = fitZoomRef.current || 1.08;
    panRef.current = { x: 0, y: 0 };
    requestDirectRender();
  };

  // 📌 [지공사님 핵심 지침 100% 완수]: 오발 피치 매트릭스 모달에서 호출 시 인라인 도면 상자는 100% 소거(0% 노출), 오직 풀스크린 포털 모달만 직통 실행!
  if (onlyFullScreenPortal) {
    if (!isFullScreenModalOpen) return null;
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        onTouchStart={(e) => {
          e.stopPropagation();
          handleDpadPointerMove(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          handleDpadPointerUp(e);
        }}
        className="fixed inset-0 z-[100] w-full h-full bg-slate-950 select-none overflow-hidden animate-fade-in"
        style={{ touchAction: 'none' }}
        onMouseMove={handleDpadPointerMove}
        onTouchMove={handleDpadPointerMove}
        onMouseUp={handleDpadPointerUp}
      >
        <div
          ref={fullScreenContainerRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-center overflow-hidden bg-slate-950"
          style={{ touchAction: 'none' }}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY, e.currentTarget)}
          onTouchStart={handleTouchStart}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onTouchMove={handleTouchMove}
          onMouseUp={handlePointerUp}
          onTouchEnd={handleTouchEnd}
          onMouseLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={fullScreenCanvasRef}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            className="absolute inset-0 w-full h-full block"
          />

          {/* 📌 풀스크린 좌상단 툴바: [ PREVIEW / EDIT ] 토글 스위치 + 우측 [ 180° ROTATE ] 회전 버튼 */}
          <div className="absolute top-3 left-3 z-20 flex items-start gap-2 select-none">
            {/* 1) [ PREVIEW ] 컬럼: PREVIEW 버튼 + 그 밑에 [ GUIDE LINE ] 스위치 */}
            <div className="flex flex-col gap-1 items-stretch w-[98px]">
              <button
                type="button"
                onClick={handleSwitchToPreviewMode}
                className={`h-8 w-full px-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
                  !isEditMode
                    ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                    : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                    !isEditMode ? 'scale-110 shadow-[0_0_6px_rgba(34,211,238,0.9)] bg-cyan-400' : 'bg-slate-700'
                  }`}
                />
                <span className="tracking-tight">PREVIEW</span>
              </button>

              {/* 프리뷰 버튼 밑 단일 골드 이론적 오발선 토글 스위치 (활성 램프 탑재) */}
              <div className="flex flex-col gap-1 w-full pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGuideLine((prev) => !prev);
                    requestDirectRender();
                  }}
                  className={`h-8 w-full px-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none whitespace-nowrap ${
                    showGuideLine
                      ? 'bg-slate-800 text-amber-400 border-amber-500/60 shadow-amber-950/30'
                      : 'text-slate-400 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
                  }`}
                  title="이론적 오발 가이드 라인 (골드 타원선) 표시 전환"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                      showGuideLine ? 'scale-110 shadow-[0_0_6px_rgba(251,191,36,0.9)] bg-amber-400' : 'bg-slate-700'
                    }`}
                  />
                  <span className="tracking-tight">GUIDE LINE</span>
                </button>
              </div>
            </div>

            {/* 2) [ EDIT ] 전용 독립 버튼 (활성 램프 탑재) */}
            <button
              type="button"
              onClick={handleSwitchToEditMode}
              className={`h-8 w-[70px] px-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
                isEditMode
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                  : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                  isEditMode ? 'scale-110 shadow-[0_0_6px_rgba(34,211,238,0.9)] bg-cyan-400' : 'bg-slate-700'
                }`}
              />
              <span className="tracking-tight">EDIT</span>
            </button>

            {/* 3) [ ▼ ] 하향 화살표 전용 독립 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetRotation(true);
              }}
              className={`w-8 h-8 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
                isFlipped180
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                  : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
              }`}
            >
              ▼
            </button>

            {/* 4) [ ▲ ] 상향 화살표 전용 독립 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetRotation(false);
              }}
              className={`w-8 h-8 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
                !isFlipped180
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                  : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
              }`}
            >
              ▲
            </button>
          </div>

          {/* 📌 풀스크린 좌측 하단 비트 번호 선택 바 (최대 7개 동적 렌더링) */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-1 select-none">
            {/* ➕ [ + ] 단독 버튼 (지공사님 지침: 7개 도달 시 100% 자동 소거) */}
            {isEditMode && totalActiveBits < 7 && (
              <button
                type="button"
                onClick={handleAddExtraBit}
                className="w-8 h-8 text-sm font-black rounded-xl flex items-center justify-center backdrop-blur-md border shadow-md cursor-pointer transition-all duration-150 border-emerald-500/80 text-emerald-300 bg-slate-900/95 hover:bg-slate-800 hover:text-emerald-200 select-none active:scale-95"
              >
                +
              </button>
            )}

            {/* 1 ~ totalActiveBits 칩 목록 루프 렌더링 */}
            {Array.from({ length: totalActiveBits }).map((_, idx) => {
              const rowIdx = idx + 1;
              const isHoleBit = rowIdx === totalActiveBits;
              const bitValStr = bitCustomSizes[rowIdx] || getDrillBitValue(rowIdx);
              const color = isHoleBit ? '#10b981' : FULL_PALETTE[idx] || '#a855f7';
              const label = isHoleBit ? `#${rowIdx} (원홀)` : `#${rowIdx} (${bitValStr || '규격'})`;
              const isSelected = selectedBitIndex === rowIdx;
              const isActive = isBitActiveInChart(rowIdx);

              return (
                <button
                  key={rowIdx}
                  type="button"
                  onClick={(e) => handleSelectBitChip(e, rowIdx)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleChipTouchStart(rowIdx);
                  }}
                  onMouseUp={handleChipTouchEnd}
                  onMouseLeave={handleChipTouchEnd}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleChipTouchStart(rowIdx);
                  }}
                  onTouchEnd={handleChipTouchEnd}
                  className={`w-[140px] h-8 flex items-center justify-between px-2.5 rounded-xl backdrop-blur-md border shadow-md cursor-pointer transition-all duration-150 text-[11px] sm:text-xs font-bold ${
                    isEditMode
                      ? isSelected
                        ? 'bg-slate-900/95 text-white border-cyan-400 ring-1 ring-cyan-400/60 font-black scale-105 opacity-100 shadow-cyan-950/40'
                        : 'bg-slate-950/90 text-slate-500 border-slate-800/80 opacity-40 hover:opacity-80'
                      : isActive
                      ? 'bg-slate-900/80 text-slate-200 border-slate-700/80'
                      : 'bg-slate-950/80 text-slate-500 border-slate-800/80 opacity-50'
                  }`}
                  title={isEditMode && rowIdx >= baseBitsCount && rowIdx < totalActiveBits ? '클릭 시 선택, 길게 누르면 비트 삭제 가능' : `#${rowIdx} 비트 선택/해제`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: (!isEditMode && isActive) || (isEditMode && isSelected) ? color : '#475569' }} />
                    <span className="truncate">{label}</span>
                  </div>
                </button>
              );
            })}

            {/* ⚪ 시뮬레이터 칩 (지공사님 지침 100% 반영: EDIT 모드 시 시뮬레이터 버튼 전면 소거) */}
            {!isEditMode && (
              <button
                type="button"
                onClick={() => {
                  setIsCheckFillMode((prev) => !prev);
                  requestDirectRender();
                }}
                className={`w-[130px] h-8 flex items-center justify-between px-2.5 rounded-xl backdrop-blur-md border shadow-md cursor-pointer transition-all duration-150 text-[11px] sm:text-xs font-bold ${
                  isCheckFillMode
                    ? 'bg-slate-900/95 text-white border-white/90 ring-1 ring-white/60 shadow-white/20 font-black opacity-100'
                    : 'bg-slate-950/80 text-slate-400 border-slate-700/80 hover:border-slate-600 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCheckFillMode ? 'bg-white ring-1 ring-white/60' : 'bg-slate-600'}`} />
                  <span className="truncate">시뮬레이터</span>
                </div>
              </button>
            )}
          </div>

          {/* 📌 풀스크린 우측 하단 D-Pad 패널 (길게 클릭하여 자유 드래그 이동 가능 수술) */}
          {isEditMode && (
            <div
              style={{ transform: `translate(${dpadOffset.x}px, ${dpadOffset.y}px)` }}
              onMouseDown={handleDpadPointerDown}
              onTouchStart={handleDpadPointerDown}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-md shadow-2xl animate-fade-in select-none cursor-move active:scale-98"
              title="롱 프레스(길게 클릭/터치)하여 원하는 위치로 자유 드래그 이동 가능"
            >
              {/* 1) [ 좌측 배치 ]: 규격 수치 조절 */}
              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  disabled={isSelectedBitSizeDisabled}
                  onClick={(e) => { e.stopPropagation(); handleSizeAdjust(1); }}
                  className={`w-8 h-7 rounded-md text-xs font-black transition-all flex items-center justify-center border ${
                    isSelectedBitSizeDisabled
                      ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                      : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border-cyan-500/40 active:scale-95 cursor-pointer'
                  }`}
                >
                  +
                </button>
                <button
                  type="button"
                  disabled={isSelectedBitSizeDisabled}
                  onClick={(e) => { e.stopPropagation(); handleSizeAdjust(-1); }}
                  className={`w-8 h-7 rounded-md text-xs font-black transition-all flex items-center justify-center border ${
                    isSelectedBitSizeDisabled
                      ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                      : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border-cyan-500/40 active:scale-95 cursor-pointer'
                  }`}
                >
                  -
                </button>
              </div>

              {/* 2) [ 우측 배치 ]: D-Pad 상하좌우 이동 */}
              <div className="flex items-center space-x-1 border-l border-slate-700/70 pl-2">
                <button
                  type="button"
                  disabled={isSelectedBitHorizDisabled}
                  onClick={(e) => { e.stopPropagation(); handleMoveDpad('left'); }}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                    isSelectedBitHorizDisabled
                      ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                      : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                  }`}
                >
                  ◀
                </button>
                <div className="flex flex-col space-y-0.5">
                  <button
                    type="button"
                    disabled={isSelectedBitMoveDisabled}
                    onClick={(e) => { e.stopPropagation(); handleMoveDpad('up'); }}
                    className={`w-8 h-7 rounded-md text-[10px] font-black transition-all flex items-center justify-center border ${
                      isSelectedBitMoveDisabled
                        ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                        : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                    }`}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={isSelectedBitMoveDisabled}
                    onClick={() => handleMoveDpad('down')}
                    className={`w-8 h-7 rounded-md text-[10px] font-black transition-all flex items-center justify-center border ${
                      isSelectedBitMoveDisabled
                        ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                        : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                    }`}
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isSelectedBitHorizDisabled}
                  onClick={() => handleMoveDpad('right')}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                    isSelectedBitHorizDisabled
                      ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                      : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                  }`}
                >
                  ▶
                </button>
              </div>
            </div>
          )}

          {/* 📌 우측 상단 마스터 컨트롤 세트: [ ◎ ] [ ✕ ] ([ 💾 ] 저장 버튼 전면 소거 & [ ✕ ] 직통 닫기!) */}
          <div className="absolute top-3 right-3 flex items-center space-x-2 z-20 select-none">
            {/* 1) [ ◎ ] 첫 화면 오발 뷰 버튼 */}
            <button
              type="button"
              onClick={setInitialOvalView}
              className="w-8 h-8 text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/70 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md"
              title="첫 화면 오발 정밀 뷰로 복귀"
            >
              ◎
            </button>

            {/* 2) [ ✕ ] 풀스크린 닫기 버튼 (모든 변경 0.001초 실시간 저장 상태 ➔ 팝업 없이 즉시 직통 닫기 실행!) */}
            <button
              type="button"
              onClick={closeFullScreenModal}
              className="w-8 h-8 text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/70 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md active:scale-95"
              title="전면 풀스크린 도면 즉시 닫기"
            >
              ✕
            </button>
          </div>

          {/* 📌 드릴 비트 롱프레스 삭제 확정 경고 자체 모달 */}
          {bitToDelete !== null && (
            <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
              <div className="bg-slate-900 border border-rose-500/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-center ring-1 ring-rose-500/30">
                <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold shadow-lg">
                  🗑️
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">#{bitToDelete} 드릴 비트 삭제</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    선택한 #{bitToDelete} 드릴 비트를 삭제하시겠습니까?<br />
                    삭제 시 비트 번호가 자동 재정렬되며 메트릭스 수치표에 1:1 즉각 반영됩니다.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBitToDelete(null)}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteBit}
                    className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* 📌 1:1 완벽 정사각형 aspect-square 캔버스 뷰포트 & 좌측 비트 선택 바 */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square cursor-grab active:cursor-grabbing touch-none flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-2xl"
        style={{ touchAction: 'none' }}
        onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY, e.currentTarget)}
        onTouchStart={handleTouchStart}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onTouchMove={handleTouchMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handleTouchEnd}
        onMouseLeave={handlePointerUp}
        onWheel={handleWheel}
      >

        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          className="absolute inset-0 w-full h-full block"
        />

        {/* 📌 인라인 좌상단 툴바: [ PREVIEW / EDIT ] 토글 스위치 + 우측 [ 180° ROTATE ] 회전 버튼 */}
        <div className="absolute top-3 left-3 z-20 flex items-start gap-2 select-none">
          {/* 1) [ PREVIEW ] 컬럼: PREVIEW 버튼 + 그 밑에 [ GUIDE LINE ] 스위치 */}
          <div className="flex flex-col gap-1 items-stretch w-[98px]">
            <button
              type="button"
              onClick={handleSwitchToPreviewMode}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={`h-8 w-full px-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
                !isEditMode
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                  : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
              }`}
              title="PREVIEW 고정 모드. 클릭 시 PREVIEW 모드로 전환"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                  !isEditMode ? 'scale-110 shadow-[0_0_6px_rgba(34,211,238,0.9)] bg-cyan-400' : 'bg-slate-700'
                }`}
              />
              <span className="tracking-tight">PREVIEW</span>
            </button>

            {/* 프리뷰 버튼 밑 단일 골드 이론적 오발선 토글 스위치 (활성 램프 탑재) */}
            <div className="flex flex-col gap-1 w-full pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGuideLine((prev) => !prev);
                  requestDirectRender();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className={`h-8 w-full px-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none whitespace-nowrap ${
                  showGuideLine
                    ? 'bg-slate-800 text-amber-400 border-amber-500/60 shadow-amber-950/30'
                    : 'text-slate-400 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
                }`}
                title="이론적 오발 가이드 라인 (골드 타원선) 표시 전환"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                    showGuideLine ? 'scale-110 shadow-[0_0_6px_rgba(251,191,36,0.9)] bg-amber-400' : 'bg-slate-700'
                  }`}
                />
                <span className="tracking-tight">GUIDE LINE</span>
              </button>
            </div>
          </div>

          {/* 2) [ EDIT ] 전용 독립 버튼 (활성 램프 탑재) */}
          <button
            type="button"
            onClick={handleSwitchToEditMode}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`h-8 w-[70px] px-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
              isEditMode
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
            }`}
            title="EDIT 모드 가동 (단일 비트 선택 및 D-Pad 조작 가능). 클릭 시 EDIT 모드로 전환"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150 ${
                isEditMode ? 'scale-110 shadow-[0_0_6px_rgba(34,211,238,0.9)] bg-cyan-400' : 'bg-slate-700'
              }`}
            />
            <span className="tracking-tight">EDIT</span>
          </button>

          {/* 📌 [ ▼ ] 하향 화살표 전용 독립 버튼 (기본 지정: 3번 버튼과 100% 색상 및 반응 동일) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetRotation(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`w-8 h-8 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
              isFlipped180
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
            }`}
            title="기본 뷰 (하향 화살표 ▼ - 중약지 아래 방향 기본)"
          >
            ▼
          </button>

          {/* 📌 [ ▲ ] 상향 화살표 전용 독립 버튼 (3번 버튼과 100% 색상 및 반응 동일) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetRotation(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`w-8 h-8 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md border select-none ${
              !isFlipped180
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/60'
                : 'text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70'
            }`}
            title="180° 반전 뷰 (상향 화살표 ▲)"
          >
            ▲
          </button>
        </div>

        {/* 📌 [지공사님 핵심 지침 100% 완수]: 비트 선택 버튼 [ 좌측 하단 ] 배치 (최대 7개 동적 렌더링) */}
        <div className="absolute bottom-3 left-3 z-20 flex flex-col items-start gap-1 select-none">
          {/* ➕ [ + ] 단독 버튼 (7개 도달 시 100% 자동 소거) */}
          {isEditMode && totalActiveBits < 7 && (
            <button
              type="button"
              onClick={handleAddExtraBit}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-8 h-8 text-sm font-black rounded-xl flex items-center justify-center backdrop-blur-md border shadow-md cursor-pointer transition-all duration-150 border-emerald-500/80 text-emerald-300 bg-slate-900/95 hover:bg-slate-800 hover:text-emerald-200 select-none active:scale-95"
              title="신규 드릴 비트 추가 (최대 7개까지 가능)"
            >
              +
            </button>
          )}

          {/* 1 ~ totalActiveBits 칩 목록 루프 렌더링 */}
          {Array.from({ length: totalActiveBits }).map((_, idx) => {
            const rowIdx = idx + 1;
            const isHoleBit = rowIdx === totalActiveBits;
            const bitValStr = bitCustomSizes[rowIdx] || getDrillBitValue(rowIdx);
            const color = isHoleBit ? '#10b981' : FULL_PALETTE[idx] || '#a855f7';
            const label = isHoleBit ? `#${rowIdx} (원홀)` : `#${rowIdx} (${bitValStr || '규격'})`;
            const isSelected = selectedBitIndex === rowIdx;
            const isActive = isBitActiveInChart(rowIdx);

            return (
              <button
                key={rowIdx}
                type="button"
                onClick={(e) => handleSelectBitChip(e, rowIdx)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleChipTouchStart(rowIdx);
                }}
                onMouseUp={handleChipTouchEnd}
                onMouseLeave={handleChipTouchEnd}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleChipTouchStart(rowIdx);
                }}
                onTouchEnd={handleChipTouchEnd}
                className={`w-[125px] sm:w-[140px] h-7 flex items-center justify-between px-2 rounded-xl backdrop-blur-md border shadow-md cursor-pointer transition-all duration-150 text-[10px] sm:text-xs font-bold ${
                  isEditMode
                    ? isSelected
                      ? 'bg-slate-900/95 text-white border-cyan-400 ring-1 ring-cyan-400/60 font-black scale-105 opacity-100 shadow-cyan-950/40'
                      : 'bg-slate-950/90 text-slate-500 border-slate-800/80 opacity-40 hover:opacity-80'
                    : isActive
                    ? 'bg-slate-900/80 text-slate-200 border-slate-700/80'
                    : 'bg-slate-950/80 text-slate-500 border-slate-800/80 opacity-50'
                }`}
                title={isEditMode && rowIdx >= baseBitsCount && rowIdx < totalActiveBits ? '클릭 시 선택, 길게 누르면 비트 삭제 가능' : `#${rowIdx} 비트 선택/해제`}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (!isEditMode && isActive) || (isEditMode && isSelected) ? color : '#475569' }} />
                  <span className="truncate">{label}</span>
                </div>
              </button>
            );
          })}

          {/* ⚪ 시뮬레이터 칩 (지공사님 지침 100% 반영: EDIT 모드 시 시뮬레이터 버튼 전면 소거) */}
          {!isEditMode && (
            <button
              type="button"
              onClick={() => {
                setIsCheckFillMode((prev) => !prev);
                requestDirectRender();
              }}
              className={`w-[115px] sm:w-[130px] h-7 flex items-center justify-between px-2 rounded-xl backdrop-blur-md border shadow-md cursor-pointer transition-all duration-150 text-[10px] sm:text-xs font-bold ${
                isCheckFillMode
                  ? 'bg-slate-900/95 text-white border-white/90 ring-1 ring-white/60 shadow-white/20 font-black opacity-100'
                  : 'bg-slate-950/80 text-slate-400 border-slate-700/80 hover:border-slate-600 opacity-60'
              }`}
              title="시뮬레이터 (단일 통합 외곽 윤곽선 표출)"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isCheckFillMode ? 'bg-white ring-1 ring-white/60' : 'bg-slate-600'}`} />
                <span className="truncate">시뮬레이터</span>
              </div>
            </button>
          )}
        </div>

        {/* 📌 컨트롤 보드 우측 하단 배치 (길게 클릭하여 자유 드래그 이동 가능 수술) */}
        {isEditMode && (
          <div
            style={{ transform: `translate(${dpadOffset.x}px, ${dpadOffset.y}px)` }}
            onMouseDown={handleDpadPointerDown}
            onTouchStart={handleDpadPointerDown}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-md shadow-2xl animate-fade-in select-none cursor-move active:scale-98"
            title="롱 프레스(길게 클릭/터치)하여 원하는 위치로 자유 드래그 이동 가능"
          >
            {/* 1) [ 좌측 배치 ]: 규격 수치 조절 */}
            <div className="flex flex-col space-y-0.5">
              <button
                type="button"
                disabled={isSelectedBitSizeDisabled}
                onClick={() => handleSizeAdjust(1)}
                className={`w-7 h-6 rounded-md text-xs font-black transition-all flex items-center justify-center border ${
                  isSelectedBitSizeDisabled
                    ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                    : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border-cyan-500/40 active:scale-95 cursor-pointer'
                }`}
                title="드릴 비트 규격 1/64인치 확대 (+)"
              >
                +
              </button>
              <button
                type="button"
                disabled={isSelectedBitSizeDisabled}
                onClick={() => handleSizeAdjust(-1)}
                className={`w-7 h-6 rounded-md text-xs font-black transition-all flex items-center justify-center border ${
                  isSelectedBitSizeDisabled
                    ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                    : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border-cyan-500/40 active:scale-95 cursor-pointer'
                }`}
                title="드릴 비트 규격 1/64인치 축소 (-)"
              >
                -
              </button>
            </div>

            {/* 2) [ 우측 배치 ]: D-Pad 상하좌우 이동 버튼 세트 (비활성화 시 border-transparent 스텔스 처리) */}
            <div className="flex items-center space-x-1 border-l border-slate-700/70 pl-2">
              <button
                type="button"
                disabled={isSelectedBitHorizDisabled}
                onClick={() => handleMoveDpad('left')}
                className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                  isSelectedBitHorizDisabled
                    ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                    : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                }`}
                title={
                  selectedBitIndex === 1 || selectedBitIndex === 2
                    ? '1번, 2번 비트는 크기 조정만 가능하며 위치 이동 키패드가 잠겨있습니다'
                    : '좌측으로 정밀 이동'
                }
              >
                ◀
              </button>

              <div className="flex flex-col space-y-0.5">
                <button
                  type="button"
                  disabled={isSelectedBitMoveDisabled}
                  onClick={() => handleMoveDpad('up')}
                  className={`w-7 h-6 rounded-md text-[10px] font-black transition-all flex items-center justify-center border ${
                    isSelectedBitMoveDisabled
                      ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                      : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                  }`}
                  title={
                    selectedBitIndex === 1 || selectedBitIndex === 2
                      ? '1번, 2번 비트는 크기 조정만 가능하며 위치 이동 키패드가 잠겨있습니다'
                      : '상단으로 정밀 이동'
                  }
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={isSelectedBitMoveDisabled}
                  onClick={() => handleMoveDpad('down')}
                  className={`w-7 h-6 rounded-md text-[10px] font-black transition-all flex items-center justify-center border ${
                    isSelectedBitMoveDisabled
                      ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                      : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                  }`}
                  title={
                    selectedBitIndex === 1 || selectedBitIndex === 2
                      ? '1번, 2번 비트는 크기 조정만 가능하며 위치 이동 키패드가 잠겨있습니다'
                      : '하단으로 정밀 이동'
                  }
                >
                  ▼
                </button>
              </div>

              <button
                type="button"
                disabled={isSelectedBitHorizDisabled}
                onClick={() => handleMoveDpad('right')}
                className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center border ${
                  isSelectedBitHorizDisabled
                    ? 'bg-slate-950/40 text-slate-700 border-transparent cursor-not-allowed'
                    : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-500/40 active:scale-95 cursor-pointer'
                }`}
                title={
                  selectedBitIndex === 1 || selectedBitIndex === 2
                    ? '#1, #2 비트는 크기 조정만 가능하며 위치 이동 키패드가 잠겨있습니다'
                    : '우측으로 정밀 이동'
                }
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* 도면 캔버스 내 우측 상단 ⛶ 글래스모피즘 플로팅 버튼 */}
        <button
          type="button"
          onClick={openFullScreenModal}
          className="absolute top-3 right-3 w-8 h-8 text-xs font-bold text-slate-200 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md z-10"
          title="전면 풀스크린 도면 열기"
        >
          ⛶
        </button>
        {/* 📌 우측 상단 마스터 컨트롤 세트: [ ◎ ] [ 💾 ] [ ⤢ ] (박스 및 [3],[5] 버튼 전면 삭제!) */}
        <div className="absolute top-3 right-3 flex items-center space-x-2 z-20 select-none">
          {/* 1) [ ◎ ] 첫 화면 오발 뷰 버튼 */}
          <button
            type="button"
            onClick={setInitialOvalView}
            className="w-8 h-8 text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/70 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md"
            title="첫 화면 오발 정밀 뷰로 복귀"
          >
            ◎
          </button>

          {/* 2) [ 💾 ] 저장 및 매트릭스 수치표 1:1 즉시 반영 버튼 */}
          <button
            type="button"
            onClick={handleApproveSave}
            className="w-8 h-8 text-xs font-bold text-emerald-400 bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-500/60 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md active:scale-95"
            title="도면 수치 연산 및 피치 매트릭스 수치표 1:1 저장 반영"
          >
            💾
          </button>

          {/* 3) [ ⤢ ] 풀스크린 열기 버튼 */}
          <button
            type="button"
            onClick={openFullScreenModal}
            className="w-8 h-8 text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/70 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-md backdrop-blur-md active:scale-95"
            title="전면 풀스크린 확대 뷰 열기"
          >
            ⤢
          </button>
        </div>
      </div>
    </div>
  );
}
