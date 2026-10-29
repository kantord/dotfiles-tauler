// title: A radar chart
// section: Coordinates
//
// A closed Line over categories on the angle makes a radar. Grid takes a shape (polygon or circle) and spokes under polar().
// Pin the y domain so the rings mean the same thing from one reading to the next.
import { Plot, Line, Area, Grid, Axis, Scale, polar, chartTheme } from "@gh/kantord/dotfiles-tauler";

const SCORE = [0, 100];   // every skill is scored out of 100: the outer ring is 100

const skills = [["speed", 60], ["power", 90], ["reach", 30], ["armor", 75], ["grip", 45]].map(([skill, value]) => ({ skill, value }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={150} height={130} theme={theme} data={skills} x="skill" y="value" coord={polar()}>
      <Scale channel="y" domain={SCORE} />
      <Grid channel="y" shape="polygon" tone="soft" />
      <Area closed fillOpacity={0.2} />
      <Line closed strokeWidth={2} />
      <Axis channel="x" />
    </Plot>
  );
}
