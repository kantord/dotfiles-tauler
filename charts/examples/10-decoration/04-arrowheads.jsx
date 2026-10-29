// title: Arrowheads on links and vectors
// section: Decoration
//
// markerEnd (and markerStart) put a marker at the end of a Link or Vector. arrowhead() draws a triangle in the line's own colour, and marker() takes any shapes you give it.
// A Vector has a length in pixels and an angle clockwise from up, so it is the natural mark for directions: wind, or a trend.
import { Plot, Link, Vector, Dot, Scale, Axis, arrowhead, chartTheme } from "@gh/kantord/dotfiles-tauler";

const X_DOMAIN = [0, 9];   // the moves end at x 7, the wind arrows sit at x 8
const Y_DOMAIN = [0, 6];   // the moves reach y 5

const moves = [{ x1: 1, y1: 1, x2: 4, y2: 3 }, { x1: 4, y1: 3, x2: 7, y2: 2 }, { x1: 4, y1: 3, x2: 6, y2: 5 }];
// Wind at three places: dir is the angle in degrees clockwise from up (20 is up and slightly right, 90 right, 200 down and slightly left).
const wind = [{ x: 8, y: 5, dir: 20 }, { x: 8, y: 3, dir: 90 }, { x: 8, y: 1, dir: 200 }];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={120} theme={theme}>
      <Scale channel="x" domain={X_DOMAIN} />
      <Scale channel="y" domain={Y_DOMAIN} />
      <Link data={moves} x1="x1" y1="y1" x2="x2" y2="y2" stroke={theme.muted} markerEnd={arrowhead()} />
      <Vector data={wind} x="x" y="y" angle="dir" length={16} strokeWidth={1.5} markerEnd={arrowhead({ size: 6 })} />   {/* the head is 6 px long */}
      <Dot data={wind} x="x" y="y" r={2} />
      <Axis channel="x" ticks={4} />
    </Plot>
  );
}
