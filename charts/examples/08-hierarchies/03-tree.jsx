// title: A node-link tree
// section: Hierarchies
//
// Each row names its own id, its parent (null for the root) and its label. Links are drawn by a Link with a horizontal curve, nodes by Dots, labels by Text, each from its own rows.
import { Plot, Link, Dot, Text, Scale, tree, chartTheme } from "@gh/kantord/dotfiles-tauler";

const procs = [
  { id: "init", parent: null, label: "init" },
  { id: "sshd", parent: "init", label: "sshd" },
  { id: "bash", parent: "sshd", label: "bash" },
  { id: "vim", parent: "bash", label: "vim" },
  { id: "cron", parent: "init", label: "cron" },
  { id: "bar", parent: "init", label: "bar" },
  { id: "tick", parent: "bar", label: "tick" },
  { id: "draw", parent: "bar", label: "draw" },
];

const WIDTH = 248;        // the plot's width in px, also the x domain: one unit is one pixel
const HEIGHT = 110;       // the plot's height in px
const LABEL_ROOM = 60;    // px kept free on the right for the labels of the deepest nodes
const LAYOUT_HEIGHT = 100; // the layout's y range, which the y scale below shows whole

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // tree() returns { nodes, links }.
  //   nodes: the row's own fields (here `label`) plus { id, name, depth, x, y } and more: a node's x grows with its depth (the root is at 0, up to size[0]), y spreads siblings over size[1]
  //   links: { x1, y1, x2, y2 }: one per parent-child pair, from the parent's (x1, y1) to the child's (x2, y2)
  // Each row's own fields are on its node, so the label is read as `d.label` (the `name` option can pick another field for `name`).
  const { nodes, links } = tree(procs, { id: "id", parent: "parent", size: [WIDTH - LABEL_ROOM, LAYOUT_HEIGHT] });
  return (
    <Plot width={WIDTH} height={HEIGHT} theme={theme}>
      <Scale channel="x" domain={[0, WIDTH]} />
      <Scale channel="y" domain={[0, LAYOUT_HEIGHT]} />
      <Link data={links} x1="x1" y1="y1" x2="x2" y2="y2" curve="link-horizontal" stroke={theme.muted} />
      <Dot data={nodes} x="x" y="y" r={3} />
      <Text data={nodes} x="x" y="y" text={d => d.label} dx={6} textAnchor="start" fontSize={10} />   {/* each label starts 6 px right of its dot, so nothing clips on the left */}
    </Plot>
  );
}
