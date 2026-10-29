// title: Cumulative sum
// section: Statistics
//
// cumsum gives every row the running total before it (from) and after it (to). A staircase of running totals is a Line with a step curve over "to".
// The same rows drawn as Rect y1="from" y2="to" make a waterfall.
import { Plot, Line, Dot, Axis, cumsum, chartTheme } from "@gh/kantord/dotfiles-tauler";

const perDay = [3, 5, 2, 8, 6, 0, 1, 4, 9, 7, 5, 2].map((commits, i) => ({ day: i + 1, commits }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // cumsum() returns every row plus { from, to }: the running total before and after it. Without `by` it is one series.
  const running = cumsum(perDay, { value: "commits" });
  return (
    <Plot width={248} height={110} theme={theme} data={running} x="day" y="to">
      <Line curve="step-after" />   {/* step-after: hold each value until the next x, like a staircase */}
      <Dot r={2.5} />
      <Axis channel="x" ticks={6} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
