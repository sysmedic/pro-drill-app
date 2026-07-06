// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 'firebase' | 'dual' | 'supabase' 세 가지 모드 제어 스위치
export const dbMode = import.meta.env.VITE_DB_MODE || 'firebase';

if ((dbMode === 'dual' || dbMode === 'supabase') && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('🚨 경고: VITE_DB_MODE가 dual/supabase 모드이지만 환경변수가 누락되었습니다.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
// ... 기존 코드 최하단에 추가
console.log("🔌 [시스템 디버그] 현재 연결된 DB 운영 모드:", dbMode);
console.log("🌐 연결 타깃 나스 URL:", supabaseUrl);