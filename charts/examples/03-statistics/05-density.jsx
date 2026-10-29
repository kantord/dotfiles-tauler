// title: A density curve with kde
// section: Statistics
//
// kde smooths a list of values into a curve: [{ x, density }]. It is a better histogram when you want the shape and not the bins.
// Area fills from zero by default, and a Line on top gives it an edge.
import { Plot, Area, Line, Axis, kde, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Request latencies: a fast bulk and a slower second group.
// (A fixed pseudo-random sequence, so the picture is the same on every run.)
const latencies = Array.from({ length: 120 }, (_, i) => {
  const u = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1;
  return { ms: i % 4 === 0 ? 90 + 40 * u : 25 + 20 * u };
});

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // kde() returns rows { x, density }: `points` (60) evenly spaced latencies and the smoothed density at each; the bandwidth is chosen by Silverman's rule.
  const curve = kde(latencies, { value: "ms", points: 60 });
  return (
    <Plot width={248} height={110} theme={theme} data={curve} x="x" y="density">
      <Area fillOpacity={0.25} curve="monotone" />
      <Line curve="monotone" />
      <Axis channel="x" ticks={5} />
    </Plot>
  );
}
