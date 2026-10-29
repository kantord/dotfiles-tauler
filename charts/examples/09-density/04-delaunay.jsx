// title: Delaunay triangles
// section: Density
//
// delaunay connects scattered points into triangles so that no point lies inside another's circle: the natural neighbourhood of each point. Each triangle is a row of polygon corners, drawn unfilled.
// Handy for showing how sparse or clustered a set of sensors or servers is.
import { Plot, Polygon, Dot, delaunay, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented sites: 22 points scattered over 0 to 100 in x and y.
// (A fixed pseudo-random sequence, so the picture is the same on every run.)
const sites = Array.from({ length: 22 }, (_, i) => ({
  x: 100 * (Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1),
  y: 100 * (Math.abs(Math.sin(i * 311.7) * 43758.5453) % 1),
}));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // delaunay() returns rows { points, ids }: a triangle's three corners, and the indices of the three sites in `sites`.
  const triangles = delaunay(sites, { x: "x", y: "y" });
  return (
    <Plot width={160} height={120} theme={theme} data={sites} x="x" y="y">
      <Polygon data={triangles} points="points" fill="none" stroke={theme.muted} />
      <Dot r={2.5} />
    </Plot>
  );
}
