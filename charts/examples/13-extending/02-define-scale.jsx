// title: Your own scale type
// section: Extending
//
// defineScale(name, { build }) registers a scale type; then <Scale type="name"> uses it. build gets the domain and the range and returns a function from value to pixel, with domain() and, for axes, ticks().
// This one squeezes large values like a log scale but keeps zero, which a log scale cannot.
import { Plot, Dot, Scale, Axis, defineScale, chartTheme } from "@gh/kantord/dotfiles-tauler";

defineScale("log1p", {
  build(domain, range) {
    const f = v => Math.log1p(Math.max(0, v));
    const [d0, d1] = domain.map(f);
    const scale = v => range[0] + ((f(v) - d0) / (d1 - d0)) * (range[1] - range[0]);
    scale.domain = () => domain;
    scale.range = () => range;
    scale.ticks = () => [0, 10, 100, 1000, 10000].filter(t => t >= domain[0] && t <= domain[1]);   // the decades that fit
    return scale;
  },
});

// views of eight pages, from none to thousands.
const pages = [0, 3, 12, 40, 150, 600, 2200, 9000].map((views, i) => ({ rank: i, views }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={110} theme={theme} data={pages} x="rank" y="views">
      <Scale channel="y" type="log1p" />
      <Dot r={3.5} />
      <Axis channel="y" ticks={4} format="~s" />
      <Axis channel="x" ticks={4} />
    </Plot>
  );
}
