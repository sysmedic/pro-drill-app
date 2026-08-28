export const PITCH_OPTIONS = ["0", "1/16", "1/8", "3/16", "1/4", "5/16", "3/8", "7/16", "1/2", "9/16", "5/8", "11/16", "3/4", "13/16", "7/8", "15/16", "1"];
export const MOISTURE_OPTIONS = ["건조", "보통", "다습"];
export const STIFFNESS_OPTIONS = ["유연", "보통", "뻣뻣"];
export const SPAN_TYPE_OPTIONS = ["Actual Span", "Cut to Cut", "Center to Center"];
export const LATERAL_DIR_OPTIONS = [{ value: 'left', label: '◀ Left' }, { value: 'right', label: 'Right ▶' }];
export const TIP_OPTIONS = ["Semi", "Power", "Oval"];
export const THUMB_TYPE_OPTIONS = ["Oval", "X900", "US", "IT", "Switch", "JOPO"];

const gcd = (a, b) => b ? gcd(b, a % b) : a;

export const getReducedFraction = (num, den) => {
  const div = gcd(num, den);
  const n = num / div;
  const d = den / div;
  if (d === 1) return `${n}`;
  if (n > d) {
    const whole = Math.floor(n / d);
    const rem = n % d;
    return rem === 0 ? `${whole}` : `${whole} ${rem}/${d}`;
  }
  return `${n}/${d}`;
};

export const generateFractions = (startNum, endNum, den = 64) => {
  const res = [];
  for (let i = startNum; i <= endNum; i++) res.push(getReducedFraction(i, den));
  return res;
};

export const FINGER_INSERT_OPTIONS = [
  "17/32 (0호)",
  "9/16 (0.5호)",
];
for (let i = 38; i <= 58; i++) {
  FINGER_INSERT_OPTIONS.push(`${getReducedFraction(i, 64)} (${1 + (i - 38) * 0.5}호)`);
}

export const HOLE_OPTIONS = generateFractions(32, 64);
export const OVAL_OPTIONS = generateFractions(32, 80);

export const getEdgePoint = (p1, p2, r) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist === 0 ? p1 : { x: p1.x + (dx / dist) * r, y: p1.y + (dy / dist) * r };
};

export const commonBoxClass = "border border-slate-400 bg-white flex items-center justify-center text-[16px] font-bold text-black shadow-sm rounded-sm";
