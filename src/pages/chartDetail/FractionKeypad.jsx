import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ModalShell from '../../components/ui/ModalShell.jsx';

export default function FractionKeypad({ isOpen, onClose, onConfirm, initialValue = '', title = '수치 입력', extraKeys = [], mode = 'fraction' }) {
  const [value, setValue] = useState('');
  
  // 프리뷰 상태 관리 플래그
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || '');
      setIsPreview(!!initialValue); 
    }
  }, [isOpen, initialValue]);

  // 분수 문자열 정밀 파싱 함수 (3 1/4 -> 3.25)
  const parseFractionToFloat = (str) => {
    if (!str) return 0;
    const cleanStr = String(str).trim();
    if (cleanStr.includes(' ')) {
      const parts = cleanStr.split(' ');
      const whole = parseFloat(parts[0]) || 0;
      const frac = parts[1].split('/');
      if (frac.length === 2) {
        return whole + (parseFloat(frac[0]) / parseFloat(frac[1]));
      }
      return whole;
    } else if (cleanStr.includes('/')) {
      const frac = cleanStr.split('/');
      if (frac.length === 2) {
        return parseFloat(frac[0]) / parseFloat(frac[1]);
      }
    }
    return parseFloat(cleanStr) || 0;
  };

  // 최대공약수(GCD) 연산 함수
  const getGCD = (a, b) => (b === 0 ? a : getGCD(b, a % b));

  // 계산된 실수를 지공 규격인 32분법 기약분수 문자열로 포맷팅하는 함수
  const formatFloatToFraction32 = (val) => {
    if (val <= 0) return '0';
    const total32 = Math.round(val * 32);
    const whole = Math.floor(total32 / 32);
    const rem = total32 % 32;
    if (rem === 0) return String(whole);
    
    const gcd = getGCD(rem, 32);
    const n = rem / gcd;
    const d = 32 / gcd;
    
    if (whole > 0) return `${whole} ${n}/${d}`;
    return `${n}/${d}`;
  };

  // 원터치 버튼 클릭 시 즉시 수치를 가감하여 반영하는 계산 핫-핸들러
  const handleDirectCalc = (diffValue) => {
    setValue((prev) => {
      const currentFloat = parseFractionToFloat(prev || '0');
      const nextFloat = currentFloat + diffValue;
      return formatFloatToFraction32(nextFloat);
    });
    setIsPreview(false); // 증감이 일어나는 순간 흐린 가이드 상태를 즉시 해제(확정 모드 전환)
  };

  // 🟢 [수정 및 원복] 모든 문자(숫자, 기호) 입력을 모드에 맞게 제어하는 통합 핸들러
  const handleCharacterInput = (char) => {
    if (isPreview) {
      setValue(char === ' ' ? '' : char);
      setIsPreview(false);
    } else {
      setValue((prev) => {
        // 💡 오직 스팬 입력 모드일 때만 자동 띄어쓰기 및 슬래시 완성 자동화 작동
        if (mode === 'span') {
          // 첫 번째 정수 입력 뒤 자동 띄어쓰기 유지
          let nextVal = prev;
          if (/^[0-9]$/.test(prev) && /^[0-9]$/.test(char)) {
            nextVal = prev + ' ' + char;
          } else {
            nextVal = prev + char;
          }

          // 슬래시(/) 없는 분수 고속 정규화 엔진
          if (nextVal.includes(' ')) {
            const parts = nextVal.split(' ');
            const whole = parts[0];
            let fracPart = parts.slice(1).join(' ');

            if (!fracPart.includes('/')) {
              if (fracPart.length === 2) {
                const num = fracPart[0];
                const den = fracPart[1];
                if (['2', '4', '8'].includes(den)) {
                  fracPart = `${num}/${den}`;
                }
              } else if (fracPart.length >= 3) {
                const den = fracPart.slice(-2);
                const num = fracPart.slice(0, -2);
                if (['16', '32', '64'].includes(den)) {
                  fracPart = `${num}/${den}`;
                }
              }
            }
            nextVal = `${whole} ${fracPart}`;
          }
          return nextVal;
        }

        // 💡 [원복 완료] 스팬 모드가 아닐 때(오발각도, 일반넘버)는 간섭 차단 및 순수 연속 결합 처리
        return prev + char;
      });
    }
  };

  const handleExtraKeyPress = useCallback((keyToAdd) => {
    setValue((prev) => {
      let nextVal = prev;
      extraKeys.forEach((ek) => {
        nextVal = nextVal.replace(new RegExp(ek, 'g'), '');
      });
      nextVal = nextVal.trim();
      return nextVal ? `${nextVal} ${keyToAdd}` : keyToAdd;
    });
  }, [extraKeys]);

  // 물리 키보드 입력 시 보이는 키패드 키값 이외의 모든 값 차단 알고리즘
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        handleDelete();
        e.preventDefault();
      } else {
        let isAllowed = false;
        if (mode === 'number') {
          isAllowed = /^[0-9]$/.test(e.key);
        } else if (mode === 'span') {
          isAllowed = /^[0-9/\s]$/.test(e.key); // 스팬 모드일 때 "-" 및 허용되지 않은 키값 원천 차단
        } else {
          isAllowed = /^[0-9\-/ ]$/.test(e.key);
        }

        if (isAllowed) {
          handleCharacterInput(e.key);
          e.preventDefault();
        } else {
          if (e.key.length === 1) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, isPreview, onClose, onConfirm, mode]);

  if (!isOpen) return null;

  const handleDelete = () => {
    if (isPreview) {
      setValue('');
      setIsPreview(false);
    } else {
      setValue((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setValue('');
    setIsPreview(false);
  };

  const handleSubmit = () => {
    onConfirm(value.trim());
    onClose();
  };

  // 스팬 모드일 때 하단 패드에서 "-" 가리기 스왑 분기문
  const keys = mode === 'number' ? [
    { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
    { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
    { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
    { value: 'empty', label: '', variant: 'empty' }, { value: '0', label: '0' },
    { action: 'delete', label: '삭제', variant: 'delete' },
  ] : (mode === 'span' ? [
    { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
    { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
    { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
    { value: 'empty', label: '', variant: 'empty' }, { value: '0', label: '0' }, { value: '/', label: '/' },
    { value: ' ', label: '띄어쓰기', variant: 'space' }, { action: 'delete', label: '삭제', variant: 'delete' },
  ] : [
    { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
    { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
    { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
    { value: '-', label: '-' }, { value: '0', label: '0' }, { value: '/', label: '/' },
    { value: ' ', label: '띄어쓰기', variant: 'space' }, { action: 'delete', label: '삭제', variant: 'delete' },
  ]);

  return createPortal(
    <ModalShell
      align="bottom"
      bodyClassName="p-4"
      className="rounded-t-2xl sm:rounded-2xl"
      onClose={onClose}
      size="lg"
      title={title}
      titleId="fraction-keypad-title"
      variant="light"
      zClassName="z-[9999]"
    >
      <div>
        <div className="mb-4 px-2">
          {/* 프리뷰 선명도 60% 투명도 적용 고정 */}
          <div className="text-2xl font-bold tracking-wider bg-slate-100 px-4 py-2.5 rounded-lg min-w-[140px] text-right overflow-x-auto border border-slate-200 min-h-[54px] flex items-center justify-end">
            <span className={`transition-all duration-200 text-indigo-600 ${
              isPreview ? 'opacity-60 font-semibold' : 'font-extrabold'
            }`}>
              {value || <span className="text-slate-400 font-normal text-base">입력하세요</span>}
            </span>
          </div>
        </div>

        {/* 원터치 가감 직통 버튼 모듈 (4열 2행 구조 및 인지 유도 컬러) */}
        {mode === 'span' && (
          <div className="grid grid-cols-4 gap-2 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-200 animate-fade-in">
            {/* 1행: 플러스 즉시 증감 연산 */}
            <button type="button" onClick={() => handleDirectCalc(1/32)} className="h-11 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200/80 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center">+ 1/32</button>
            <button type="button" onClick={() => handleDirectCalc(1/16)} className="h-11 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200/80 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center">+ 1/16</button>
            <button type="button" onClick={() => handleDirectCalc(1/8)} className="h-11 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200/80 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center">+ 1/8</button>
            <button type="button" onClick={() => handleDirectCalc(1/4)} className="h-11 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200/80 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center">+ 1/4</button>
            {/* 2행: 마이너스 즉시 차감 연산 */}
            <button type="button" onClick={() => handleDirectCalc(-1/32)} className="h-11 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200/80 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center">- 1/32</button>
            <button type="button" onClick={() => handleDirectCalc(-1/16)} className="h-11 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200/80 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center">- 1/16</button>
            <button type="button" onClick={() => handleDirectCalc(-1/8)} className="h-11 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200/80 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center">- 1/8</button>
            <button type="button" onClick={() => handleDirectCalc(-1/4)} className="h-11 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200/80 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center">- 1/4</button>
          </div>
        )}

        {extraKeys && extraKeys.length > 0 && (
          <div className="flex gap-2 mb-2">
            {extraKeys.map((key, index) => {
              const label = key === 'Up' ? 'Up (↑)' : key === 'Down' ? 'Down (↓)' : key;
              return (
                <button
                  key={`extra-${index}`}
                  type="button"
                  onClick={() => handleExtraKeyPress(key)}
                  className="flex-1 h-12 sm:h-14 rounded-xl text-base sm:text-lg font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors active:scale-95 flex items-center justify-center"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-2">
          {keys.map((key) => (
            <button
              key={key.action || key.value}
              type="button"
              disabled={key.variant === 'empty'}
              onClick={() => key.action === 'delete' ? handleDelete() : (key.variant !== 'empty' ? handleCharacterInput(key.value) : undefined)}
              className={`h-14 sm:h-16 rounded-xl text-xl sm:text-2xl font-bold transition-colors active:scale-95 flex items-center justify-center ${
                key.variant === 'empty'
                  ? 'opacity-0 pointer-events-none'
                  : key.variant === 'delete'
                  ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                  : key.variant === 'space'
                  ? 'col-span-2 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {key.variant === 'space' || key.variant === 'delete' ? <span className="text-base sm:text-lg">{key.label}</span> : key.label}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button 
            type="button" 
            onClick={handleClear}
            className="h-12 sm:h-14 rounded-xl text-lg font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors active:scale-95"
          >
            초기화
          </button>
          <button 
            type="button" 
            onClick={handleSubmit}
            className="h-12 sm:h-14 rounded-xl text-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
          >
            {mode === 'span' ? '입력' : '확인'}
          </button>
        </div>
      </div>
    </ModalShell>,
    document.body
  );
}