// title: A tree from paths
// section: Hierarchies
//
// The shortcut for the previous example: one row per path instead of id, parent and label. Everything else is the same.
import { Plot, Link, Dot, Text, Scale, tree, chartTheme } from "@gh/kantord/dotfiles-tauler";

const procs = ["init", "init/sshd", "init/sshd/bash", "init/sshd/bash/vim", "init/cron", "init/bar", "init/bar/tick", "init/bar/draw"].map(path => ({ path }));

const WIDTH = 248;        // the plot's width in px, also the x domain: one unit is one pixel
const HEIGHT = 110;       // the plot's height in px
const LABEL_ROOM = 60;    // px kept free on the right for the labels of the deepest nodes
const LAYOUT_HEIGHT = 100; // the layout's y range, which the y scale below shows whole

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // `path: "path"` reads each row's path field and expands it to what the previous example wrote by hand:
  //   the id is the path with a leading "/" ("init/sshd" is "/init/sshd"); the parent is everything before the last "/" (null for "init");
  //   an ancestor that has no row of its own is created; the name defaults to the last segment ("sshd").
  // The result is { nodes, links } as before, so the marks below are unchanged.
  const { nodes, links } = tree(procs, { path: "path", size: [WIDTH - LABEL_ROOM, LAYOUT_HEIGHT] });
  return (
    <Plot width={WIDTH} height={HEIGHT} theme={theme}>
      <Scale channel="x" domain={[0, WIDTH]} />
      <Scale channel="y" domain={[0, LAYOUT_HEIGHT]} />
      <Link data={links} x1="x1" y1="y1" x2="x2" y2="y2" curve="link-horizontal" stroke={theme.muted} />
      <Dot data={nodes} x="x" y="y" r={3} />
      <Text data={nodes} x="x" y="y" text={d => d.name} dx={6} textAnchor="start" fontSize={10} />   {/* each label starts 6 px right of its dot, so nothing clips on the left */}
    </Plot>
  );
}
