// title: Hexagonal bins
// section: Density
//
// hexbin counts points into hexagons and returns the non-empty ones, each with its six corners. Polygon draws them, and the count trains a sequential colour scale.
// The scales use the same extents hexbin measured, with no margin, so the cells are as regular as the maths says; an inferred y domain is rounded outwards and would squash them.
// Pass the plot's pixel size to hexbin so the hexagons look regular on screen.
import { Plot, Polygon, Scale, hexbin, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Commits by hour of day and size of change, in two clusters.
// (A fixed pseudo-random sequence, so the picture is the same on every run.)
const commits = Array.from({ length: 300 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1, b = Math.abs(Math.sin(i * 311.7) * 43758.5453) % 1, c = Math.abs(Math.sin(i * 419.2) * 43758.5453) % 1;
  const late = i % 3 === 0;
  return { hour: (late ? 22 : 11) + 4 * (a + b - 1), lines: (late ? 80 : 40) + 60 * (c + b - 1) };
});

const WIDTH = 248, HEIGHT = 110;   // the plot's size in px, also given to hexbin() so it can make the hexagons regular on screen
const BIN_HOURS = 1.8;             // each hexagon is 1.8 hours wide (flat side to flat side)

// The smallest and the largest value of a field: the scale shows exactly the data, so the cells are not squashed.
const extent = field => [Math.min(...commits.map(field)), Math.max(...commits.map(field))];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // hexbin() returns rows { cx, cy, count, points }: a cell's centre, how many commits fall in it, and its six corners (in data units).
  const cells = hexbin(commits, { x: "hour", y: "lines", binWidth: BIN_HOURS, width: WIDTH, height: HEIGHT });
  return (
    <Plot width={WIDTH} height={HEIGHT} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} theme={theme} data={cells}>
      <Scale channel="x" domain={extent(d => d.hour)} />
      <Scale channel="y" domain={extent(d => d.lines)} />
      <Polygon points="points" color="count" />
    </Plot>
  );
}
