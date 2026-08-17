// ==========================================
// OpenAI / Gemini Service API
// ==========================================

import { searchBallFromLocalDb, formatBallToFactResult } from './ballDbService.js';

// API Provider 키 저장 및 가져오기
export const getApiKeyForProvider = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('prodrill_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const saveApiKeyForProvider = (key) => {
  if (typeof window === 'undefined') return;
  if (key && key.trim()) {
    localStorage.setItem('prodrill_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('prodrill_gemini_api_key');
  }
};

export const getApiKey = () => getApiKeyForProvider();
export const hasApiKey = () => Boolean(getApiKey());

// ── 로컬 메모리 캐시 (동일 공 중복 호출 방지) ──
const ballSearchCache = new Map();

export const getBallFromCache = (ballName) => {
  if (!ballName) return null;
  return ballSearchCache.get(ballName.trim().toLowerCase()) || null;
};

export const setBallCache = (ballName, data) => {
  if (!ballName || !data) return;
  ballSearchCache.set(ballName.trim().toLowerCase(), data);
};

// ── 구글 제미나이 모델 Fallback 릴레이 리스트 ──
const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

/**
 * 구글 Gemini API 호출 시 트래픽 폭주(503 High Demand)나 429/404 발생 시
 * 다음 대체 모델로 자동 Fallback 릴레이 시도하는 무장애 헬퍼
 */
async function fetchGeminiWithFallback(apiKey, bodyPayload) {
  let lastError = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (response.ok) {
        return await response.json();
      }

      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;

      // 503 High Demand, 429 Limit, 404 Not Found 시 다음 대체 모델로 릴레이
      const isTemporaryOrNotFound = response.status === 503 || 
        response.status === 429 || 
        response.status === 404 || 
        errMsg.toLowerCase().includes('demand') || 
        errMsg.toLowerCase().includes('overloaded');

      if (isTemporaryOrNotFound) {
        console.warn(`[Gemini Fallback] 모델 ${model} 일시 장애/대기 (${errMsg}), 다음 대체 모델 시도...`);
        lastError = new Error(errMsg);
        continue;
      }

      throw new Error(errMsg);
    } catch (err) {
      lastError = err;
      const lowerMsg = (err.message || '').toLowerCase();
      if (lowerMsg.includes('demand') || lowerMsg.includes('overloaded') || lowerMsg.includes('503') || lowerMsg.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('모든 대체 AI 모델 호출에 실패했습니다.');
}

// ─────────────────────────────────────────────────────────────
// [단일 호출 버전] 지공차트 AI 레이아웃 추천 & 볼링공 자동 탐색
// ─────────────────────────────────────────────────────────────
export const getAiRecommendations = async ({ bowler, spec, ballName }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const cached = getBallFromCache(ballName);
  if (cached) return cached;

  const isThumbless = bowler.style === '덤리스' || bowler.style === '투핸드' || bowler.isThumbless;

  const systemPrompt = `You are a world-class professional bowling driller and layout specialist.
First, identify the bowling ball specified by the user and retrieve its exact technical specifications.
Then, calculate 4 optimal layout recommendations tailored to the bowler's physical specs.
Return ONLY valid JSON matching the provided schema. No markdown, no code blocks.

Layout format rules:
- condition: one of ["Heavy Oil", "Medium Oil", "Dry Oil", "Reference Layout"]
- layout: prepend "(2LS) " for Thumbless/Two-Handed, "(Dual Angle) " for Traditional 3-Finger.
- NEVER use hyphens between whole numbers and fractions (e.g. use "4 1/2" NOT "4-1/2").
- description: short 1-line reason in Korean (under 50 chars).
- intentSummary: brief Korean summary under 30 chars.

Bowler Type: ${isThumbless ? 'Thumbless/Two-Handed (Use 2LS format)' : 'Traditional 3-Finger (Use Dual Angle format)'}`;

  const userPrompt = `Bowler Info:
- Name: ${bowler.name || 'Local Bowler'}
- Hand: ${bowler.hand || 'Right'}
- Style: ${bowler.style || 'Traditional'} ${bowler.styleExtra || ''}
- Gender: ${bowler.gender || 'Unknown'}

Bowler Spec:
- RPM: ${spec.rpm || 'Unknown'}
- Speed: ${spec.ballSpeed || 'Unknown'} km/h
- PAP: ${spec.papX || 'Unknown'} : ${spec.papY || 'Unknown'}
- Track Flare: ${spec.trackFlare || 'Medium'}
- Axis Tilt: ${spec.tilt || 'Medium'}

Target Bowling Ball: "${ballName || 'Unknown Ball'}"

Please identify the ball, return its specs, and generate 4 layout recommendations.`;

  try {
    const data = await fetchGeminiWithFallback(apiKey, {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            ball: {
              type: 'OBJECT',
              properties: {
                found: { type: 'BOOLEAN' },
                officialName: { type: 'STRING' },
                brand: { type: 'STRING' },
                releaseYear: { type: 'STRING' },
                phoneticNote: { type: 'STRING' },
                coreName: { type: 'STRING' },
                coreType: { type: 'STRING' },
                rg: { type: 'NUMBER' },
                diff: { type: 'NUMBER' },
                coverstock: { type: 'STRING' },
                coverstockType: { type: 'STRING' },
                finish: { type: 'STRING' },
                oilCondition: { type: 'STRING' }
              },
              required: ['found', 'officialName', 'brand', 'coreType', 'rg', 'diff', 'coverstockType', 'finish', 'oilCondition']
            },
            layouts: {
              type: 'ARRAY',
              description: 'Exactly 4 layout recommendations',
              items: {
                type: 'OBJECT',
                properties: {
                  condition: { type: 'STRING' },
                  layout: { type: 'STRING' },
                  description: { type: 'STRING' },
                  intentSummary: { type: 'STRING' }
                },
                required: ['condition', 'layout', 'description', 'intentSummary']
              }
            }
          },
          required: ['ball', 'layouts']
        },
        temperature: 0.7
      }
    });

    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedContent);

    if (parsed.layouts) {
      parsed.layouts = parsed.layouts.map(item => ({
        ...item,
        layout: item.layout ? item.layout.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.layout,
        description: item.description ? item.description.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.description,
        intentSummary: item.intentSummary ? item.intentSummary.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.intentSummary
      }));
    }

    setBallCache(ballName, parsed);
    return parsed;
  } catch (error) {
    console.error("Gemini AI 추천 전체 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};


// ─────────────────────────────────────────────────────────────
// Step 1: 볼링공 검색 전용 (로컬 DB 1순위 탐색 후 AI 검색)
// ─────────────────────────────────────────────────────────────
export const searchBowlingBall = async ({ ballName }) => {
  if (!ballName || !ballName.trim()) {
    throw new Error("BALL_NAME_EMPTY");
  }

  // 1순위: 로컬 DB 팩트검색 (0원, 0.001초, 환각 0%)
  try {
    const localMatched = await searchBallFromLocalDb(ballName);
    if (localMatched) {
      return formatBallToFactResult(localMatched);
    }
  } catch (err) {
    console.warn("로컬 DB 검색 중 예외 발생:", err);
  }

  // 2순위: 캐시 확인
  const cached = getBallFromCache(ballName);
  if (cached && cached.ball) {
    return cached.ball;
  }

  // 3순위: Gemini API 검색
  return await searchBowlingBallFromAi({ ballName });
};

export const searchBowlingBallFromAi = async ({ ballName }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const systemPrompt = `You are a world-class professional bowling equipment expert.
Identify the exact bowling ball matching the user input and return its verified technical specifications.
Return ONLY valid JSON matching the schema. No markdown.

If the ball is NOT a real bowling ball, set "found": false.`;

  const userPrompt = `Bowling ball input: "${ballName || ''}"`;

  try {
    const data = await fetchGeminiWithFallback(apiKey, {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            found: { type: 'BOOLEAN' },
            officialName: { type: 'STRING' },
            brand: { type: 'STRING' },
            releaseYear: { type: 'STRING' },
            phoneticNote: { type: 'STRING' },
            coreName: { type: 'STRING' },
            coreType: { type: 'STRING' },
            rg: { type: 'NUMBER' },
            diff: { type: 'NUMBER' },
            coverstock: { type: 'STRING' },
            coverstockType: { type: 'STRING' },
            finish: { type: 'STRING' },
            oilCondition: { type: 'STRING' }
          },
          required: ['found', 'officialName', 'brand', 'coreType', 'rg', 'diff', 'coverstockType', 'finish', 'oilCondition']
        },
        temperature: 0.2
      }
    });

    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedContent);

    setBallCache(ballName || '', result);
    return result;
  } catch (error) {
    console.error("볼링공 검색 API 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};


// ─────────────────────────────────────────────────────────────
// Step 2: 레이아웃 추천 전용 (볼 정보를 받아 레이아웃만 생성)
// ─────────────────────────────────────────────────────────────
export const getLayoutRecommendations = async ({ bowler, spec, ball }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const isThumbless = bowler.style === '덤리스' || bowler.style === '투핸드' || bowler.isThumbless;

  const systemPrompt = `You are a world-class professional bowling driller and layout specialist.
Given the bowler specs and confirmed bowling ball specs, recommend exactly 4 layouts.
Return a JSON OBJECT with key "layouts" containing an array of exactly 4 layout objects. No markdown, no code blocks.

Layout format:
- condition: one of ["Heavy Oil", "Medium Oil", "Dry Oil", "Reference Layout"]
- layout: prepend "(2LS) " for Thumbless/Two-Handed, "(Dual Angle) " for Traditional 3-Finger.
- NEVER use hyphens between whole numbers and fractions (use "4 1/2" not "4-1/2").
- description: short 1-line reason in Korean (under 50 chars).
- intentSummary: brief Korean summary under 30 chars.

Bowler Type: ${isThumbless ? 'Thumbless/Two-Handed (Use 2LS format)' : 'Traditional 3-Finger (Use Dual Angle format)'}`;

  const userPrompt = `Bowler Info:
- Name: ${bowler.name || 'Local Bowler'}
- Hand: ${bowler.hand || 'Right'}
- Style: ${bowler.style || 'Traditional'} ${bowler.styleExtra || ''}
- Gender: ${bowler.gender || 'Unknown'}

Bowler Spec:
- RPM: ${spec.rpm || 'Unknown'}
- Speed: ${spec.ballSpeed || 'Unknown'} km/h
- PAP: ${spec.papX || 'Unknown'} : ${spec.papY || 'Unknown'}
- Track Flare: ${spec.trackFlare || 'Medium'}
- Axis Tilt: ${spec.tilt || 'Medium'}

Confirmed Ball:
- Name: ${ball.officialName || ball.name || 'Unknown'}
- Brand: ${ball.brand || ''}
- Core: ${ball.coreName || ''} (${ball.coreType || ''})
- RG: ${ball.rg || ''} / Diff: ${ball.diff || ''}
- Coverstock: ${ball.coverstock || ''} (${ball.coverstockType || ''})
- Finish: ${ball.finish || ''}
- Oil Condition: ${ball.oilCondition || ''}`;

  try {
    const data = await fetchGeminiWithFallback(apiKey, {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            layouts: {
              type: 'ARRAY',
              description: 'Exactly 4 layout recommendations',
              items: {
                type: 'OBJECT',
                properties: {
                  condition: { type: 'STRING' },
                  layout: { type: 'STRING' },
                  description: { type: 'STRING' },
                  intentSummary: { type: 'STRING' }
                },
                required: ['condition', 'layout', 'description', 'intentSummary']
              }
            }
          },
          required: ['layouts']
        },
        temperature: 0.7
      }
    });

    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedContent);
    const layoutList = Array.isArray(parsed) ? parsed : (parsed.layouts || []);

    return layoutList.map(item => ({
      ...item,
      layout: item.layout ? item.layout.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.layout,
      description: item.description ? item.description.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.description,
      intentSummary: item.intentSummary ? item.intentSummary.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.intentSummary
    }));
  } catch (error) {
    console.error("Gemini 레이아웃 추천 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};


// ─────────────────────────────────────────────────────────────
// Dual Angle ↔ 2LS 실시간 레이아웃 무장애 상호 변환 API
// ─────────────────────────────────────────────────────────────
export const convertLayoutTo2LS = async ({ currentLayout, bowler, spec }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const systemPrompt = `You are a professional bowling layout technician. Convert the given Dual Angle layout into Storm 2LS format.
CRITICAL: The 'reason' field MUST BE WRITTEN ENTIRELY IN KOREAN (한국어). Provide a clear, detailed, step-by-step calculation and guide in professional Korean so that Korean drillers can understand easily.
Return ONLY valid JSON matching the schema. No markdown.`;

  const userPrompt = `Current Dual Angle Layout: "${currentLayout}"
Bowler Spec:
- Style: ${bowler.style || 'Traditional'}
- RPM: ${spec.rpm || 'Unknown'}
- Speed: ${spec.ballSpeed || 'Unknown'} km/h
- PAP: ${spec.papX || 'Unknown'} : ${spec.papY || 'Unknown'}

Please convert this layout to 2LS, strictly adjusting parameters based on the bowler's specs. Explain the detailed calculation process and guide ENTIRELY IN KOREAN.`;

  try {
    const data = await fetchGeminiWithFallback(apiKey, {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            twoLS: { type: 'STRING' },
            reason: { type: 'STRING' }
          },
          required: ['twoLS', 'reason']
        },
        temperature: 0.3
      }
    });

    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedContent);

    return {
      twoLS: result.twoLS ? (result.twoLS.startsWith('(2LS)') ? result.twoLS : `(2LS) ${result.twoLS}`).replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : '',
      reason: result.reason ? result.reason.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : ''
    };
  } catch (error) {
    console.error("Gemini 2LS 변환 API 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};

export const convert2LSToDualAngle = async ({ currentLayout, bowler, spec }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const systemPrompt = `You are a professional bowling layout technician. Convert the given Storm 2LS layout back into Traditional Dual Angle layout.
CRITICAL 1: The 'dualAngle' field MUST contain the COMPLETE 3-parameter Dual Angle layout string formatted as: "55° x 4 1/2 x 40°" (Drill Angle x Pin-to-PAP x VAL Angle). Do not omit the VAL angle or leave it incomplete!
CRITICAL 2: The 'reason' field MUST BE WRITTEN ENTIRELY IN KOREAN (한국어). Provide a clear, detailed, step-by-step calculation and guide in professional Korean so that Korean drillers can understand easily.
Return ONLY valid JSON matching the schema. No markdown.`;

  const userPrompt = `Current 2LS Layout: "${currentLayout}"
Bowler Spec:
- Style: ${bowler.style || 'Traditional'}
- RPM: ${spec.rpm || 'Unknown'}
- Speed: ${spec.ballSpeed || 'Unknown'} km/h
- PAP: ${spec.papX || 'Unknown'} : ${spec.papY || 'Unknown'}

Please convert this 2LS layout back to Dual Angle layout, strictly adjusting parameters based on the bowler's specs. Ensure the returned dualAngle string includes all 3 values (Drill Angle x Pin-to-PAP x VAL Angle). Explain the detailed calculation process and guide ENTIRELY IN KOREAN.`;

  try {
    const data = await fetchGeminiWithFallback(apiKey, {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            dualAngle: { type: 'STRING' },
            reason: { type: 'STRING' }
          },
          required: ['dualAngle', 'reason']
        },
        temperature: 0.3
      }
    });

    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedContent);

    return {
      dualAngle: result.dualAngle ? (result.dualAngle.includes('(Dual)') ? result.dualAngle : `(Dual) ${result.dualAngle.replace(/\(Dual Angle\)/gi, '').trim()}`).replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : '',
      reason: result.reason ? result.reason.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : ''
    };
  } catch (error) {
    console.error("Gemini Dual Angle 역변환 API 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};

// 💡 [구글 제미나이 API 영문 에러 메시지 ➔ 친숙한 한국어 번역기]
export const translateGeminiError = (rawMessage) => {
  if (!rawMessage) return 'AI 추천 데이터를 가져오는데 실패했습니다. API 키 설정 혹은 네트워크 상태를 확인해주세요.';

  const msg = rawMessage.toLowerCase();

  if (msg.includes('high demand') || msg.includes('demand') || msg.includes('overloaded') || msg.includes('temporarily unavailable') || msg.includes('503')) {
    return '구글 AI 서버에 일시적 트래픽 폭주(High Demand)가 발생했습니다. 잠시 후 [다시 추천받기] 버튼을 눌러주시면 대체 모델로 즉시 연결됩니다.';
  }

  if (msg.includes('network_offline') || msg.includes('offline')) {
    return '[오프라인] 네트워크 연결이 해제되어 오프라인 상태입니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  if (msg.includes('api_key_invalid') || msg.includes('invalid api key') || msg.includes('api key not valid') || msg.includes('key is invalid') || msg.includes('invalid key')) {
    return '입력하신 Gemini API Key가 올바르지 않습니다. 설정 또는 모달에서 복사 시 누락/오타가 없는지 다시 확인해 주세요.';
  }
  if (msg.includes('expired')) {
    return '등록된 API Key의 유효기간이 만료되었습니다. 구글 AI 스튜디오에서 새로운 API Key를 발급받아 등록해 주세요.';
  }
  if (msg.includes('resource_exhausted') || msg.includes('quota exceeded') || msg.includes('limit exceeded') || msg.includes('too many requests')) {
    return 'Gemini API 호출 가능 한도(할당량)를 초과했습니다. 무료 등급 제한일 수 있으니 잠시 후 다시 시도해 주세요.';
  }
  if (msg.includes('not found') || msg.includes('is no longer available') || msg.includes('is not found') || msg.includes('not_found') || msg.includes('not supported for generatecontent')) {
    return '선택된 AI 추천 모델을 찾을 수 없거나 지원이 종료되었습니다. 설정에서 최신 모델 적용 여부를 체크해 주세요.';
  }
  if (msg.includes('permission_denied') || msg.includes('permission denied') || msg.includes('not authorized') || msg.includes('unauthorized')) {
    return '구글 API 서버로부터 접근 권한이 거부되었습니다. API 키의 제한 설정(IP/HTTP 레퍼러 제한 등)을 확인해 주세요.';
  }

  return `AI 추천 연산 실패: ${rawMessage} (API 키 설정 혹은 네트워크 상태를 확인해 주세요.)`;
};
