// title: Bars
// section: Getting started
//
// Text values on x make a band scale: one slot per distinct value, in the order they first appear. Bar draws from zero up to y inside each slot.
// Numbers would have made a continuous scale; see the histogram next for bars over numbers.
import { Plot, Bar, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

const usage = [
  { mount: "root", gb: 41 }, { mount: "home", gb: 188 }, { mount: "var", gb: 23 },
  { mount: "opt", gb: 12 }, { mount: "srv", gb: 76 },
];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // x is text, so its scale is a band scale: one slot per mount, in order of first appearance, 0.2 of a slot apart (the default padding).
  // y starts at 0 and ends on a round number; ticks={3} asks for about three tick marks at round values.
  return (
    <Plot width={248} height={110} theme={theme} data={usage} x="mount" y="gb">
      <Bar />
      <Axis channel="x" />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
