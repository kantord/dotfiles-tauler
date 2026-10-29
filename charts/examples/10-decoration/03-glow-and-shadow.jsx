// title: Blur and drop shadow
// section: Decoration
//
// filter takes blur() or dropShadow(). A blurred copy of the points under the sharp ones is a glow; a shadow lifts the bars off the background.
// A filter works inside the shape's own box, so a strong blur is cut square at the edge, and a flat line has no height to filter: keep blurs small, or put a line in a Group.
import { Plot, Bar, Dot, Scale, blur, dropShadow } from "@gh/kantord/dotfiles-tauler";

const hours = Array.from({ length: 10 }, (_, i) => ({ h: i, load: 30 + 25 * Math.sin(i / 1.6) + 10 * (i % 3) }));

const SHADOW = { dx: 1, dy: 2, std: 2, opacity: 0.5 };   // px: 1 right, 2 down, blurred over about 2 px (std = standard deviation), 50% opaque
const GLOW_STD = 1.5;   // px: how far the glow's blur spreads

export default function Example() {
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  // margin leaves room for the shadow and the glow outside the plot area.
  return (
    <div class="flex flex-row gap-[8px]">
      <Plot width={116} height={70} margin={{ top: 8, right: 8, bottom: 4, left: 8 }} data={hours} x="h" y="load">
        <Scale channel="x" type="band" />
        <Bar fill={colors["ansi-cyan"]} filter={dropShadow(SHADOW)} />
      </Plot>
      <Plot width={116} height={70} margin={{ top: 8, right: 8, bottom: 4, left: 8 }} data={hours} x="h" y="load">
        <Dot r={6} fill={colors["ansi-yellow"]} fillOpacity={0.6} filter={blur({ std: GLOW_STD })} />
        <Dot r={2.5} fill={colors["ansi-yellow"]} />
      </Plot>
    </div>
  );
}
