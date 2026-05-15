import React from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

const Login = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("로그인 성공:", result.user.displayName);
      
      // 베타 테스트 기간 체크 로직 호출 (기존 로직 유지)
      if (!isBetaValid()) {
        auth.signOut();
        alert("베타 테스트 기간이 종료되었습니다.");
      }
    } catch (error) {
      console.error("로그인 에러:", error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6">
      {/* 1. "지공차트 지원" 대신 "Drilling Support" 적용 */}
      <div className="mb-14 text-center">
        <h1 className="text-slate-800 text-[28px] font-black tracking-[0.1em] uppercase">
          Drilling Support
        </h1>
        <div className="w-12 h-1 bg-[#4F46E5] mx-auto mt-4 rounded-full"></div>
      </div>

      {/* 2. 구글 로그인 버튼 (이미지와 동일한 스타일) */}
      <button 
        onClick={handleLogin}
        className="w-full max-w-[340px] bg-[#4F46E5] text-white py-5 rounded-[20px] font-bold text-[16px] shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
      >
        구글 계정으로 시작하기
      </button>

      {/* 하단 버전 정보 */}
      <p className="mt-16 text-[10px] text-slate-300 font-bold tracking-widest uppercase">
        Master Edition 2026
      </p>
    </div>
  );
};

// 간단한 베타 기간 체크 함수 (기존 로직 유지)
const isBetaValid = () => {
  const expiryDate = new Date('2026-06-30');
  return new Date() <= expiryDate;
};

export default Login;