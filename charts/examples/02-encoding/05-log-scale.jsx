// title: Linear and log scales
// section: Encoding
//
// The scale type is a choice you make per channel with Scale. On the left, a few endpoints dwarf the rest; on the right a log y scale shows every endpoint.
// Other types work the same way (sqrt, pow, time, band...). A log scale cannot hold zero or negative values, and says so with an error instead of drawing nonsense.
import { Plot, Dot, Axis, Scale, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Requests served by each endpoint, most popular first.
const hits = [48000, 21000, 9400, 4100, 1700, 900, 380, 150, 64, 22, 9].map((n, i) => ({ rank: i + 1, hits: n }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // type="log" spaces ticks by powers of ten; format="~s" writes numbers short: 48000 as 48k.
  return (
    <div class="flex flex-row gap-[8px]">
      <Plot width={120} height={110} theme={theme} data={hits} x="rank" y="hits">
        <Dot />
        <Axis channel="y" ticks={3} format="~s" />
      </Plot>
      <Plot width={120} height={110} theme={theme} data={hits} x="rank" y="hits">
        <Scale channel="y" type="log" />
        <Dot />
        <Axis channel="y" ticks={3} format="~s" />
      </Plot>
    </div>
  );
}
