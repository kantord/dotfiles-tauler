// title: Tick marks for events
// section: Guides
//
// TickX draws a short vertical stroke at each x, on the lane named by y: a compact way to show when things happened. TickY is the same turned the other way.
// The length is in pixels, so the ticks stay the same size at any plot size.
import { Plot, TickX, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented events: the second t (0 to 24) at which each happened, on one lane per kind (rows of the y band, in order of first appearance).
const events = [
  ...[2, 5, 6, 11, 17, 18, 19, 23].map(t => ({ t, lane: "push" })),
  ...[3, 4, 12, 20].map(t => ({ t, lane: "deploy" })),
  ...[7, 8, 21].map(t => ({ t, lane: "alert" })),
];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={96} theme={theme} data={events} x="t" y="lane">
      <TickX length={14} strokeWidth={2} />
      <Axis channel="x" ticks={6} />
      <Axis channel="y" />
    </Plot>
  );
}
