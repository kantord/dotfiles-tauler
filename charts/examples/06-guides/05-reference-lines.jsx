// title: Reference lines
// section: Guides
//
// RuleY draws a horizontal line across the whole plot at a value, and RuleX a vertical one at each row of its own data. They reach the plot's edges without any Infinity in your code.
// Put them before the data marks to keep them behind, after to keep them on top.
import { Plot, Line, RuleX, RuleY, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented data: latency in ms per second t, 30 ms worse after t = 25.
const latency = Array.from({ length: 40 }, (_, t) => ({ t, ms: 60 + 25 * Math.sin(t / 4) + (t > 25 ? 30 : 0) }));
// Seconds at which a deploy happened.
const deploys = [{ at: 12 }, { at: 26 }];

const LIMIT_MS = 100;   // the latency we promise: a dashed line marks it

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  return (
    <Plot width={248} height={110} theme={theme} data={latency} x="t" y="ms">
      <RuleY y={LIMIT_MS} stroke={colors["ansi-red"]} strokeDasharray="4 3" />   {/* "4 3": 4 px of line, 3 px gap */}
      <RuleX data={deploys} x="at" stroke={theme.muted} />
      <Line />
      <Axis channel="x" ticks={4} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
