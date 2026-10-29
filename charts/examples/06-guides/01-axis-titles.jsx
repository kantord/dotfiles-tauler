// title: Axis titles
// section: Guides
//
// label on an Axis adds a title, centred along the axis and rotated on a y axis. The plot makes room for it by itself.
// Ticks can be a count or a list of values, and format takes a d3 format string or a function.
import { Plot, Line, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented data: memory growing 8 MB per sample (every 2 seconds), with a slow wobble.
const samples = Array.from({ length: 30 }, (_, t) => ({ secs: t * 2, mb: 300 + 8 * t + 40 * Math.sin(t / 3) }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={130} theme={theme} data={samples} x="secs" y="mb">
      <Line />
      <Axis channel="x" label="seconds" ticks={[0, 20, 40, 60]} />
      <Axis channel="y" label="memory (MB)" ticks={3} />
    </Plot>
  );
}
