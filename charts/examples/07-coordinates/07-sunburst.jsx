// title: A sunburst
// section: Coordinates
//
// partition lays a hierarchy out as rows of rectangles, depth along x. Swap the channels (the rows' depth goes on the radius, their breadth on the angle) and polar() turns the same rows into a sunburst.
// The hierarchy comes from flat rows with a path, as in a disk listing.
import { Plot, Rect, Scale, partition, polar, chartTheme } from "@gh/kantord/dotfiles-tauler";

const disk = [
  { path: "home/media/photos", mb: 420 }, { path: "home/media/music", mb: 260 }, { path: "home/code/app", mb: 180 },
  { path: "home/code/tools", mb: 90 }, { path: "home/mail", mb: 150 },
];

const UNIT = [0, 1];   // partition() fills the unit square (x: depth, y: breadth) unless it is given a `size`

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // partition() returns rows { id, parentId, depth, value, name, branch, leaf, datum, x0, y0, x1, y1 }:
  // x0..x1 is the depth span, y0..y1 the share of the circle; `branch` is the top-level directory below the trunk ("home"), used as the colour.
  const nodes = partition(disk, { path: "path", value: "mb" });
  return (
    <Plot width={130} height={130} theme={theme} data={nodes} coord={polar()}>
      <Scale channel="x" domain={UNIT} />
      <Scale channel="y" domain={UNIT} />
      {/* swapped: x is the angle and y the radius under polar(), so the depth (x0, x1) goes to y and the breadth (y0, y1) to x */}
      <Rect x1="y0" x2="y1" y1="x0" y2="x1" color="branch" stroke={theme.line} />
    </Plot>
  );
}
