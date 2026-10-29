// title: Radial bars
// section: Coordinates
//
// Put the value on x and the categories on a band y, and a horizontal bar chart becomes rings: the value is the angle swept and each category gets its own ring.
// With a domain of 0-100 the longest possible bar is a full turn, like an activity ring.
import { Plot, Bar, Scale, polar, chartTheme } from "@gh/kantord/dotfiles-tauler";

const PERCENT = [0, 100];   // 100 is a full turn

const rings = [{ goal: "move", done: 82 }, { goal: "exercise", done: 55 }, { goal: "stand", done: 30 }];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // inner: 0.25 leaves the middle quarter of the radius empty, so the shortest ring is not a point.
  return (
    <Plot width={120} height={120} theme={theme} data={rings} x="done" y="goal" color="goal" coord={polar({ inner: 0.25 })}>
      <Scale channel="x" domain={PERCENT} />
      <Bar />
    </Plot>
  );
}
