// title: A partition (icicle)
// section: Hierarchies
//
// partition returns each node as a box: depth along x, share of the parent along y. Draw the boxes with Rect, and the names with a Text given the same box and the fit prop, which skips labels that would not fit.
// Colour comes from the branch field the layout adds to every row.
import { Plot, Rect, Text, Scale, partition, chartTheme } from "@gh/kantord/dotfiles-tauler";

const du = [
  { dir: "home/media/photos", mb: 420 }, { dir: "home/media/music", mb: 260 }, { dir: "home/code/app", mb: 180 },
  { dir: "home/code/tools", mb: 90 }, { dir: "home/mail", mb: 150 },
];

const UNIT = [0, 1];   // partition() fills the unit square (x: depth, y: breadth) unless it is given a `size`
const GAP = 0.004;    // space between boxes, as a fraction of the square (0.4%)

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // partition() returns rows { id, parentId, depth, value, name, branch, leaf, datum, x0, y0, x1, y1 }:
  // x0..x1 is the depth span, y0..y1 the node's share of the breadth; name is the last segment of the path ("photos"); branch is the colour key.
  const nodes = partition(du, { path: "dir", value: "mb", padding: GAP });
  return (
    <Plot width={248} height={110} theme={theme} data={nodes} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <Scale channel="x" domain={UNIT} />
      <Scale channel="y" domain={UNIT} />
      <Rect x1="x0" x2="x1" y1="y0" y2="y1" color="branch" fillOpacity={0.85} />
      <Text x1="x0" x2="x1" y1="y0" y2="y1" text={d => d.name} fit textAnchor="start" fill={theme.ink} />
    </Plot>
  );
}
