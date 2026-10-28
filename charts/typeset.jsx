// Laying out text from `measure`: wrapped lines, rotated boxes, and whether a block fits a box.
// Pure functions of their arguments (SPEC 5.4, "Text").

export const LINE_HEIGHT = 1.2;   // of the font size, between baselines
const PAD = 3;                    // between a box edge and the text inside it

// `text` as lines no wider than `width` px: explicit "\n" breaks, then greedy word wrap. A word
// wider than `width` alone is cut by characters, so no line is ever wider (unless one character is).
export function wrap(text, width, measure, size) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    if (!(width > 0)) { lines.push(paragraph); continue; }
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const joined = current ? current + ' ' + word : word;
      if (measure(joined, size) <= width) { current = joined; continue; }
      if (current) lines.push(current);
      current = '';
      let rest = word;
      while (rest.length > 1 && measure(rest, size) > width) {
        let n = rest.length - 1;
        while (n > 1 && measure(rest.slice(0, n), size) > width) n--;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      current = rest;
    }
    lines.push(current);
  }
  return lines;
}

export const blockHeight = (n, size) => size + (n - 1) * size * LINE_HEIGHT;

// A text box w x h hung from its anchor point: u runs along the text from the anchor (start:
// 0..w, middle: -w/2..w/2, end: -w..0), v down 0..h. Rotated by `deg` clockwise about the anchor,
// it reaches this far from the anchor on each side, in px.
export function extentOf(w, h, deg, anchor = 'middle') {
  const u0 = anchor === 'end' ? -w : anchor === 'start' ? 0 : -w / 2, t = deg * Math.PI / 180;
  const pts = [[u0, 0], [u0 + w, 0], [u0 + w, h], [u0, h]].map(([u, v]) => [u * Math.cos(t) - v * Math.sin(t), u * Math.sin(t) + v * Math.cos(t)]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { left: -Math.min(...xs), right: Math.max(...xs), up: -Math.min(...ys), down: Math.max(...ys) };
}

// `rotate(deg x y)`, the transform that turns a text shape about its anchor.
export const rotation = (deg, x, y) => `rotate(${deg} ${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100})`;

// Whether `lines` fit a box of w x h px, with a margin inside it.
export function fitsBox(lines, w, h, measure, size) {
  return lines.every(l => measure(l, size) + PAD + 1 <= w) && blockHeight(lines.length, size) + PAD <= h;
}
export { PAD };
