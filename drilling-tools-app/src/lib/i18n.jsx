import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LANG_STORAGE_KEY = 'prodrill_toolkit_lang';

export const translations = {
  ko: {
    // 헤더 & 탭
    appTitle: 'ProDrill Tools',
    reset: '초기화',
    archive: '아카이브',
    spanTab: '스판 변환기',
    markingTab: '마킹',
    ovalTab: '오발 계산기',
    handLabel: '손방향',
    rightHand: '오른손',
    leftHand: '왼손',
    resetValues: '수치 초기화',

    // 스판 변환기
    fromSpanType: '현재 스판 타입 (From)',
    toSpanType: '목표 스판 타입 (To)',
    fingerHoleSpecs: '손가락 홀 규격',
    middleSpan: '중지 스판',
    ringSpan: '약지 스판',
    holeCut: '홀컷',
    insert: '인서트',
    bridge: '브릿지',
    bridgeDirect: '직접입력',
    thumbSpecs: '엄지 제원',
    slugHoleCut: '슬러그 홀컷',
    holeSize: '원홀 크기',
    ovalSize: '오발 크기',
    ovalCut1: '오발컷 #1',
    ovalCut2: '오발컷 #2',
    ovalAngle: '오발 각도',
    angleShort: '각도',
    convertSpanBtn: '스판 변환',

    // 오발 계산기
    thumbPitch: '엄지 피치',
    horizPitch: '수평 피치',
    vertPitch: '수직 피치',
    leftDir: '좌 (Left)',
    rightDir: '우 (Right)',
    reverseDir: '리버스 (Rev)',
    forwardDir: '포워드 (Fwd)',
    holeOvalCutSpecs: '원홀/오발/오발컷 제원',
    calculateOvalBtn: '오발 계산',
    recBadge: '추천',

    // 오발 결과 모달
    reSetBtn: 'RE SET',
    simulatorBtn: '시뮬레이터',
    precisionLabel: '정밀도',
    modeBasic: '기본 (3)',
    modeDetailed: '정밀 (5)',
    modeUltra: '초정밀 (7)',
    correctionLabel: '보정',
    correctionNone: '0 (보정 없음)',
    drillBitHeader: '드릴 비트',
    horizPitchHeader: '수평 피치',
    vertPitchHeader: '수직 피치',
    masterHoleBit: '원홀',
    confirmBtn: '확인',
    saveArchiveBtn: '아카이브 저장',
    shareBtn: '공유',
    underDrillingWarning: '가공 이동거리 대비 드릴 수가 부족합니다',

    // 스판 결과 모달
    denom16: '16분',
    denom32: '32분',
    denomHalf16: '.5/16분',
    ovalMissingNotice: '오발 지공 여부 확인해 주세요',
    markingGuideBtn: '마킹 가이드',

    // 마킹 결과 모달
    midlineToThumb: '미드라인 ↔ 엄지',
    thumbToMiddle: '엄지 ↔ 중지',
    thumbToRing: '엄지 ↔ 약지',
    centerlineToMiddle: '센터라인 ↔ 중지',
    middleToRing: '중지 ↔ 약지',
    midlineToThumbCC: '미드라인 ↔ 엄지홀 중심',
    thumbToMiddleCC: '엄지홀 중심 ↔ 중지홀 중심',
    thumbToRingCC: '엄지홀 중심 ↔ 약지홀 중심',
    centerlineToMiddleCC: '센터라인 ↔ 중지홀 중심',
    middleToRingCC: '중지홀 중심 ↔ 약지홀 중심',
    midlineToMiddleCenter: '미드라인 ↔ 중지홀 중심',
    middleCenterToRingCenter: '중지홀 중심 ↔ 약지홀 중심',

    // 도면 시뮬레이터
    previewMode: 'PREVIEW',
    editMode: 'EDIT',
    guideOval: '가이드오발',
    realSizeBtn: '실사이즈 보기',
    closeBtn: '닫기',
    addBitBtn: '비트 추가',
    deleteBitBtn: '비트 삭제',
    deleteBitConfirmTitle: '드릴 비트 삭제',
    deleteBitConfirmDesc: '선택한 드릴 비트를 삭제하시겠습니까?',
    cancelBtn: '취소',
    deleteBtn: '삭제',
  },
  en: {
    // Header & Tabs
    appTitle: 'ProDrill Tools',
    reset: 'Reset',
    archive: 'Archive',
    spanTab: 'Span Converter',
    markingTab: 'Marking',
    ovalTab: 'Oval Calculator',
    handLabel: 'Hand',
    rightHand: 'Right',
    leftHand: 'Left',
    resetValues: 'Reset Values',

    // Span Converter
    fromSpanType: 'Current Span Type (From)',
    toSpanType: 'Target Span Type (To)',
    fingerHoleSpecs: 'Finger Hole Specs',
    middleSpan: 'Middle Span',
    ringSpan: 'Ring Span',
    holeCut: 'Hole Cut',
    insert: 'Insert',
    bridge: 'Bridge',
    bridgeDirect: 'Custom',
    thumbSpecs: 'Thumb Specs',
    slugHoleCut: 'Slug Hole Cut',
    holeSize: 'Hole Size',
    ovalSize: 'Oval Size',
    ovalCut1: 'Oval Cut #1',
    ovalCut2: 'Oval Cut #2',
    ovalAngle: 'Oval Angle',
    angleShort: 'Angle',
    convertSpanBtn: 'Convert Span',

    // Oval Calculator
    thumbPitch: 'Thumb Pitch',
    horizPitch: 'Horiz Pitch',
    vertPitch: 'Vert Pitch',
    leftDir: 'Left (L)',
    rightDir: 'Right (R)',
    reverseDir: 'Reverse (Rev)',
    forwardDir: 'Forward (Fwd)',
    holeOvalCutSpecs: 'Hole / Oval / Cut Specs',
    calculateOvalBtn: 'Calculate Oval',
    recBadge: 'Rec',

    // Oval Result Modal
    reSetBtn: 'RE SET',
    simulatorBtn: 'Simulator',
    precisionLabel: 'Precision',
    modeBasic: 'Basic (3)',
    modeDetailed: 'Detailed (5)',
    modeUltra: 'Ultra (7)',
    correctionLabel: 'Offset',
    correctionNone: '0 (No Offset)',
    drillBitHeader: 'Drill Bit',
    horizPitchHeader: 'Horiz Pitch',
    vertPitchHeader: 'Vert Pitch',
    masterHoleBit: 'Hole',
    confirmBtn: 'Confirm',
    saveArchiveBtn: 'Save',
    shareBtn: 'Share',
    underDrillingWarning: 'More drilling bits recommended for this cut size',

    // Span Result Modal
    denom16: '16th',
    denom32: '32th',
    denomHalf16: '.5/16th',
    ovalMissingNotice: 'Please check oval drilling status',
    markingGuideBtn: 'Marking Guide',

    // Marking Result Modal
    midlineToThumb: 'Midline ↔ Thumb',
    thumbToMiddle: 'Thumb ↔ Middle',
    thumbToRing: 'Thumb ↔ Ring',
    centerlineToMiddle: 'Centerline ↔ Middle',
    middleToRing: 'Middle ↔ Ring',
    midlineToThumbCC: 'Midline ↔ Thumb Hole Center',
    thumbToMiddleCC: 'Thumb Hole Center ↔ Middle Hole Center',
    thumbToRingCC: 'Thumb Hole Center ↔ Ring Hole Center',
    centerlineToMiddleCC: 'Centerline ↔ Middle Hole Center',
    middleToRingCC: 'Middle Hole Center ↔ Ring Hole Center',
    midlineToMiddleCenter: 'Midline ↔ Middle Hole Center',
    middleCenterToRingCenter: 'Middle Hole Center ↔ Ring Hole Center',

    // 2D Drawing Simulator
    previewMode: 'PREVIEW',
    editMode: 'EDIT',
    guideOval: 'Guide Oval',
    realSizeBtn: 'Real Size (1:1)',
    closeBtn: 'Close',
    addBitBtn: 'Add Bit',
    deleteBitBtn: 'Delete Bit',
    deleteBitConfirmTitle: 'Delete Drill Bit',
    deleteBitConfirmDesc: 'Are you sure you want to delete this drill bit?',
    cancelBtn: 'Cancel',
    deleteBtn: 'Delete',
  }
};

export function getInitialLanguage() {
  return 'ko';
}

const I18nContext = createContext({
  lang: 'ko',
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLanguage);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'ko' ? 'en' : 'ko'));
  }, [setLang]);

  const t = useCallback(
    (key) => {
      const dict = translations[lang] || translations.ko;
      return dict[key] || translations.ko[key] || key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
