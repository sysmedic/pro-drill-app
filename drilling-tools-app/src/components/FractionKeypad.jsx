import { useEffect, useState, useCallback } from 'react';
import ModalShell from './ui/ModalShell.jsx';

export default function FractionKeypad({
  isOpen,
  onClose,
  onConfirm,
  initialValue = '',
  ghostValue = '',
  title = '수치 입력',
  extraKeys = [],
  mode = 'fraction',
}) {
  const [value, setValue] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isGhostActive, setIsGhostActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        setValue(initialValue);
        setIsPreview(true);
        setIsGhostActive(false);
      } else if (ghostValue) {
        setValue(ghostValue);
        setIsPreview(true);
        setIsGhostActive(true); // 잔상 활성화 상태
      } else {
        setValue('');
        setIsPreview(false);
        setIsGhostActive(false);
      }
    }
  }, [isOpen, initialValue, ghostValue]);

  const parseFractionToFloat = (str) => {
    if (!str) return 0;
    let cleanStr = String(str).trim();
    let isNegative = false;
    if (cleanStr.startsWith('-')) {
      isNegative = true;
      cleanStr = cleanStr.slice(1).trim();
    }
    let val = 0;
    if (cleanStr.includes(' ')) {
      const parts = cleanStr.split(' ');
      const whole = parseFloat(parts[0]) || 0;
      const frac = parts[1].split('/');
      if (frac.length === 2) {
        val = whole + parseFloat(frac[0]) / parseFloat(frac[1]);
      } else {
        val = whole;
      }
    } else if (cleanStr.includes('/')) {
      const frac = cleanStr.split('/');
      if (frac.length === 2) {
        val = parseFloat(frac[0]) / parseFloat(frac[1]);
      }
    } else {
      val = parseFloat(cleanStr) || 0;
    }
    return isNegative ? -val : val;
  };

  const getGCD = (a, b) => (b === 0 ? a : getGCD(b, a % b));

  const formatFloatToFraction32 = (val) => {
    if (val === 0) return '0';
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const total32 = Math.round(absVal * 32);
    const whole = Math.floor(total32 / 32);
    const rem = total32 % 32;

    let res = '';
    if (rem === 0) {
      res = String(whole);
    } else {
      const gcd = getGCD(rem, 32);
      const n = rem / gcd;
      const d = 32 / gcd;
      if (whole > 0) res = `${whole} ${n}/${d}`;
      else res = `${n}/${d}`;
    }

    return isNegative && res !== '0' ? `-${res}` : res;
  };

  // 가감 버튼 연산 (잔상 수치가 있으면 잔상 기준 가감)
  const handleDirectCalc = (diffValue) => {
    setValue((prev) => {
      const baseStr = isGhostActive ? ghostValue : prev;
      const currentFloat = parseFractionToFloat(baseStr || '0');
      const nextFloat = currentFloat + diffValue;
      return formatFloatToFraction32(nextFloat);
    });
    setIsPreview(false);
    setIsGhostActive(false); // 잔상 해제
  };

  const isNoMinusField =
    title === 'RPM' ||
    title?.includes('구속') ||
    title?.includes('PAP') ||
    mode === 'span' ||
    title?.includes('Span') ||
    title?.includes('스판') ||
    title?.includes('각도');

  const handleCharacterInput = (char) => {
    if (isNoMinusField && char === '-') return;
    if (isGhostActive || isPreview) {
      setValue(char === ' ' ? '' : char);
      setIsPreview(false);
      setIsGhostActive(false);
    } else {
      setValue((prev) => {
        const isFractionAutoMode = mode === 'span' || title?.includes('PAP') || title?.includes('스판');
        if (isFractionAutoMode) {
          let nextVal = prev;
          if (/^[0-9]$/.test(prev) && /^[0-9]$/.test(char)) {
            nextVal = prev + ' ' + char;
          } else {
            nextVal = prev + char;
          }

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

        if (prev === '0' && /^[0-9]$/.test(char)) {
          return char;
        }
        return prev + char;
      });
    }
  };

  const handleExtraKeyPress = useCallback(
    (keyToAdd) => {
      setValue((prev) => {
        let nextVal = isGhostActive ? '' : prev;
        extraKeys.forEach((ek) => {
          nextVal = nextVal.replace(new RegExp(ek, 'g'), '');
        });
        nextVal = nextVal.trim();
        return nextVal ? `${nextVal} ${keyToAdd}` : keyToAdd;
      });
      setIsGhostActive(false);
    },
    [extraKeys, isGhostActive]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === '-' && isNoMinusField) {
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') {
        handleSubmit();
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        handleDelete();
        e.preventDefault();
      } else {
        let isAllowed = false;
        if (mode === 'number') {
          isAllowed = /^[0-9-]$/.test(e.key);
        } else if (mode === 'span') {
          isAllowed = /^[0-9/-\s]$/.test(e.key);
        } else {
          isAllowed = /^[0-9/-]$/.test(e.key);
        }

        if (isAllowed) {
          handleCharacterInput(e.key);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, isPreview, isGhostActive, onClose, onConfirm, mode, extraKeys]);

  if (!isOpen) return null;

  const handleDelete = () => {
    if (isGhostActive || isPreview) {
      setValue('');
      setIsPreview(false);
      setIsGhostActive(false);
    } else {
      setValue((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setValue('');
    setIsPreview(false);
    setIsGhostActive(false);
  };

  const handleSubmit = () => {
    onConfirm(value.trim());
    onClose();
  };

  return (
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
          <div className="text-2xl font-bold tracking-wider bg-slate-100 px-4 py-2.5 rounded-lg min-w-[140px] text-right overflow-x-auto border border-slate-200 min-h-[54px] flex items-center justify-end">
            <span
              className={`transition-all duration-200 text-indigo-600 ${
                isGhostActive
                  ? 'opacity-40 italic font-normal text-slate-500'
                  : isPreview
                  ? 'opacity-60 font-semibold'
                  : 'font-extrabold'
              }`}
            >
              {value || <span className="text-slate-400 font-normal text-base">입력하세요</span>}
            </span>
          </div>
        </div>

        {extraKeys && extraKeys.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {extraKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleExtraKeyPress(key)}
                className="h-12 rounded-xl font-extrabold text-base bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                {key === 'Up' ? '▲ Up' : key === 'Down' ? '▼ Down' : key}
              </button>
            ))}
          </div>
        )}

        {mode === 'span' && (
          <div className="grid grid-cols-4 gap-2 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-200 animate-fade-in">
            <button
              type="button"
              onClick={() => handleDirectCalc(1 / 32)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              + 1/32
            </button>
            <button
              type="button"
              onClick={() => handleDirectCalc(1 / 16)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              + 1/16
            </button>
            <button
              type="button"
              onClick={() => handleDirectCalc(1 / 8)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              + 1/8
            </button>
            <button
              type="button"
              onClick={() => handleDirectCalc(1 / 4)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              + 1/4
            </button>
            <button
              type="button"
              onClick={() => handleDirectCalc(-1 / 32)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              - 1/32
            </button>
            <button
              type="button"
              onClick={() => handleDirectCalc(-1 / 16)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              - 1/16
            </button>
            <button
              type="button"
              onClick={() => handleDirectCalc(-1 / 8)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              - 1/8
            </button>
            <button
              type="button"
              onClick={() => handleDirectCalc(-1 / 4)}
              className="h-10 rounded-lg font-bold text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              - 1/4
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-2 relative">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleCharacterInput(num)}
              className="h-12 sm:h-14 rounded-xl text-xl sm:text-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}

          {mode === 'number' ? (
            <>
              {!isNoMinusField ? (
                <button
                  type="button"
                  onClick={() => handleCharacterInput('-')}
                  className="h-12 sm:h-14 rounded-xl text-xl sm:text-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
              ) : (
                <div className="h-12 sm:h-14 opacity-0 pointer-events-none" />
              )}
              <button
                type="button"
                onClick={() => handleCharacterInput('0')}
                className="h-12 sm:h-14 rounded-xl text-xl sm:text-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-12 sm:h-14 rounded-xl text-base sm:text-lg font-bold bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
              >
                삭제
              </button>
            </>
          ) : (
            <>
              {!isNoMinusField ? (
                <button
                  type="button"
                  onClick={() => handleCharacterInput('-')}
                  className="h-12 sm:h-14 rounded-xl text-xl sm:text-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
              ) : (
                <div className="h-12 sm:h-14 opacity-0 pointer-events-none" />
              )}

              <button
                type="button"
                onClick={() => handleCharacterInput('0')}
                className="h-12 sm:h-14 rounded-xl text-xl sm:text-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => handleCharacterInput('/')}
                className="h-12 sm:h-14 rounded-xl text-xl sm:text-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
              >
                /
              </button>

              <button
                type="button"
                onClick={() => handleCharacterInput(' ')}
                className="col-span-2 h-12 sm:h-14 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95 font-bold text-base sm:text-lg flex items-center justify-center cursor-pointer"
              >
                띄어쓰기
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="h-12 sm:h-14 rounded-xl text-base sm:text-lg font-bold bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
              >
                삭제
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-xl text-base font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors active:scale-95 cursor-pointer"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="h-11 rounded-xl text-base font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md active:scale-95 cursor-pointer"
          >
            {mode === 'span' ? '입력' : '확인'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
