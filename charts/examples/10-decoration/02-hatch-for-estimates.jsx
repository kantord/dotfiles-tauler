// title: Hatching for estimates
// section: Decoration
//
// pattern="hatch" fills a shape with diagonal lines in its own colour. It marks what is not a measurement, here the days still to come, in a way a lighter colour alone does not.
// pattern() builds any tile you like from scene shapes; hatch() only sets the gap, width and angle.
import { Plot, Bar, Axis, Scale, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Eight days of builds per day; from day 6 on the numbers are a forecast.
const days = [5, 7, 6, 9, 8, 11, 10, 12].map((builds, i) => ({ day: i + 1, builds, forecast: i >= 5 }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={110} theme={theme} x="day" y="builds">
      <Scale channel="x" type="band" domain={days.map(d => d.day)} />
      <Bar data={days.filter(d => !d.forecast)} />
      <Bar data={days.filter(d => d.forecast)} pattern="hatch" stroke={theme.palette[0]} />
      <Axis channel="x" />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
