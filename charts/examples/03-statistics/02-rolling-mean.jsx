// title: A rolling mean per series
// section: Statistics
//
// rolling adds the mean of the last few values to every row. With by it works inside each series, so two hosts in one list of rows do not leak into each other.
// The raw samples stay as a faint line underneath; the colour channel splits both lines per host.
import { Plot, Line, Axis, rolling, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Response times of two hosts, rows ordered by time within each host.
const rows = ["web-1", "web-2"].flatMap((host, k) =>
  Array.from({ length: 30 }, (_, t) => ({ host, t, ms: 40 + 25 * k + 14 * Math.sin(t * (1.9 + k)) + 8 * Math.sin(t / 4) })));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // rolling() returns every row plus the field named by `as` ("mean"): the mean of the last `window` (6) ms values of that host.
  const smooth = rolling(rows, { by: "host", value: "ms", window: 6, as: "mean" });
  return (
    <Plot width={248} height={110} theme={theme} data={smooth} x="t" color="host">
      <Line y="ms" opacity={0.3} />
      <Line y="mean" strokeWidth={2} />
      <Axis channel="x" ticks={4} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
