// The two palettes the examples are drawn in (fixed values, so the pictures are the same on every machine),
// and tauler's `themeColor(name, alpha)`. Shared by the render test and the gallery.
import * as d3 from 'd3';

export const ANSI = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const palette = (base, ansi, bright) => ({
  foreground: base[0], background: base[1], 'muted-foreground': base[2], border: base[3],
  ...Object.fromEntries(ANSI.map((n, i) => ['ansi-' + n, ansi[i]])),
  ...Object.fromEntries(ANSI.map((n, i) => ['ansi-bright-' + n, bright[i]])),
});
export const PALETTES = {
  light: palette(['#2b2f3a', '#fbfbfd', '#6b7280', '#d5d9e0'],
    ['#2b2f3a', '#c8372d', '#2e8b57', '#b7791f', '#2563c9', '#a8379c', '#0e8a9a', '#c9ccd3'],
    ['#4b5060', '#e0463b', '#3aa56b', '#d19028', '#3b7be0', '#c04cb3', '#1aa3b5', '#e7e9ee']),
  dark: palette(['#c9d1d9', '#14161c', '#8b93a1', '#2f3542'],
    ['#2f3542', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6'],
    ['#4b5263', '#ff8fa3', '#b4e07f', '#f0c27c', '#93b4ff', '#cdb2ff', '#9be0ff', '#d5d9ee']),
};

// tauler's `themeColor(token, alpha)` (tauler-core/src/theme/resolver.rs, `theme_color` and `color_with_alpha`):
// the colour the token names in `colors`, or the token itself when it names none; with an alpha it is
// `#rrggbbaa`, the alpha clamped to 0..1. A `#rrggbb` keeps its digits; any other form (`#rgb`, `#rrggbbaa`,
// `rgb()`, a CSS name) is parsed and its own alpha multiplied by the given one; a value that is no colour
// comes back unchanged. Not mirrored: `oklch()` (d3 cannot parse it; the palettes here are hex).
const byte = n => Math.round(n).toString(16).padStart(2, '0');
export const themeColorFor = colors => (token, alpha) => {
  const value = colors[token] ?? token;
  if (alpha == null) return value;
  const a = Math.min(1, Math.max(0, alpha));
  if (/^#[0-9a-f]{6}$/i.test(value)) return value + byte(a * 255);
  const c = d3.color(value);
  if (!c) return value;
  return '#' + byte(c.r) + byte(c.g) + byte(c.b) + byte(c.opacity * a * 255);
};
