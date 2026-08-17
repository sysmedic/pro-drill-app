/* global process */
/**
 * 정적 볼링공 DB 로컬 검색 및 캐싱 서비스
 */
import seedBowlingBalls from '../../public/data/bowling_balls.json' with { type: 'json' };

const LOCAL_STORAGE_KEY = 'prodrill_bowling_balls_db_v1';
const MIGRATION_FLAG_KEY = 'prodrill_clean_zero_db_v4_reset_flag';
let memoryDbCache = null;

/**
 * 로컬 DB 전면 완전 청소 및 유저 직접 입력 제원 우선 로더
 * @returns {Promise<import('../types/bowlingBall').BowlingBall[]>}
 */
const APPROVED_BALLS_CACHE_KEY = 'prodrill_approved_balls_cache_v1';
const APPROVED_BALLS_TS_KEY = 'prodrill_approved_balls_ts_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간 로컬 캐싱 (과도한 쿼리/과금 100% 차단)

export async function loadBowlingBallDb() {
  // 🔄 기존 오염된 로컬 캐시 100% 강제 폐기 및 완전 청소 마이그레이션
  try {
    const isAlreadyCleaned = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (!isAlreadyCleaned) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.setItem(MIGRATION_FLAG_KEY, new Date().toISOString());
    }
  } catch { /* 예외 무시 */ }

  if (memoryDbCache) {
    return memoryDbCache;
  }

  // 1순위: 번들된 팩트 DB 시드 데이터 기본 로드
  let baseList = [];
  if (Array.isArray(seedBowlingBalls) && seedBowlingBalls.length > 0) {
    baseList = [...seedBowlingBalls];
  }

  // 2순위: LocalStorage 오버라이드 캐시 확인 및 병합
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const idMap = new Map();
        baseList.forEach(b => idMap.set(b.id, b));
        parsed.forEach(b => idMap.set(b.id, b));
        baseList = Array.from(idMap.values());
      }
    }
  } catch { /* 예외 무시 */ }

  memoryDbCache = baseList;

  // 3순위: 🛡️ 파이어베이스 실시간 승인 DB 동기화 (24시간 로컬 캐싱 안전 장치 적용)
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (!isTestEnv && typeof window !== 'undefined') {
    (async () => {
      try {
        const lastFetchMs = parseInt(localStorage.getItem(APPROVED_BALLS_TS_KEY) || '0');
        const nowMs = new Date().getTime();
        const cachedApproved = localStorage.getItem(APPROVED_BALLS_CACHE_KEY);

        // 24시간 이내라면 로컬 캐시만 활용하여 Firestore 쿼리를 단 1건도 보내지 않음 (0원 0쿼리 보장)
        if (cachedApproved && (nowMs - lastFetchMs < CACHE_TTL_MS)) {
          const approvedList = JSON.parse(cachedApproved);
          if (Array.isArray(approvedList) && approvedList.length > 0) {
            const idMap = new Map();
            (memoryDbCache || []).forEach(b => idMap.set(b.id, b));
            approvedList.forEach(b => idMap.set(b.id, b));
            memoryDbCache = Array.from(idMap.values());
          }
          return;
        }

        // 24시간 경과 시에만 파이어베이스 SDK 읽기 수행 후 24시간 로컬 보관 (403 오류 100% 예방)
        const { collection, getDocs } = await import('firebase/firestore');
        const { licenseDb } = await import('./licenseFirebase.js');
        
        const sharedRef = collection(licenseDb, 'shared_bowling_balls');
        const snap = await getDocs(sharedRef).catch(() => null);

        if (snap && !snap.empty) {
          const fetchedApproved = [];
          snap.forEach(docSnap => {
            const data = docSnap.data() || {};
            if (data.status === 'approved' || data.source === 'user_direct_input_verified') {
              const ballName = data.ballName || data.model_name_kr || data.version_name || '승인 공';
              const weightStr = data.weight || '15lb';
              const weightNum = String(weightStr).replace(/[^0-9]/g, '') || '15';
              const weightKey = `${weightNum}lb`;

              fetchedApproved.push({
                id: docSnap.id || data.id,
                series: ballName.split(' ')[0] || 'Fact',
                version_name: ballName,
                brand: data.brand || 'Driller Custom',
                model_name_kr: ballName,
                model_name_en: data.model_name_en || ballName,
                alias: [ballName, ballName.replace(/\s/g, '')],
                coverstock: {
                  name: data.coverstock || 'RAGE HYBRID',
                  type: 'Hybrid',
                  factory_finish: data.finish || '#1500 POLISH'
                },
                core: {
                  name: `${ballName} Core`,
                  type: data.coreType || 'Symmetric'
                },
                specs_by_weight: {
                  [weightKey]: {
                    rg: data.rg !== undefined ? parseFloat(data.rg) : 2.511,
                    diff: data.diff !== undefined ? parseFloat(data.diff) : 0.035,
                    int_diff: data.intDiff ? parseFloat(data.intDiff) : undefined
                  }
                },
                rg: data.rg !== undefined ? parseFloat(data.rg) : 2.511,
                diff: data.diff !== undefined ? parseFloat(data.diff) : 0.035,
                oilCondition: 'Medium Oil',
                is_custom_user_ball: true,
                source: 'user_direct_input_verified'
              });
            }
          });

          if (fetchedApproved.length > 0) {
            localStorage.setItem(APPROVED_BALLS_CACHE_KEY, JSON.stringify(fetchedApproved));
            localStorage.setItem(APPROVED_BALLS_TS_KEY, String(nowMs));
            
            const idMap = new Map();
            (memoryDbCache || []).forEach(b => idMap.set(b.id, b));
            fetchedApproved.forEach(b => idMap.set(b.id, b));
            memoryDbCache = Array.from(idMap.values());
          }
        }
      } catch { /* 네트워크 예외 시 기존 캐시 사용 */ }
    })();
  }

  // 🎯 Fact Key 기반 100% 중복 자동 통합 & 정제 병합
  memoryDbCache = deduplicateBallsByFactKey(memoryDbCache || []);
  return memoryDbCache;
}

/**
 * 볼링공 목록의 정규화된 팩트 키(Fact Key) 기준 100% 자동 병합 및 중복 제거 헬퍼
 * @param {import('../types/bowlingBall').BowlingBall[]} ballList 
 * @returns {import('../types/bowlingBall').BowlingBall[]}
 */
export function deduplicateBallsByFactKey(ballList) {
  if (!Array.isArray(ballList) || ballList.length === 0) return [];

  const keyMap = new Map();

  ballList.forEach(ball => {
    const rawName = ball.model_name_kr || ball.version_name || ball.ballName || '';
    const cleanKey = rawName.toLowerCase().replace(/[\s\-_]/g, '');
    if (!cleanKey) return;

    if (!keyMap.has(cleanKey)) {
      keyMap.set(cleanKey, ball);
    } else {
      // 기존에 이미 존재하는 중복 데이터가 있을 때 병합 우선순위:
      // 1순위: 승인 팩트 데이터 (source === 'user_direct_input_verified' 또는 status === 'approved')
      // 2순위: 스펙이 더 충실한 최신 데이터
      const existing = keyMap.get(cleanKey);
      const isNewVerified = ball.source === 'user_direct_input_verified' || ball.status === 'approved';
      const isExistingVerified = existing.source === 'user_direct_input_verified' || existing.status === 'approved';

      if (isNewVerified && !isExistingVerified) {
        keyMap.set(cleanKey, ball);
      } else if (!isNewVerified && isExistingVerified) {
        // 기존 팩트 우선 보존
      } else {
        // 둘 다 같은 등급이면 최신 스펙 병합
        keyMap.set(cleanKey, { ...existing, ...ball });
      }
    }
  });

  return Array.from(keyMap.values());
}

/**
 * 검색어로 정적 DB 조회 (0.01초 소요)
 * @param {string} query 
 * @returns {Promise<import('../types/bowlingBall').BowlingBall | null>}
 */
export async function searchBallFromLocalDb(query) {
  if (!query || typeof query !== 'string') return null;
  const db = await loadBowlingBallDb();
  if (!db || db.length === 0) return null;

  const rawQuery = query.trim();
  const cleanQuery = rawQuery.toLowerCase().replace(/[\s\-_]/g, '');
  if (!cleanQuery) return null;

  // 1. 완전/정확 일치
  for (const ball of db) {
    const krClean = (ball.model_name_kr || '').toLowerCase().replace(/[\s\-_]/g, '');
    const enClean = (ball.model_name_en || '').toLowerCase().replace(/[\s\-_]/g, '');
    if (krClean === cleanQuery || enClean === cleanQuery) {
      return ball;
    }
    if (Array.isArray(ball.alias)) {
      const matchedAlias = ball.alias.some(a => (a || '').toLowerCase().replace(/[\s\-_]/g, '') === cleanQuery);
      if (matchedAlias) return ball;
    }
  }

  // 2. 부분 일치
  for (const ball of db) {
    const krClean = (ball.model_name_kr || '').toLowerCase().replace(/[\s\-_]/g, '');
    const enClean = (ball.model_name_en || '').toLowerCase().replace(/[\s\-_]/g, '');
    
    if (krClean && (krClean.includes(cleanQuery) || cleanQuery.includes(krClean))) {
      return ball;
    }
    if (enClean && (enClean.includes(cleanQuery) || cleanQuery.includes(enClean))) {
      return ball;
    }
    if (Array.isArray(ball.alias)) {
      const matchedAlias = ball.alias.some(a => {
        const c = (a || '').toLowerCase().replace(/[\s\-_]/g, '');
        return c && (c.includes(cleanQuery) || cleanQuery.includes(c));
      });
      if (matchedAlias) return ball;
    }
  }

  return null;
}

/**
 * 키워드(시리즈 앞 이름 등)로 매칭되는 모든 시리즈 공 목록 조회
 * @param {string} searchName 
 * @returns {Promise<any[]>}
 */
export async function searchSeriesBallsFromLocalDb(searchName) {
  if (!searchName || typeof searchName !== 'string') return [];
  const clean = searchName.trim().toLowerCase().replace(/[\s\-_]/g, '');
  if (clean.length < 1) return [];

  const db = await loadBowlingBallDb();
  if (!db || db.length === 0) return [];

  const matched = db.filter(b => {
    const krName = (b.model_name_kr || b.version_name || '').toLowerCase().replace(/[\s\-_]/g, '');
    const enName = (b.model_name_en || '').toLowerCase().replace(/[\s\-_]/g, '');
    const seriesName = (b.series || '').toLowerCase().replace(/[\s\-_]/g, '');

    // 공통 이름 앞자리(Prefix)로 시작하거나 시리즈 키워드가 포함된 항목들 매칭
    return krName.startsWith(clean) || enName.startsWith(clean) || krName.includes(clean) || enName.includes(clean) || (seriesName && seriesName.includes(clean));
  });

  return matched;
}

/**
 * 매칭된 공과 정확히 동일한 시리즈 버전들만 조회 (타 시리즈 혼입 100% 차단)
 * @param {import('../types/bowlingBall').BowlingBall} matchedBall 
 * @returns {Promise<import('../types/bowlingBall').BowlingBall[]>}
 */
export async function getSeriesVersions(matchedBall) {
  if (!matchedBall || !matchedBall.series) return [];
  const db = await loadBowlingBallDb();
  if (!db || db.length === 0) return [];

  const targetSeries = matchedBall.series.trim().toLowerCase();

  // 오직 정확히 동일한 시리즈(series) 공들만 필터링
  return db.filter(b => b.series && b.series.trim().toLowerCase() === targetSeries);
}

/**
 * 매칭된 로컬 팩트 공을 AI 검색 결과와 100% 호환되는 객체 포맷으로 변환
 * @param {any} matchedBall 
 * @returns {any}
 */
export function formatBallToFactResult(matchedBall) {
  if (!matchedBall) return null;
  const spec15 = matchedBall.specs_by_weight?.['15lb'] || matchedBall.specs_by_weight?.['14lb'] || {};
  const hasVerifiedSpecs = Boolean(
    (matchedBall.rg !== null && matchedBall.rg !== undefined && matchedBall.diff !== null && matchedBall.diff !== undefined) ||
    (spec15.rg !== null && spec15.rg !== undefined && spec15.diff !== null && spec15.diff !== undefined)
  );

  return {
    found: true,
    officialName: matchedBall.model_name_en || matchedBall.version_name || matchedBall.model_name_kr,
    brand: matchedBall.brand || 'Unknown',
    releaseYear: matchedBall.usbc_approved_date ? matchedBall.usbc_approved_date.substring(0, 4) : '',
    phoneticNote: matchedBall.model_name_kr ? `[로컬 팩트 DB 100%] '${matchedBall.model_name_kr}' 정밀 팩트 수치` : '',
    coreName: matchedBall.core?.name || '',
    coreType: matchedBall.core?.type || 'Symmetric',
    rg: matchedBall.rg ?? spec15.rg ?? null,
    diff: matchedBall.diff ?? spec15.diff ?? null,
    coverstock: matchedBall.coverstock?.name || '',
    coverstockType: matchedBall.coverstock?.type || 'Hybrid',
    finish: matchedBall.coverstock?.factory_finish || '',
    oilCondition: matchedBall.oilCondition || 'Medium Oil',
    isFactDb: hasVerifiedSpecs
  };
}

/**
 * 지공사가 직접 기입한 볼링공 팩트 제원을 로컬 DB(LocalStorage 캐시 및 메모리)에 즉각 등록 저장
 * @param {object} ballInput 
 * @returns {Promise<object>} 저장된 공 객체
 */
export async function saveCustomBallToLocalDb(ballInput) {
  if (!ballInput) return null;

  const rawName = (ballInput.officialName || ballInput.model_name_kr || ballInput.version_name || '').trim();
  // 🛑 지공사 지시 엄격 반영: 정확한 모델명이 없거나 2자 미만인 경우 등록 불가
  if (!rawName || rawName.length < 2) return null;

  const specData = {
    rg: ballInput.rg !== undefined && ballInput.rg !== null && ballInput.rg !== '' ? parseFloat(ballInput.rg) : null,
    diff: ballInput.diff !== undefined && ballInput.diff !== null && ballInput.diff !== '' ? parseFloat(ballInput.diff) : null,
    int_diff: ballInput.intDiff !== undefined && ballInput.intDiff !== null && ballInput.intDiff !== '' ? parseFloat(ballInput.intDiff) : null
  };

  // 🛑 지공사 지시 엄격 반영: 최소 RG나 Diff 제원 수치가 1개 이상 정밀하게 입력되었을 때만 팩트 저장 허용
  if (specData.rg === null && specData.diff === null) return null;

  const db = await loadBowlingBallDb();
  const safeId = `custom-${rawName.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-')}`;
  const weightNum = (ballInput.weight || '15').replace(/[^0-9]/g, '') || '15';
  const weightKey = `${weightNum}lb`;

  const existingIndex = db.findIndex(b => b.id === safeId || (b.model_name_kr && b.model_name_kr.toLowerCase().replace(/\s/g, '') === rawName.toLowerCase().replace(/\s/g, '')));

  let savedBall;

  if (existingIndex >= 0) {
    const target = db[existingIndex];
    target.specs_by_weight = target.specs_by_weight || {};
    if (specData.rg !== null || specData.diff !== null) {
      target.specs_by_weight[weightKey] = specData;
    }
    if (ballInput.coreType) target.core = { name: `${rawName} Core`, type: ballInput.coreType };
    if (ballInput.coverstock) target.coverstock = { name: ballInput.coverstock, type: ballInput.coverstockType || 'Hybrid', factory_finish: ballInput.finish || '' };
    target.is_custom_user_ball = true;
    target.updated_at = new Date().toISOString().substring(0, 10);
    savedBall = target;
  } else {
    savedBall = {
      id: safeId,
      series: rawName.split(' ')[0] || 'Custom',
      version_name: rawName,
      brand: ballInput.brand || 'Driller Custom',
      distributor: '지공사 직접 입력 수집',
      model_name_kr: rawName,
      model_name_en: rawName,
      alias: [rawName, rawName.replace(/\s/g, '')],
      usbc_approved_date: null,
      coverstock: {
        name: ballInput.coverstock || 'Custom Cover',
        type: ballInput.coverstockType || 'Hybrid',
        factory_finish: ballInput.finish || ''
      },
      core: {
        name: `${rawName} Core`,
        type: ballInput.coreType || 'Symmetric'
      },
      specs_by_weight: {
        [weightKey]: specData
      },
      rg: specData.rg,
      diff: specData.diff,
      oilCondition: ballInput.oilCondition || 'Medium Oil',
      is_custom_user_ball: true,
      updated_at: new Date().toISOString().substring(0, 10)
    };
    db.push(savedBall);
  }

  try {
    const customList = db.filter(b => b.is_custom_user_ball || (b.id && b.id.startsWith('custom-')));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customList));

    // 🚀 [파이어베이스 실시간 중앙 취합] Firestore shared_bowling_balls 컬렉션 단일 직통 업로드
    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    if (!isTestEnv && typeof window !== 'undefined') {
      (async () => {
        try {
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const { licenseDb } = await import('./licenseFirebase.js');
          const userEmail = localStorage.getItem('prodrill_linked_email') || localStorage.getItem('prodrill_certified_email_plain') || 'anonymous_driller';
          const firestoreDocId = `${safeId}-${weightNum}`;

          // 커버스탁 텍스트 직렬화 헬퍼 (객체 형태 들어옴 원천 방지)
          let coverStr = '';
          if (typeof ballInput.coverstock === 'string') {
            coverStr = ballInput.coverstock;
          } else if (ballInput.coverstock && typeof ballInput.coverstock === 'object') {
            coverStr = ballInput.coverstock.name || ballInput.coverstock.type || '';
          }
          if (ballInput.finish) coverStr = coverStr ? `${coverStr} (${ballInput.finish})` : ballInput.finish;

          const firestorePayload = {
            id: safeId,
            ballName: rawName,
            brand: ballInput.brand || 'Driller Custom',
            weight: weightKey,
            coreType: ballInput.coreType || (savedBall.core?.type) || 'Symmetric',
            rg: (specData.rg !== undefined && specData.rg !== null) ? specData.rg : null,
            diff: (specData.diff !== undefined && specData.diff !== null) ? specData.diff : null,
            intDiff: (specData.int_diff !== undefined && specData.int_diff !== null) ? specData.int_diff : null,
            coverstock: coverStr,
            finish: ballInput.finish || '',
            contributedBy: userEmail,
            status: 'pending', // pending(수집검증대기) | approved(승인) | rejected(거절)
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          const docRef = doc(licenseDb, 'shared_bowling_balls', firestoreDocId);
          await setDoc(docRef, firestorePayload, { merge: true });
        } catch (fErr) {
          console.warn("파이어베이스 볼링공 수집 백업 실패:", fErr?.message || fErr);
        }
      })();
    }
  } catch { /* LocalStorage / Firebase 저장 예외 처리 */ }

  return savedBall;
}

