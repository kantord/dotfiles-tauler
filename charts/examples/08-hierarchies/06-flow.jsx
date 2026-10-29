// title: A flow (Sankey) diagram
// section: Hierarchies
//
// flow takes one row per flow (source, target, value) and returns { nodes, links } laid out in columns. Nodes are Rects; links are Areas with a horizontal curve and a thickness at each end.
// The domain is wider than the layout so the last labels fit. Node height is the throughput, so sizes compare across the whole diagram.
import { Plot, Rect, Area, Text, Scale, flow, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Where requests go.
const moves = [
  ["traffic", "web", 60], ["traffic", "api", 40], ["web", "cache", 35], ["web", "app", 25],
  ["api", "app", 30], ["api", "db", 10], ["app", "db", 35], ["cache", "app", 10],
].map(([source, target, value]) => ({ source, target, value }));

const LAYOUT_WIDTH = 180;    // flow() lays nodes out in 180 x 100 units; one unit is one pixel here
const LAYOUT_HEIGHT = 100;
const LABEL_ROOM = 30;       // x units kept free right of the last column for its labels

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // flow() returns { nodes, links }.
  //   nodes: { id, depth, value, x0, x1, y0, y1 }: id is the source/target name, the box is x0..x1 by y0..y1, its height is value (the flow through it)
  //   links: { sourceId, targetId, value, thickness, back, x1, y1, x2, y2 }: a band from (x1, y1) to (x2, y2), thickness units tall at both ends
  const { nodes, links } = flow(moves, { source: "source", target: "target", value: "value", width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT });
  return (
    <Plot width={248} height={120} theme={theme}>
      <Scale channel="x" domain={[0, LAYOUT_WIDTH + LABEL_ROOM]} />
      <Scale channel="y" domain={[0, LAYOUT_HEIGHT]} />
      <Area data={links} x1="x1" x2="x2" y1="y1" y2="y2" thickness1="thickness" thickness2="thickness" curve="link-horizontal" fillOpacity={0.3} />
      <Rect data={nodes} x1="x0" x2="x1" y1="y0" y2="y1" fill={theme.ink} />
      <Text data={nodes} x="x1" y={d => (d.y0 + d.y1) / 2} text={d => d.id} dx={4} dy={3} textAnchor="start" fontSize={9} />   {/* dx 4 px right of the box; dy 3 px down to centre the 9 px text on y */}
    </Plot>
  );
}
