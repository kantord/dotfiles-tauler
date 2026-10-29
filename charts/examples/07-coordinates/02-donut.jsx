// title: A donut
// section: Coordinates
//
// inner on polar() is the size of the hole, as a fraction of the radius. The marks are the same as the pie's.
// Arc is a shortcut for exactly this when you only want a pie: <Arc value="gb" color="kind" inner={0.55} />.
import { Plot, Bar, Scale, polar, stack, chartTheme } from "@gh/kantord/dotfiles-tauler";

const usage = [{ kind: "media", gb: 120 }, { kind: "code", gb: 45 }, { kind: "cache", gb: 30 }, { kind: "other", gb: 15 }];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // As in the pie, y={() => "all"} puts every row in one band; polar({ inner: 0.55 }) leaves the middle 55% of the radius empty.
  return (
    <Plot width={120} height={120} theme={theme} data={usage} x="gb" y={() => "all"} color="kind" coord={polar({ inner: 0.55 })}>
      <Scale channel="y" type="band" padding={0} />
      <Bar position={stack({ along: "x" })} stroke={theme.ink} strokeOpacity={0.15} />
    </Plot>
  );
}
