// title: A beeswarm
// section: Positions
//
// Swarm moves points sideways just enough that none overlap, while keeping each at its true value. It is a mark, not a position, because it needs pixel radii.
// It needs a band axis for the groups; the value axis stays exact.
import { Plot, Swarm, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

const readings = ["low", "mid", "high"].flatMap((g, k) =>
  Array.from({ length: 26 }, (_, i) => ({ g, v: 10 + 9 * k + 5 * Math.sin(i * 3.7 + k) * Math.cos(i * 1.3) })));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // Swarm r={3}: each dot has radius 3 px, and is moved sideways, within its band, only as far as needed so no two overlap.
  return (
    <Plot width={248} height={120} theme={theme} data={readings} x="g" y="v">
      <Swarm r={3} />
      <Axis channel="x" />
      <Axis channel="y" ticks={4} />
    </Plot>
  );
}
