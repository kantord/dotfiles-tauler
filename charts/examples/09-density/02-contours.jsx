// title: Contour lines from a grid
// section: Density
//
// contours takes a flat list of values on a width by height grid and returns the outline of each level as polygon rows. Draw them with Polygon, filled and coloured by level, so the nested outlines read as bands.
// This is how you draw a heat map of anything you can sample on a grid: temperature, signal strength, load.
import { Plot, Polygon, contours, chartTheme } from "@gh/kantord/dotfiles-tauler";

const N = 40;   // the grid is N x N values, row by row (row 0 is drawn at the bottom); the outlines are in grid units, 0 to 39
const LEVELS = [0.15, 0.3, 0.5, 0.7, 0.9];   // the heights at which an outline is drawn (the two bumps peak at 1 and 0.7)
// Invented field: two round bumps, centred at (0.3, 0.4) and (0.7, 0.65) of the grid.

const field = Array.from({ length: N * N }, (_, i) => {
  const x = (i % N) / N, y = Math.floor(i / N) / N;
  return Math.exp(-((x - 0.3) ** 2 + (y - 0.4) ** 2) * 18) + 0.7 * Math.exp(-((x - 0.7) ** 2 + (y - 0.65) ** 2) * 30);
});

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // contours() returns rows { level, points, holes }: one polygon per outline, its corners in `points`, any holes cut out of it in `holes`.
  const rings = contours(field, { width: N, height: N, thresholds: LEVELS });
  return (
    <Plot width={160} height={120} theme={theme} data={rings}>
      <Polygon points="points" holes="holes" color="level" fillOpacity={0.45} stroke={theme.muted} />
    </Plot>
  );
}
