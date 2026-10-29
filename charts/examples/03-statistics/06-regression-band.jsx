// title: A fitted line with a band
// section: Statistics
//
// regress fits a straight line and returns it with the band the fitted mean lies in (y1 to y2). Draw the band as an Area, the line as a Line, and the points as Dots with their own data.
// Layers do not have to share rows: the Plot has the fit, and the Dot layer brings the raw points.
import { Plot, Area, Line, Dot, Axis, regress, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Build time against the number of files changed (secs is about 20 + 3.1 per file, plus noise).
// (A fixed pseudo-random sequence, so the picture is the same on every run.)
const builds = Array.from({ length: 24 }, (_, i) => {
  const files = 2 + i * 1.5;
  return { files, secs: 20 + 3.1 * files + 22 * (Math.abs(Math.sin(i * 91.7) * 1e4) % 1 - 0.5) };
});

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // regress() returns 24 rows { x, y, y1, y2 }: the fitted line y at x, and y1 to y2 the band the fitted mean lies in (about 95%).
  const fit = regress(builds, { x: "files", y: "secs" });
  return (
    <Plot width={248} height={120} theme={theme} data={fit} x="x">
      <Area y1="y1" y2="y2" fillOpacity={0.2} />
      <Line y="y" strokeWidth={2} />
      <Dot data={builds} x="files" y="secs" r={2.5} opacity={0.8} />
      <Axis channel="x" ticks={5} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
