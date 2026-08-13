// 💡 [Gemini 단독 모드 개편]: ChatGPT와 Claude 관련 복잡한 로직을 완전히 제거하고 구글 Gemini만 고정 구동
export const getAiProvider = () => {
  return 'gemini';
};

export const saveAiProvider = () => {
  // 제미나이 전용이므로 생략
};

export const getApiKeyForProvider = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('prodrill_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const saveApiKeyForProvider = (key) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('prodrill_gemini_api_key', key.trim());
};

export const getApiKey = () => {
  return getApiKeyForProvider();
};

export const saveApiKey = (key) => {
  saveApiKeyForProvider(key);
};

export const hasApiKeyForProvider = () => {
  return !!getApiKeyForProvider();
};

export const hasApiKey = () => {
  return !!getApiKey();
};

export const getAiRecommendations = async ({ bowler, spec, ballName }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  // 덤리스/투핸드 판정
  const isThumbless = bowler.style === '덤리스' || bowler.style === '투핸드' || bowler.isThumbless;

  const systemPrompt = `You are a world-class professional bowling driller (Pro Driller) and layout specialist.
Your job is to:
1. Identify the bowling ball from the input name (including Korean phonetic input).
2. Return its official specifications.
3. Recommend exactly 4 layouts.

Return a single JSON OBJECT (not an array) with two keys: "ball" and "layouts".
No markdown, no code blocks, just raw JSON.

BALL NAME RESOLUTION:
- If input is Korean phonetics (e.g. "페이즈2", "블랙위도우", "어텐션"), resolve it to the official English brand name.
- Set "found": true if you recognize the ball, false if unknown.
- Set "officialName" to the resolved English name (e.g. "Storm Phaze II").
- Set "phoneticNote" to a short Korean explanation of how you interpreted the input (e.g. "'페이즈2' → Storm Phaze II 로 해석"). Leave empty string if input was already in English.
- For ball specs: fill coreName, coreType (Symmetric/Asymmetric), rg, diff, coverstock, coverstockType (Solid/Pearl/Hybrid), finish, oilCondition (Heavy/Medium-Heavy/Medium/Medium-Dry/Dry).
- If "found" is false, set all spec fields to empty string or 0, and layouts to generic recommendations.

LAYOUT FORMAT:
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

Bowling Ball Input Name: "${ballName || ''}"

Please identify the ball, return its specs, and generate 4 layout recommendations.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
                  found: { type: 'BOOLEAN', description: 'Whether the ball was identified' },
                  officialName: { type: 'STRING', description: 'Official English ball name' },
                  brand: { type: 'STRING' },
                  phoneticNote: { type: 'STRING', description: 'Korean explanation of name resolution, empty if not needed' },
                  coreName: { type: 'STRING' },
                  coreType: { type: 'STRING', description: 'Symmetric or Asymmetric' },
                  rg: { type: 'NUMBER' },
                  diff: { type: 'NUMBER' },
                  coverstock: { type: 'STRING' },
                  coverstockType: { type: 'STRING', description: 'Solid, Pearl, or Hybrid' },
                  finish: { type: 'STRING' },
                  oilCondition: { type: 'STRING', description: 'Heavy / Medium-Heavy / Medium / Medium-Dry / Dry' }
                },
                required: ['found', 'officialName', 'brand', 'phoneticNote', 'coreName', 'coreType', 'rg', 'diff', 'coverstock', 'coverstockType', 'finish', 'oilCondition']
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
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(translateGeminiError(errData.error?.message || 'Gemini API call failed'));
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedContent);

    // 하이픈(-) 분수 정제
    const cleanLayouts = (parsed.layouts || []).map(item => ({
      ...item,
      layout: item.layout ? item.layout.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.layout,
      description: item.description ? item.description.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.description,
      intentSummary: item.intentSummary ? item.intentSummary.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : item.intentSummary
    }));

    return {
      ball: parsed.ball || { found: false, officialName: '', brand: '', phoneticNote: '' },
      layouts: cleanLayouts
    };
  } catch (error) {
    console.error("Gemini 레이아웃 추천 API 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};

// ─────────────────────────────────────────────────────────────
// [2단계 분리 API]
// Step 1: 볼링공 검색 전용 (빠른 단일 호출)
// ─────────────────────────────────────────────────────────────
// 볼링공 이미지 폴백 URL 체인
// Gemini가 반환한 URL이 없으면 제조사 CDN 패턴으로 시도
const BRAND_CDN_PATTERNS = {
  storm: (name) => [
    `https://www.stormbowling.com/media/catalog/product/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}.jpg`,
    `https://cdn.stormbowling.com/products/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}.jpg`
  ],
  'roto grip': (name) => [
    `https://www.rotogripbowling.com/media/catalog/product/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}.jpg`
  ],
  brunswick: (name) => [
    `https://www.brunswickbowling.com/media/catalog/product/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}.jpg`
  ],
  hammer: (name) => [
    `https://www.hammerbowling.com/media/catalog/product/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}.jpg`
  ],
  motiv: (name) => [
    `https://www.motivbowling.com/media/catalog/product/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}.jpg`
  ]
};

// 주어진 브랜드와 볼 이름으로 CDN URL 후보 목록 반환
export const getBallImageCandidates = (brand, officialName) => {
  if (!brand && !officialName) return [];
  const key = (brand || '').toLowerCase().trim();
  const name = officialName || '';
  const patternFn = BRAND_CDN_PATTERNS[key];
  return patternFn ? patternFn(name) : [];
};

// 볼링공 검색 결과 sessionStorage 케시
const BALL_CACHE_PREFIX = 'prodrill_ball_cache_';
const BALL_CACHE_TTL_MS = 30 * 60 * 1000; // 30분

const getBallCache = (ballName) => {
  try {
    const raw = sessionStorage.getItem(BALL_CACHE_PREFIX + ballName.toLowerCase().trim());
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (new Date().getTime() - ts > BALL_CACHE_TTL_MS) {
      sessionStorage.removeItem(BALL_CACHE_PREFIX + ballName.toLowerCase().trim());
      return null;
    }
    return data;
  } catch { return null; }
};

const setBallCache = (ballName, data) => {
  try {
    sessionStorage.setItem(
      BALL_CACHE_PREFIX + ballName.toLowerCase().trim(),
      JSON.stringify({ data, ts: new Date().getTime() })
    );
  } catch { /* 저장 실패 싸일렇 */ }
};

export const searchBowlingBall = async ({ ballName }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  // 케시 조회 — 동일 볼 이름은 API 호출 없이 반환
  const cached = getBallCache(ballName || '');
  if (cached) {
    console.log('📦 볼 검색 케시 적중:', ballName);
    return cached;
  }

  const systemPrompt = `You are a professional bowling ball database expert.
Given a bowling ball name (possibly in Korean phonetics or with typos), identify the ball and return its official specifications.

RULES:
- If input is Korean phonetics (e.g. "\ud398\uc774\uc9882", "\ube14\ub799\uc704\ub3c4\uc6b0", "\uc5b4\ud150\uc158"), resolve to the official English brand name.
- Set "found": true if you recognize the ball, false if unknown.
- Set "officialName" to the full official English name.
- Set "brand" to the manufacturer brand.
- Set "releaseYear" to the release year as a 4-digit string (e.g. "2022") or empty string if unknown.
- Set "phoneticNote" to a short Korean sentence explaining how you interpreted the input (e.g. "'\ud398\uc774\uc9882' \u2192 Storm Phaze II \ub85c \ud574\uc11d\ud588\uc2b5\ub2c8\ub2e4"). Leave as empty string if input was already in standard English.
- For specs: fill coreName, coreType (Symmetric/Asymmetric), rg (number), diff (number), coverstock (full name), coverstockType (Solid/Pearl/Hybrid), finish, oilCondition (Heavy/Medium-Heavy/Medium/Medium-Dry/Dry).
- If "found" is false, set all spec fields to empty string or 0.

Return ONLY a single JSON OBJECT. No markdown, no code blocks.`;

  const userPrompt = `Bowling ball input: "${ballName || ''}"`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
            required: ['found', 'officialName', 'brand', 'releaseYear', 'phoneticNote', 'coreName', 'coreType', 'rg', 'diff', 'coverstock', 'coverstockType', 'finish', 'oilCondition']
          },
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(translateGeminiError(errData.error?.message || 'Gemini API call failed'));
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedContent);

    // 결과 케시 저장
    setBallCache(ballName || '', result);
    return result;
  } catch (error) {
    console.error("\ubcfc\ub9c1\uacf5 \uac80\uc0c9 API \uc5d0\ub7ec:", error);
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
Return a JSON ARRAY of exactly 4 objects. No markdown, no code blocks.

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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
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
          },
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(translateGeminiError(errData.error?.message || 'Gemini API call failed'));
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedContent);

    return parsed.map(item => ({
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


export const convertLayoutTo2LS = async ({ currentLayout, bowler, spec }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const systemPrompt = `You are a professional bowling layout converter.
Convert the given Dual Angle layout (e.g. 50 x 4 x 35) into Storm's 2LS (Two-Handed Layout System) format (e.g. 4 1/2 x 5 x 2 1/4) for a thumbless/two-handed bowler.
You MUST calculate the conversion by strictly reflecting the bowler's unique specs (RPM, Speed, PAP, Axis Tilt, and Track Flare) to adjust the pin placement and buffer.
CRITICAL: NEVER use hyphens (-) between whole numbers and fractions. Always use a single space (e.g. use "4 1/2" instead of "4-1/2", "2 1/4" instead of "2-1/4").
Always return a simple JSON object containing:
- dualAngle: The original layout
- twoLS: The converted 2LS layout (which must be prepended with "(2LS) ", e.g., "(2LS) 4 1/2 x 5 x 2 1/4")
- reason: A very short 1-line explanation (in Korean, under 50 characters) of the conversion basis, explicitly mentioning how the bowler's RPM/Speed/Tilt/PAP influenced the resulting layout.
No extra markdown, code block tickmarks or comments.`;

  const userPrompt = `Bowler Spec:
- Hand: ${bowler.hand || 'Right'}
- Style: ${bowler.style || 'Two-Handed'}
- PAP: ${spec.papX || '5'} : ${spec.papY || '1 Up'}
- RPM: ${spec.rpm || '350'}
- Speed: ${spec.ballSpeed || '25'} km/h
- Axis Tilt: ${spec.tilt || 'Medium'}
- Track Flare: ${spec.trackFlare || 'Medium'}

Original Layout (Dual Angle): ${currentLayout}

Please convert this layout to 2LS, strictly adjusting parameters based on the bowler's specs.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: userPrompt }
          ]
        }],
        systemInstruction: {
          parts: [
            { text: systemPrompt }
          ]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              dualAngle: { type: 'STRING' },
              twoLS: { type: 'STRING' },
              reason: { type: 'STRING' }
            },
            required: ['dualAngle', 'twoLS', 'reason']
          },
          temperature: 0.5
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(translateGeminiError(errData.error?.message || 'Gemini conversion failed'));
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedContent);

    // 🛡️ 실수와 분수 사이 하이픈(-) 자동 소거 정제
    return {
      ...parsed,
      dualAngle: parsed.dualAngle ? parsed.dualAngle.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : parsed.dualAngle,
      twoLS: parsed.twoLS ? parsed.twoLS.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : parsed.twoLS,
      reason: parsed.reason ? parsed.reason.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : parsed.reason
    };
  } catch (error) {
    console.error("Gemini 2LS 변환 API 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};

export const convert2LSToDualAngle = async ({ currentLayout, bowler, spec }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const systemPrompt = `You are a professional bowling layout converter.
Convert the given Storm's 2LS layout (e.g. 4 1/2 x 5 x 2 1/4) into standard Dual Angle format (e.g. 50 x 4 x 35) for a bowler.
You MUST calculate the conversion by strictly reflecting the bowler's unique specs (RPM, Speed, PAP, Axis Tilt, and Track Flare) to adjust the layout.
CRITICAL: NEVER use hyphens (-) between whole numbers and fractions. Always use a single space (e.g. use "4 1/2" instead of "4-1/2", "2 1/4" instead of "2-1/4").
Always return a simple JSON object containing:
- twoLS: The original 2LS layout
- dualAngle: The converted Dual Angle layout (which must be prepended with "(Dual Angle) ", e.g., "(Dual Angle) 50 x 4 x 35")
- reason: A very short 1-line explanation (in Korean, under 50 characters) of the conversion basis, explicitly mentioning how the bowler's RPM/Speed/Tilt/PAP influenced the resulting layout.
No extra markdown, code block tickmarks or comments.`;

  const userPrompt = `Bowler Spec:
- Hand: ${bowler.hand || 'Right'}
- Style: ${bowler.style || 'Traditional'}
- PAP: ${spec.papX || '5'} : ${spec.papY || '1 Up'}
- RPM: ${spec.rpm || '350'}
- Speed: ${spec.ballSpeed || '25'} km/h
- Axis Tilt: ${spec.tilt || 'Medium'}
- Track Flare: ${spec.trackFlare || 'Medium'}

Original Layout (2LS): ${currentLayout}

Please convert this 2LS layout back to Dual Angle layout, strictly adjusting parameters based on the bowler's specs.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: userPrompt }
          ]
        }],
        systemInstruction: {
          parts: [
            { text: systemPrompt }
          ]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              twoLS: { type: 'STRING' },
              dualAngle: { type: 'STRING' },
              reason: { type: 'STRING' }
            },
            required: ['twoLS', 'dualAngle', 'reason']
          },
          temperature: 0.5
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(translateGeminiError(errData.error?.message || 'Gemini conversion failed'));
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedContent);

    // 🛡️ 실수와 분수 사이 하이픈(-) 자동 소거 정제
    return {
      ...parsed,
      twoLS: parsed.twoLS ? parsed.twoLS.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : parsed.twoLS,
      dualAngle: parsed.dualAngle ? parsed.dualAngle.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : parsed.dualAngle,
      reason: parsed.reason ? parsed.reason.replace(/(\d+)-(\d+\/\d+)/g, '$1 $2') : parsed.reason
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

  if (msg.includes('network_offline') || msg.includes('offline')) {
    return '[오프라인] 네트워크 연결이 해제되어 오프라인 상태입니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  if (msg.includes('api_key_invalid') || msg.includes('invalid api key') || msg.includes('api key not valid') || msg.includes('key is invalid') || msg.includes('invalid key')) {
    return '입력하신 Gemini API Key가 올바르지 않습니다. 설정⚙️ 또는 모달에서 복사 시 누락/오타가 없는지 다시 확인해 주세요.';
  }
  if (msg.includes('expired')) {
    return '등록된 API Key의 유효기간이 만료되었습니다. 구글 AI 스튜디오에서 새로운 API Key를 발급받아 등록해 주세요.';
  }
  if (msg.includes('resource_exhausted') || msg.includes('quota exceeded') || msg.includes('limit exceeded') || msg.includes('too many requests')) {
    return 'Gemini API 호출 가능 한도(할당량)를 초과했습니다. 무료 등급 제한일 수 있으니 잠시 후 다시 시도해 주세요.';
  }
  if (msg.includes('not found') || msg.includes('is no longer available') || msg.includes('is not found') || msg.includes('not_found') || msg.includes('not supported for generatecontent')) {
    return '선택된 AI 추천 모델을 찾을 수 없거나 지원이 종료되었습니다. 설정에서 최신 모델(gemini-3.5-flash) 적용 여부를 체크해 주세요.';
  }
  if (msg.includes('permission_denied') || msg.includes('permission denied') || msg.includes('not authorized') || msg.includes('unauthorized')) {
    return '구글 API 서버로부터 접근 권한이 거부되었습니다. API 키의 제한 설정(IP/HTTP 레퍼러 제한 등)을 확인해 주세요.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('connection')) {
    return '구글 서버와의 네트워크 통신에 실패했습니다. 공유기 및 기기의 인터넷 연결 상태를 확인해 주세요.';
  }
  
  // 알 수 없는 오류는 영문 메시지와 함께 범용 한글 가이드를 제공
  return `AI 추천 연산 실패: ${rawMessage} (API 키 설정 혹은 네트워크 상태를 확인해 주세요.)`;
};
