// title: Your own mark
// section: Extending
//
// defineMark(name, { render }) makes a mark from a function that receives the rows and a context, and returns shapes. ctx.x and ctx.y turn values into pixels, ctx.theme and ctx.resolve give colours and style props, and a shape is a plain object: { t: "line" | "circle" | "rect" | "path" | "text", ...SVG attributes }.
// This is a lollipop: a stem and a dot per row. It then works like any built-in mark, with channels inherited from the Plot.
import { Plot, Axis, defineMark, chartTheme } from "@gh/kantord/dotfiles-tauler";

const Lollipop = defineMark("lollipop", {
  // Each row r carries the Plot's channels as r.x and r.y (here the day and the merged count). The lollipop's default radius is 4 px.
  render: (rows, ctx) => rows.flatMap(r => {
    const x = ctx.x(r.x), y = ctx.y(r.y), base = ctx.y(0), color = ctx.resolve(r, "fill", ctx.theme.palette[0]);
    return [
      { t: "line", x1: x, y1: base, x2: x, y2: y, stroke: color, strokeWidth: 1.5 },
      { t: "circle", cx: x, cy: y, r: ctx.resolve(r, "r", 4), fill: color },
    ];
  }),
});

const prs = [["mon", 3], ["tue", 7], ["wed", 4], ["thu", 9], ["fri", 5]].map(([day, merged]) => ({ day, merged }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={110} theme={theme} data={prs} x="day" y="merged">
      <Lollipop />
      <Axis channel="x" />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
