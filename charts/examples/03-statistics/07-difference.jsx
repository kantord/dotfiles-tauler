// title: The difference between two series
// section: Statistics
//
// difference compares two series at the x they share and splits the gap by sign, adding a row where they cross so two fills meet exactly. Draw each sign with its own Area over that sign's rows.
// The two lines are drawn from the original rows by a layer with its own data.
import { Plot, Area, Line, Axis, difference, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Memory use this week and last week, by hour.
const rows = Array.from({ length: 24 }, (_, h) => [
  { h, week: "this", gb: 6 + 2.5 * Math.sin(h / 3.5) + h / 12 },
  { h, week: "last", gb: 6 + 2 * Math.sin(h / 3.5 + 0.9) },
]).flat();

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  // difference() returns rows { x, y1, y2, sign, run }: y1 is this week's value, y2 last week's, sign the sign of y1 - y2,
  // run which stretch of one sign the row is in (so two fills can be drawn per sign, meeting where the lines cross).
  const gap = difference(rows, { x: "h", y: "gb", by: "week", a: "this", b: "last" });
  return (
    <Plot width={248} height={110} theme={theme} x="x">
      <Area data={gap.filter(r => r.sign > 0)} group="run" y1="y1" y2="y2" fill={colors["ansi-red"]} fillOpacity={0.35} />
      <Area data={gap.filter(r => r.sign < 0)} group="run" y1="y1" y2="y2" fill={colors["ansi-green"]} fillOpacity={0.35} />
      <Line data={rows} x="h" y="gb" color="week" />
      <Axis channel="x" ticks={6} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
