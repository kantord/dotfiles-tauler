// title: Labels that fit their cells
// section: Text
//
// Give Text a box (x1 x2 y1 y2) and fit, and it draws a label only where the whole label fits inside the box, centred. Tiny cells stay unlabelled instead of showing a smudge.
// The boxes here come from the treemap statistic, the same rows the Rect layer draws.
import { Plot, Rect, Text, Scale, treemap, chartTheme } from "@gh/kantord/dotfiles-tauler";

const du = [
  { dir: "media/photos", mb: 420 }, { dir: "media/music", mb: 260 }, { dir: "media/video", mb: 610 },
  { dir: "code/app", mb: 180 }, { dir: "code/tools", mb: 90 }, { dir: "mail", mb: 150 }, { dir: "notes", mb: 12 }, { dir: "tmp", mb: 6 },
];

const UNIT = [0, 1];   // treemap() fills the unit square unless it is given a `size`
const GAP = 0.004;    // space between cells, as a fraction of the square (0.4%)

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // treemap() returns rows { id, parentId, depth, value, name, branch, leaf, datum, x0, y0, x1, y1 }: a cell's box is x0..x1 by y0..y1;
  // leaf is true for the files (the rows that were given), so .filter keeps only those; name is the last segment of the path.
  const cells = treemap(du, { path: "dir", value: "mb", padding: GAP }).filter(n => n.leaf);
  return (
    <Plot width={248} height={110} theme={theme} data={cells} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <Scale channel="x" domain={UNIT} />
      <Scale channel="y" domain={UNIT} />
      <Rect x1="x0" x2="x1" y1="y0" y2="y1" color="branch" fillOpacity={0.8} />
      <Text x1="x0" x2="x1" y1="y0" y2="y1" text={d => d.name} fit fill={theme.ink} />
    </Plot>
  );
}
