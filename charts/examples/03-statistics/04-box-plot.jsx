// title: A box plot
// section: Statistics
//
// boxStats returns one row per group: the quartiles, the whiskers and the outliers. A box plot is that statistic drawn by ordinary marks: a Link for the whisker, a Rect for the box, a Rect of zero height for the median, and Dots for the outliers.
// A mark with its own data (the Dot) is a separate layer and shares only the scales.
import { Plot, Link, Rect, Dot, Axis, boxStats, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Request latencies by service: nine spread values plus one far outlier each (3.2 times the base).
const spread = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const latencies = [["api", 40, 6], ["db", 25, 3], ["cache", 8, 1.5]].flatMap(([service, base, k]) =>
  [...spread.map(i => ({ service, ms: base + k * (i - 4) * 1.2 + (i % 3) })), { service, ms: base * 3.2 }]);

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // boxStats() returns rows { key, lo, q1, med, q3, hi, outliers }: lo and hi are the whisker ends (within 1.5 IQR), outliers the rows beyond.
  const boxes = boxStats(latencies, { by: "service", value: "ms" });
  const outliers = boxes.flatMap(b => b.outliers.map(d => ({ key: b.key, ms: d.ms })));
  return (
    <Plot width={248} height={120} theme={theme} data={boxes} x="key">
      <Link y1="lo" y2="hi" />
      <Rect y1="q1" y2="q3" inset={12} fillOpacity={0.35} stroke={theme.ink} />
      <Rect y1="med" y2="med" inset={12} stroke={theme.ink} strokeWidth={2} />
      <Dot data={outliers} x="key" y="ms" r={2.5} />
      <Axis channel="x" />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
