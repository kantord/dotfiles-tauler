// Text width without a DOM (SPEC 5.4): a per-font advance table. The Draw runtime has no layout
// (`getBBox` is 0), so a width is an estimate. Method and error: SPEC 9, "Text width".
//
// Advances in 1/1000 em for ASCII 32..126, read from the hmtx table of Liberation Sans and
// Liberation Serif (SIL OFL 1.1; metric-compatible with Arial/Helvetica and Times New Roman) by
// fontTools. No kerning: it moves a string's width by under 0.1% in these two faces.
const SANS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778,
  722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const SERIF = [250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500,
  500, 500, 278, 278, 564, 564, 564, 444, 921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722,
  667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500, 333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500,
  278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541];
// Common punctuation beyond ASCII: [sans, serif]. An accented letter is measured as its base letter.
const EXTRA = { '…': [1000, 1000], '–': [556, 500], '—': [1000, 1000], '‘': [222, 333], '’': [222, 333], '“': [333, 444], '”': [333, 444],
  '•': [350, 350], '·': [333, 333], '°': [400, 400], '±': [549, 549], '×': [584, 564] };

const MONO = 600;   // every advance of a monospace face; also the fallback for an unknown font or character

// Which table a CSS font stack uses: the first family we know, as browsers fall through unknown names.
const KINDS = [['mono', /mono|courier|consolas|menlo|monaco|\bcode\b|cascadia|hack|iosevka/],
  ['sans', /sans|helvetica|arial|system-ui|-apple-system|segoe|roboto|\binter\b|verdana/],
  ['serif', /serif|times|georgia|garamond|palatino|cambria/]];
export function kindOf(font) {
  for (const family of String(font ?? '').toLowerCase().split(',')) {
    const known = KINDS.find(([, re]) => re.test(family));
    if (known) return known[0];
  }
  return 'mono';
}

// Characters that take no room of their own: combining marks, the zero-width joiner, variation selectors.
const ZERO = /^[\p{M}\u200B-\u200D\u2060\uFE00-\uFE0F]$/u;
// Full-width characters (CJK, Hangul, full-width forms) and emoji: two columns in a monospace face, one em otherwise.
const WIDE = /^[\u1100-\u115F\u2E80-\u303E\u3041-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{20000}-\u{3FFFD}]$/u;
const isCJK = char => WIDE.test(char) && char.codePointAt(0) < 0x1F000;

function advance(char, kind) {
  if (ZERO.test(char)) return 0;
  if (isCJK(char)) return 1000;
  const code = char.charCodeAt(0), column = kind === 'sans' ? 0 : 1;
  if (code >= 32 && code < 127) return (column ? SERIF : SANS)[code - 32];
  if (EXTRA[char]) return EXTRA[char][column];
  const base = char.normalize('NFD')[0];
  return base !== char && base.charCodeAt(0) < 127 ? advance(base, kind) : MONO;
}

// (text, size) -> px width, for the font stack. A monospace or unknown font is 0.6 em a column: a
// character is one column, a full-width character or an emoji two, a combining mark none.
export function measureFor(font) {
  const kind = kindOf(font);
  if (kind === 'mono') {
    return (text, size) => {
      let columns = 0;
      for (const char of String(text)) columns += ZERO.test(char) ? 0 : WIDE.test(char) ? 2 : 1;
      return columns * size * 0.6;
    };
  }
  return (text, size) => {
    let sum = 0;
    for (const char of String(text)) sum += advance(char, kind);
    return sum * size / 1000;
  };
}
