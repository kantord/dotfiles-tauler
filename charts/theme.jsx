// tauler's colour tokens as a chart theme. Plain JS, so it is testable outside tauler.
import { defaultTheme } from './core.jsx';

// Series colours when a theme defines no chart-1..5.
const FALLBACK_SERIES = ['ansi-blue', 'ansi-yellow', 'ansi-green', 'ansi-magenta', 'ansi-cyan', 'ansi-red'];

// `font` is the layout's own font: with a monospace face such as JetBrains Mono, the default
// text measure (0.6 em per character) is exact. Throws on a missing required token rather than
// drawing black.
export function chartTheme(themeColor, font) {
  // themeColor hands back a name the theme doesn't define unchanged, which is not a colour.
  const defined = name => { const v = themeColor(name); return v && v !== name ? v : undefined; };
  const required = (name, alpha) => {
    if (!defined(name)) throw new Error(`chartTheme: the theme has no '${name}' colour`);
    return alpha == null ? themeColor(name) : themeColor(name, alpha);
  };
  const chart = [1, 2, 3, 4, 5].map(i => defined('chart-' + i)).filter(Boolean);
  const fallback = FALLBACK_SERIES.map(defined).filter(c => c && !chart.includes(c));
  const palette = [...chart, ...fallback].slice(0, Math.max(5, chart.length));
  return {
    ink: required('foreground'),
    muted: required('muted-foreground'),
    line: required('border'),
    lineSoft: required('border', 0.5),
    lineStrong: required('foreground', 0.3),
    palette: palette.length ? palette : defaultTheme.palette,
    font: font ?? defaultTheme.font,
  };
}
