// title: Axes on top and on the right
// section: Guides
//
// side moves an axis: top for x, right for y. Axes on the same side stack one beyond the other.
// Putting the time axis on top suits a chart that hangs from a header, like a timeline of jobs.
import { Plot, Bar, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

// [job, start minute, minutes it ran]; end is start plus duration.
const jobs = [["lint", 4, 1], ["build", 12, 3], ["test", 9, 7], ["deploy", 16, 3]].map(([job, start, mins]) => ({ job, start, end: start + mins }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={110} theme={theme} data={jobs} y="job">
      <Bar x1="start" x2="end" />
      <Axis channel="x" side="top" ticks={5} />
      <Axis channel="y" side="right" />
    </Plot>
  );
}
