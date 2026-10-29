// title: A pie from stacked bars
// section: Coordinates
//
// A coordinate system changes how the same marks are drawn. Stack horizontal bars on a single band and give the Plot coord={polar()}: x becomes the angle and the stack becomes a pie.
// Nothing about the Bar changes; only the Plot's coord does. Remove it and you have one long stacked bar.
import { Plot, Bar, Scale, Legend, polar, stack, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Where the disk went.
const usage = [{ kind: "media", gb: 120 }, { kind: "code", gb: 45 }, { kind: "cache", gb: 30 }, { kind: "other", gb: 15 }];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // y={() => "all"} gives every row the same y value, so there is a single band and the stack is one ring;
  // padding={0} removes the gap around that band so the ring fills the radius. x (gb) becomes the angle.
  return (
    <Plot width={248} height={130} theme={theme} data={usage} x="gb" y={() => "all"} color="kind" coord={polar()}>
      <Scale channel="y" type="band" padding={0} />
      <Bar position={stack({ along: "x" })} />
      <Legend channel="color" side="top" />
    </Plot>
  );
}
