// title: Grouped bars with dodge
// section: Positions
//
// dodge() gives each series its own slot inside the band instead of piling them up. A band that has fewer series gives its bars more room.
// The order of the slots can be set with dodge({ order: [...] }) without sorting the data.
import { Plot, Bar, Axis, Legend, dodge, chartTheme } from "@gh/kantord/dotfiles-tauler";

const builds = ["mon", "tue", "wed", "thu"].flatMap((day, i) => [
  { day, result: "pass", n: 12 + 3 * i }, { day, result: "fail", n: 4 - i + (i % 2) * 3 }, ...(i > 1 ? [{ day, result: "flaky", n: 2 }] : []),
]);

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // dodge() splits each day's band into one slot per result present on that day, so wed and thu have three bars, mon and tue two.
  return (
    <Plot width={248} height={120} theme={theme} data={builds} x="day" y="n" color="result">
      <Bar position={dodge()} />
      <Axis channel="x" />
      <Axis channel="y" ticks={3} />
      <Legend channel="color" side="top" />
    </Plot>
  );
}
