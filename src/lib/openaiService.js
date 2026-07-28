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
Your job is to analyze bowler specifications and ball details, then recommend exactly 4 different layouts.
Always return your response as a strict JSON array containing exactly 4 objects. 
No markdown formatting, no code block tickmarks (like \`\`\`json), just raw JSON string.

Each object in the array must have the following keys:
- condition: The target condition. Must be one of ["Heavy Oil", "Medium Oil", "Dry Oil", "Reference Layout"]
- layout: The layout value.
  * You MUST prepend "(2LS) " or "(Dual Angle) " based on the format used.
  * If the bowler is Thumbless/Two-handed, use Storm's 2LS format with "(2LS) " prefix (e.g., "(2LS) 4-1/2 x 5 x 2-1/4").
  * If the bowler is traditional 3-finger, use Dual Angle format with "(Dual Angle) " prefix (e.g., "(Dual Angle) 55 x 4-1/2 x 35").
- description: A short, concise 1-line reason (under 50 characters) in Korean explaining why this layout is recommended. (e.g., "핀업 지공으로 랭스를 확보하고 백엔드 반응을 제어")
- intentSummary: An even shorter key summary (under 30 characters) in Korean to be written into the intent log. (e.g., "핀업 지공으로 랭스 확보 및 백엔드 제어")

Bowler Type: ${isThumbless ? 'Thumbless/Two-Handed (Use 2LS format with (2LS) prefix)' : 'Traditional 3-Finger (Use Dual Angle format with (Dual Angle) prefix)'}`;

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

Bowling Ball Model:
- Ball Name: ${ballName || 'Unknown Ball'}

Please generate layout recommendations suited for this specific bowler and ball. Remember to format as a JSON array.`;

  try {
    // 🎯 [오류 방지 - gemini-1.5-flash 고정 및 Structured Output 적용]
    // responseSchema를 명시하여 인공지능이 무조건 우리가 필요로 하는 JSON 배열 규격대로만 대답하게 강제합니다.
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
            type: 'ARRAY',
            description: 'Exactly 4 layout recommendations for different oil conditions',
            items: {
              type: 'OBJECT',
              properties: {
                condition: {
                  type: 'STRING',
                  description: 'One of: Heavy Oil, Medium Oil, Dry Oil, Reference Layout'
                },
                layout: {
                  type: 'STRING',
                  description: 'Dual Angle or 2LS layout string'
                },
                description: {
                  type: 'STRING',
                  description: 'Short reason in Korean'
                },
                intentSummary: {
                  type: 'STRING',
                  description: 'Brief summary under 30 characters in Korean'
                }
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
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error("Gemini 레이아웃 추천 API 에러:", error);
    throw new Error(translateGeminiError(error.message), { cause: error });
  }
};

export const convertLayoutTo2LS = async ({ currentLayout, bowler, spec }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const systemPrompt = `You are a professional bowling layout converter.
Convert the given Dual Angle layout (e.g. 50 x 4 x 35) into Storm's 2LS (Two-Handed Layout System) format (e.g. 4-1/2 x 5 x 2-1/4) for a thumbless/two-handed bowler.
You MUST calculate the conversion by strictly reflecting the bowler's unique specs (RPM, Speed, PAP, Axis Tilt, and Track Flare) to adjust the pin placement and buffer.
Always return a simple JSON object containing:
- dualAngle: The original layout
- twoLS: The converted 2LS layout (which must be prepended with "(2LS) ", e.g., "(2LS) 4-1/2 x 5 x 2-1/4")
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
    return JSON.parse(cleanedContent);
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
Convert the given Storm's 2LS layout (e.g. 4-1/2 x 5 x 2-1/4) into standard Dual Angle format (e.g. 50 x 4 x 35) for a bowler.
You MUST calculate the conversion by strictly reflecting the bowler's unique specs (RPM, Speed, PAP, Axis Tilt, and Track Flare) to adjust the layout.
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
    return JSON.parse(cleanedContent);
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
