// title: Density contours of points
// section: Density
//
// densityContours estimates the density of scattered points and returns nested outlines, so you do not have to grid the data yourself. The levels are in arbitrary units: use them for order and colour.
// Layers share the plot's scales: the Dot layer brings the raw points and the Polygon layer the outlines.
import { Plot, Polygon, Dot, densityContours, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented points: one cluster around (50, 40), and every fourth point shifted by (25, 20) into a second.
// (A fixed pseudo-random sequence, so the picture is the same on every run.)
const points = Array.from({ length: 150 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1, b = Math.abs(Math.sin(i * 269.5) * 43758.5453) % 1, c = Math.abs(Math.sin(i * 419.2) * 43758.5453) % 1;
  return { x: 50 + 22 * (a + b - 1) + (i % 4 === 0 ? 25 : 0), y: 40 + 14 * (b + c - 1) + (i % 4 === 0 ? 20 : 0) };
});

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // densityContours() returns rows { level, points, holes } like contours(); thresholds: 5 asks for about five levels,
  // and the grid and bandwidth are chosen for you (Scott's rule), in the data's own units.
  const rings = densityContours(points, { x: "x", y: "y", thresholds: 5 });
  return (
    <Plot width={248} height={120} theme={theme} data={points} x="x" y="y">
      <Polygon data={rings} points="points" holes="holes" color="level" fillOpacity={0.45} stroke={theme.muted} />
      <Dot r={1.5} opacity={0.6} />
    </Plot>
  );
}
