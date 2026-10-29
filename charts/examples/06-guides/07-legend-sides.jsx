// title: Legend sides
// section: Guides
//
// Legend is a guide like an axis: it reads the keys from the trained colour scale and claims its own row, on the top or the bottom. Left or right is not supported and throws.
// A numeric colour gives a stepped ramp with its two ends labelled.
import { Plot, Dot, Legend, chartTheme } from "@gh/kantord/dotfiles-tauler";

const pts = Array.from({ length: 18 }, (_, i) => ({ x: i, y: 5 + 4 * Math.sin(i / 2.5), kind: ["a", "b", "c"][i % 3], heat: i * 5 }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <div class="flex flex-row gap-[8px]">
      <Plot width={120} height={110} theme={theme} data={pts} x="x" y="y" color="kind">
        <Dot />
        <Legend channel="color" side="top" />
      </Plot>
      <Plot width={120} height={110} theme={theme} data={pts} x="x" y="y" color="heat">
        <Dot />
        <Legend channel="color" side="bottom" />
      </Plot>
    </div>
  );
}
