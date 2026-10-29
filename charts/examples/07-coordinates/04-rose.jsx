// title: A rose
// section: Coordinates
//
// The same Bar that draws a bar chart draws a wedge per category under polar(): the band axis becomes the angle, the value the radius. Grid and Axis follow the coordinate.
// A rose suits cyclic categories, like the hours of a day or the directions of the wind.
import { Plot, Bar, Grid, Axis, polar, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented data: wind speed in knots for each of eight directions (4 to 12).
const wind = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((dir, i) => ({ dir, knots: 4 + Math.round(8 * Math.abs(Math.sin(i * 0.9 + 0.5))) }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={130} height={130} theme={theme} data={wind} x="dir" y="knots" coord={polar()}>
      <Grid channel="y" tone="soft" />
      <Bar fillOpacity={0.85} />
      <Axis channel="x" />
    </Plot>
  );
}
