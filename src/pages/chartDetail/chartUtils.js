const getGCD = (a, b) => (b === 0 ? a : getGCD(b, a % b));

export const getReducedFraction = (num, den) => {
  if (num === 0) return '0';
  const gcd = getGCD(num, den);
  const reducedNum = num / gcd;
  const reducedDen = den / gcd;
  if (reducedDen === 1) return String(reducedNum);
  if (reducedNum > reducedDen) {
    const whole = Math.floor(reducedNum / reducedDen);
    const rem = reducedNum % reducedDen;
    return `${whole} ${rem}/${reducedDen}`;
  }
  return `${reducedNum}/${reducedDen}`;
};

export const PITCH_OPTIONS_32 = Array.from({ length: 33 }, (_, i) => getReducedFraction(i, 32));

export const parseFraction = (str) => {
  if (!str) return 0;
  const cleanStr = String(str).split('(')[0].trim();
  const parts = cleanStr.split(' ');
  if (parts.length === 2 && parts[1].includes('/')) {
    const whole = parseFloat(parts[0]);
    const frac = parts[1].split('/');
    return whole + (parseFloat(frac[0]) / parseFloat(frac[1]));
  } else if (parts.length === 1) {
    if (parts[0].includes('/')) {
      const frac = parts[0].split('/');
      return parseFloat(frac[0]) / parseFloat(frac[1]);
    }
    return parseFloat(parts[0]);
  }
  return 0;
};

export const getDefaultHoleCutSize = (insertSize) => {
  if (!insertSize) return '31/32';
  const num = parseFraction(insertSize);
  if (num >= 55 / 64) return '1 1/32';
  return '31/32';
};

export const getDefaultThumbHoleCutSize = (slugType, gender) => {
  const type = String(slugType || '').trim().toUpperCase();
  if (type.includes('IT')) return '1 3/8';
  if (type.includes('스위치') || type.includes('조포')) return '1 1/2';
  if (gender === '여') return '1 1/8';
  return '1 1/4';
};

export const toFraction64 = (num) => {
  if (num <= 0) return '';
  const totalNumerator = Math.round(num * 64);
  const whole = Math.floor(totalNumerator / 64);
  const numerator = totalNumerator % 64;

  if (numerator === 0) return String(whole);

  let n = numerator;
  let d = 64;
  while (n % 2 === 0 && d % 2 === 0) {
    n /= 2;
    d /= 2;
  }

  if (whole > 0) {
    return `${whole} ${n}/${d}`;
  }
  return `${n}/${d}`;
};

export const getBevelOptions = (holeSize) => {
  const baseNum = parseFraction(holeSize);
  if (!baseNum) return [];
  const maxNum = 1.125; 
  const options = [];
  let currentNum = baseNum + 1 / 64;
  while (Math.round(currentNum * 64) <= Math.round(maxNum * 64)) {
    options.push(toFraction64(currentNum));
    currentNum += 1 / 64;
  }
  return options;
};

export const getDynamicOvalOptions = (holeSize, defaultOptions) => {
  const baseNum = parseFraction(holeSize);
  if (!baseNum) return defaultOptions;
  const maxNum = 1.25; 
  const options = [];
  let currentNum = baseNum;
  while (Math.round(currentNum * 64) <= Math.round(maxNum * 64)) {
    options.push(toFraction64(currentNum));
    currentNum += 1 / 64;
  }
  return options;
};