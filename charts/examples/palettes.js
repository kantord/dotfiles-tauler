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

// tauler's `themeColor(name, alpha)`: the token's colour, with an alpha when given; an unknown name comes back unchanged.
export const themeColorFor = colors => (name, alpha) => {
  const c = colors[name];
  if (!c) return name;
  if (alpha == null) return c;
  const { r, g, b } = d3.rgb(c);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
