// title: Stacked bars
// section: Positions
//
// A position decides where rows go before they are drawn. stack() piles the rows that share an x, one series on top of the next, and writes the ends the Bar then draws.
// The rows stay raw: no sorting or reshaping. Series are stacked in the order they first appear.
import { Plot, Bar, Axis, Legend, stack, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Hours spent per project on each weekday.
const hours = ["mon", "tue", "wed", "thu", "fri"].flatMap((day, i) => [
  { day, project: "app", hours: 3 + (i % 3) }, { day, project: "docs", hours: 1 + (i % 2) }, { day, project: "ops", hours: 2 + ((i * 2) % 3) },
]);

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // stack() groups the rows by x (the day) and gives each a y1 and y2, where its piece starts and ends; Bar draws from y1 to y2.
  // The pieces pile in order of first appearance: app at the bottom, then docs, then ops.
  return (
    <Plot width={248} height={120} theme={theme} data={hours} x="day" y="hours" color="project">
      <Bar position={stack()} />
      <Axis channel="x" />
      <Axis channel="y" ticks={3} />
      <Legend channel="color" side="top" />
    </Plot>
  );
}
