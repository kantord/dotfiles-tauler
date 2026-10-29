// The tailwind utilities the examples may use on their layout elements, as CSS. tauler lays out real
// tailwind; the gallery has no tailwind (it must work offline), so this is the whole supported set.
// `cssFor(cls)` returns the declarations of one class, or null when it is not supported.
const px = v => (v === '0' ? '0' : `${v}px`);
const unit = v => (/^\[(\d+(?:\.\d+)?)px\]$/.test(v) ? px(v.slice(1, -3)) : /^\d+(\.\d+)?$/.test(v) ? px(v * 4) : null);
const FIXED = {
  flex: 'display:flex', 'flex-row': 'flex-direction:row', 'flex-col': 'flex-direction:column',
  'flex-shrink-0': 'flex-shrink:0', 'flex-1': 'flex:1 1 0%',
  'items-start': 'align-items:flex-start', 'items-center': 'align-items:center', 'items-end': 'align-items:flex-end',
  'items-baseline': 'align-items:baseline', 'items-stretch': 'align-items:stretch',
  'justify-start': 'justify-content:flex-start', 'justify-center': 'justify-content:center', 'justify-end': 'justify-content:flex-end',
  'justify-between': 'justify-content:space-between', 'justify-around': 'justify-content:space-around',
  'w-full': 'width:100%', 'h-full': 'height:100%',
  'text-xs': 'font-size:12px;line-height:16px', 'text-sm': 'font-size:14px;line-height:20px',
  'font-bold': 'font-weight:700', 'font-medium': 'font-weight:500',
  rounded: 'border-radius:4px', 'rounded-full': 'border-radius:9999px',
  'overflow-hidden': 'overflow:hidden', truncate: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
  uppercase: 'text-transform:uppercase',
  'tracking-tight': 'letter-spacing:-0.025em', 'tracking-wide': 'letter-spacing:0.025em', 'tracking-wider': 'letter-spacing:0.05em', 'tracking-widest': 'letter-spacing:0.1em',
};
const SIDES = { p: ['padding'], px: ['padding-left', 'padding-right'], py: ['padding-top', 'padding-bottom'], pt: ['padding-top'], pr: ['padding-right'], pb: ['padding-bottom'], pl: ['padding-left'] };

export function cssFor(cls) {
  if (FIXED[cls]) return FIXED[cls];
  let m;
  if ((m = cls.match(/^gap(?:-([xy]))?-(.+)$/)) && unit(m[2])) return `${m[1] === 'x' ? 'column-gap' : m[1] === 'y' ? 'row-gap' : 'gap'}:${unit(m[2])}`;
  if ((m = cls.match(/^(p[xytrbl]?)-(.+)$/)) && unit(m[2])) return SIDES[m[1]].map(p => `${p}:${unit(m[2])}`).join(';');
  if ((m = cls.match(/^([wh])-(\[.+\])$/)) && unit(m[2])) return `${m[1] === 'w' ? 'width' : 'height'}:${unit(m[2])}`;
  if ((m = cls.match(/^text-(\[.+\])$/)) && unit(m[1])) return `font-size:${unit(m[1])}`;
  if ((m = cls.match(/^opacity-(\d+)$/)) && +m[1] <= 100) return `opacity:${m[1] / 100}`;
  return null;
}

const escapeSelector = cls => cls.replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c);
// The stylesheet for a set of class names; throws on one that is not supported.
export function stylesheet(classes, where = '') {
  return [...new Set(classes)].sort().map(cls => {
    const css = cssFor(cls);
    if (css === null) throw new Error(`unsupported tailwind class "${cls}"${where ? ` in ${where}` : ''}; add it to charts/examples/classes.js or drop it from the example`);
    return `.${escapeSelector(cls)}{${css}}`;
  }).join('\n');
}
