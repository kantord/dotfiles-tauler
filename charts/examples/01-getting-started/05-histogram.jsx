// title: A histogram with bin
// section: Getting started
//
// bin is an ordinary function that turns rows into counted intervals: [{ x0, x1, count }]. Call it in the layout and give its result to the Plot as data.
// Because a bin has two ends, Bar takes x1 and x2 instead of a single x.
import { Plot, Bar, Axis, bin, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Request latencies in milliseconds: mostly fast, a few slow.
// (A fixed pseudo-random sequence, so the picture is the same on every run.)
const latencies = Array.from({ length: 200 }, (_, i) => {
  const u = (Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1) || 0.5;
  return { ms: Math.round(20 - 14 * Math.log(1 - u * 0.97)) };
});

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // bin() returns rows { x0, x1, count }: the interval [x0, x1) and how many latencies fall in it.
  // thresholds: 10 asks for about ten intervals of equal width.
  const bins = bin(latencies, { value: "ms", thresholds: 10 });
  return (
    <Plot width={248} height={110} theme={theme} data={bins}>
      <Bar x1="x0" x2="x1" y="count" />
      <Axis channel="x" ticks={5} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
