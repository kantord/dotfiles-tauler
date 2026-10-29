// title: A tooltip from explicit state
// section: Extending
//
// A figure is a still picture, so a tooltip is a mark drawn from state you hold: pass the hovered row as the mark's data, and a different row is a different picture. This one is a custom mark that places a box beside its point.
// Nothing here listens to the mouse; wherever your layout learns which row is hovered, it passes that row in.
import { Plot, Line, Dot, Axis, defineMark, chartTheme } from "@gh/kantord/dotfiles-tauler";

const GAP = 8, LINE_HEIGHT = 13, PAD = 4, TEXT_SIZE = 10;   // px: the box's distance from the point, a text line's height, padding inside the box, font size
const ABOVE = 6;   // px the box sits above the point (it flips to the left of the point near the right edge)

const Tooltip = defineMark("tooltip", {
  render: (rows, ctx) => rows.flatMap(r => {
    const p = ctx.point(r.x, r.y, r), lines = ctx.field(r, "lines") ?? [];
    if (!p || !lines.length) return [];
    const width = Math.max(...lines.map(l => ctx.measure(l, TEXT_SIZE))) + 2 * PAD, height = lines.length * LINE_HEIGHT + 2 * PAD;
    const x = p[0] + GAP + width > ctx.area.right ? p[0] - GAP - width : p[0] + GAP;
    const y = Math.max(ctx.area.top, p[1] - height - ABOVE);
    return [
      { t: "rect", x, y, width, height, rx: 3, fill: ctx.theme.line, stroke: ctx.theme.lineStrong, front: true },
      ...lines.map((text, i) => ({ t: "text", x: x + PAD, y: y + PAD + LINE_HEIGHT * (i + 0.8), text, fontSize: TEXT_SIZE, fill: ctx.theme.ink, front: true })),
    ];
  }),
});

const samples = Array.from({ length: 30 }, (_, t) => ({ t, ms: 50 + 22 * Math.sin(t / 4) + 9 * Math.sin(t * 1.7) }));
const hovered = 19;   // the row under the pointer, from your own state

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const picked = [samples[hovered]];
  return (
    <Plot width={248} height={110} theme={theme} data={samples} x="t" y="ms">
      <Line />
      <Dot data={picked} r={4} />
      <Tooltip data={picked} lines={d => [`t = ${d.t}`, `${Math.round(d.ms)} ms`]} />
      <Axis channel="x" ticks={4} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
