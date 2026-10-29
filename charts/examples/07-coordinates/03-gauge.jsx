// title: A gauge
// section: Coordinates
//
// startAngle and endAngle (radians, clockwise from up) limit the sweep, here to three quarters of a turn. A gauge is a track and a value drawn as Rects over the same 0-100 domain, and a Text for the number in the middle.
// Everything is an ordinary mark; there is no gauge component.
import { Plot, Rect, Text, Scale, polar, chartTheme } from "@gh/kantord/dotfiles-tauler";

const SWEEP = Math.PI * 0.75;   // 135 degrees either side of up: 270 degrees of sweep, open at the bottom
const PERCENT = [0, 100];       // the angle: 0 at the start of the sweep, 100 at its end
const RING = [0, 1];            // the radius: 0 is the inner edge, 1 the outer; both Rects span all of it

const reading = [{ percent: 62 }];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  const sweep = polar({ inner: 0.7, startAngle: -SWEEP, endAngle: SWEEP });
  // Text with no x or y is drawn at the centre of the plot; inner: 0.7 leaves the middle 70% of the radius empty for it.
  return (
    <Plot width={120} height={110} theme={theme} data={reading} coord={sweep}>
      <Scale channel="x" domain={PERCENT} />
      <Scale channel="y" domain={RING} />
      <Rect x1={0} x2={100} y1={0} y2={1} fill={theme.line} />
      <Rect x1={0} x2="percent" y1={0} y2={1} fill={colors["ansi-cyan"]} />
      <Text text={d => `${d.percent}%`} fontSize={16} textAnchor="middle" />
    </Plot>
  );
}
