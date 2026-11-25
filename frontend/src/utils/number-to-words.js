const DIGITS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

const readGroup = (group, forceFull) => {
  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const units = group % 10;
  const parts = [];

  if (hundreds > 0 || forceFull) {
    parts.push(`${DIGITS[hundreds]} trăm`);
  }

  if (tens > 1) {
    parts.push(`${DIGITS[tens]} mươi`);
    if (units === 1) parts.push('mốt');
    else if (units === 4) parts.push('tư');
    else if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(DIGITS[units]);
  } else if (tens === 1) {
    parts.push('mười');
    if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(DIGITS[units]);
  } else if (units > 0) {
    if (hundreds > 0 || forceFull) parts.push('lẻ');
    parts.push(DIGITS[units]);
  }

  return parts.join(' ');
};

export const numberToVietnameseWords = (value) => {
  const amount = Math.round(Number(value) || 0);

  if (amount === 0) return 'Không đồng';
  if (amount < 0) {
    return `Âm ${numberToVietnameseWords(Math.abs(amount)).replace(/^./, (c) => c.toLowerCase())}`;
  }

  const groups = [];
  let rest = amount;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const parts = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (group === 0) continue;
    const scale = SCALES[index] ?? '';
    const isLeading = parts.length === 0;
    const text = readGroup(group, !isLeading);
    parts.push([text, scale].filter(Boolean).join(' '));
  }

  const sentence = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${sentence.charAt(0).toLocaleUpperCase('vi-VN')}${sentence.slice(1)} đồng`;
};

export default numberToVietnameseWords;
