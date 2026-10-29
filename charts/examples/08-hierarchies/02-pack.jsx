// title: Circle packing from a statistic
// section: Hierarchies
//
// pack is a statistic: it returns one row per node with x, y and a radius r in the units of the layout. The Plot then draws those rows with a Dot whose rx is in data units, so the circles scale with the plot.
// Parents are outlines and leaves are filled, which is just two layers over different rows. Layout statistics take a size; the plot's domains are set to match it, and the plot is square so circles stay round.
import { Plot, Dot, Scale, pack, chartTheme } from "@gh/kantord/dotfiles-tauler";

const du = [
  { dir: "home/media/photos", mb: 420 }, { dir: "home/media/music", mb: 260 }, { dir: "home/code/app", mb: 180 },
  { dir: "home/code/tools", mb: 90 }, { dir: "home/mail", mb: 150 }, { dir: "home/notes", mb: 12 },
];

const LAYOUT = 100;   // pack() lays circles out in a 100 x 100 square; the x and y scales below show exactly that square

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // pack() returns rows { id, parentId, depth, value, name, branch, leaf, datum, x, y, r }: a circle's centre (x, y) and radius r,
  // in layout units; leaf is true for a directory with no children; branch is the directory below the trunk, used as the colour.
  // The plot is square (120 x 120 px, 2 px margins) and so is the layout, so circles stay round.
  const nodes = pack(du, { path: "dir", value: "mb", size: [LAYOUT, LAYOUT] });
  return (
    <Plot width={120} height={120} margin={{ top: 2, right: 2, bottom: 2, left: 2 }} theme={theme} data={nodes} x="x" y="y">
      <Scale channel="x" domain={[0, LAYOUT]} />
      <Scale channel="y" domain={[0, LAYOUT]} />
      <Dot data={nodes.filter(n => !n.leaf)} rx="r" fill="none" stroke={theme.muted} />
      <Dot data={nodes.filter(n => n.leaf)} rx="r" color="branch" fillOpacity={0.8} />
    </Plot>
  );
}
