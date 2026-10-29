// title: Rotated axis labels
// section: Guides
//
// Long category names would collide on a narrow axis, so the axis drops every other label. labelAngle turns them instead, and every label stays; the room below the plot grows to fit.
// A negative angle ends the text at its tick.
import { Plot, Bar, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

const branches = [
  { branch: "feature/login", commits: 14 }, { branch: "fix/crash-on-start", commits: 6 }, { branch: "docs/readme", commits: 3 },
  { branch: "refactor/parser", commits: 19 }, { branch: "chore/deps", commits: 5 }, { branch: "main", commits: 27 },
];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={180} theme={theme} data={branches} x="branch" y="commits">
      <Bar />
      <Axis channel="x" labelAngle={-45} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
