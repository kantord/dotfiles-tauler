// title: Image, Group and clip
// section: Decoration
//
// Image draws a picture centred on each point, from a data: URL or a field of the row. Group holds shapes in pixels rather than data, under one transform, clip or filter; here a clipRect crops a big circle to a window.
// These are for finishing touches: icons, insets and annotations that are not data.
import { Plot, Image, Group, Scale, clipRect, chartTheme } from "@gh/kantord/dotfiles-tauler";

const icon = color => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="${color}"/><path d="M5 8l2 2 4-4" stroke="white" stroke-width="2" fill="none"/></svg>`);
const X_DOMAIN = [0, 8];   // the checks sit at x 1 to 7
const Y_DOMAIN = [0, 3];   // on lanes 1 and 2
// Pixels from the plot's top-left corner (a Group is not placed by data): the circle below is 100 px across, the window shows an 80 x 70 px part of it.
const WINDOW = { x: 150, y: 20, width: 80, height: 70 };
const CIRCLE = { cx: 190, cy: 55, r: 50 };
const ICON_PX = 18;   // the icon's width and height in px

const checks = [{ at: 1, lane: 1 }, { at: 3, lane: 2 }, { at: 5, lane: 1 }, { at: 7, lane: 2 }];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  const window = clipRect(WINDOW);
  return (
    <Plot width={248} height={110} theme={theme} data={checks} x="at" y="lane">
      <Scale channel="x" domain={X_DOMAIN} />
      <Scale channel="y" domain={Y_DOMAIN} />
      <Image href={icon(colors["ansi-green"])} width={ICON_PX} height={ICON_PX} />
      <Group clip={window} shapes={[{ t: "circle", ...CIRCLE, fill: colors["ansi-blue"], fillOpacity: 0.5 }]} />
    </Plot>
  );
}
