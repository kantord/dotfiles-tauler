// title: Two y axes with named scales
// section: Guides
//
// A Scale with a name is a second scale for the same channel. A mark picks it with scale={{ y: "rain" }}, and an Axis with the same scale and a side draws it.
// Each scale is trained on the marks bound to it, so units as different as degrees and millimetres each fill the height.
import { Plot, Line, Bar, Scale, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

const days = Array.from({ length: 10 }, (_, d) => ({ day: d + 1, temp: 12 + 5 * Math.sin(d / 2), rain: Math.max(0, 14 * Math.sin(d / 1.5 + 2)) }));

const RAIN_MM = [0, 40];   // rain in mm, at most 14 here: the bars stay in the lower part so the line stays readable

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  // temp uses the plot's ordinary y scale (trained on temp, left axis); the Bar and the right Axis name the "rain" scale instead.
  return (
    <Plot width={248} height={120} theme={theme} data={days} x="day">
      <Scale channel="x" type="band" />
      <Scale channel="y" name="rain" domain={RAIN_MM} />
      <Bar y="rain" scale={{ y: "rain" }} fill={colors["ansi-cyan"]} fillOpacity={0.5} />
      <Line y="temp" stroke={colors["ansi-red"]} />
      <Axis channel="y" ticks={3} />
      <Axis channel="y" scale="rain" side="right" ticks={3} />
      <Axis channel="x" ticks={5} />
    </Plot>
  );
}
