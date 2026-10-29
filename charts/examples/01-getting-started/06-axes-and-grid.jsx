// title: Axes and grid
// section: Getting started
//
// Axis and Grid are pieces you add as children, like marks. The grid follows the ticks of the axis of the same channel, so lines and labels always agree.
// The plot reserves room for the labels by itself; there is no margin to set by hand.
import { Plot, Line, Axis, Grid, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented data: charge falling about 6 points an hour from 8:00 UTC on 1 October 2026, with a wobble.
const start = Date.UTC(2026, 9, 1, 8);   // months count from 0, so 9 is October
const battery = Array.from({ length: 13 }, (_, i) => ({
  t: new Date(start + i * 3600 * 1000),
  percent: Math.round(100 - i * 6.1 + 4 * Math.sin(i * 1.3)),
}));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // tone="soft" draws the grid in the faint line colour; format="%H:%M" is a d3 time format (hours:minutes).
  return (
    <Plot width={248} height={110} theme={theme} data={battery} x="t" y="percent">
      <Grid channel="y" tone="soft" />
      <Line />
      <Axis channel="x" ticks={4} format="%H:%M" />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
