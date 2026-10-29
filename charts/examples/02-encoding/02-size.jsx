// title: Size
// section: Encoding
//
// size="mb" sends a number through a size scale into the radius of each dot. A square-root scale with a domain that starts at 0 makes the dot's area, not its radius, proportional to the value.
// The scale's range is the smallest and largest radius in pixels.
import { Plot, Dot, Scale, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Build jobs: how long they ran, how much memory they peaked at, and how large their output is.
const jobs = [
  { secs: 12, peak: 310, mb: 4 }, { secs: 35, peak: 520, mb: 22 }, { secs: 48, peak: 480, mb: 9 },
  { secs: 70, peak: 900, mb: 64 }, { secs: 95, peak: 760, mb: 31 }, { secs: 120, peak: 1300, mb: 120 },
  { secs: 22, peak: 280, mb: 1 }, { secs: 60, peak: 640, mb: 15 },
];

const MB_DOMAIN = [0, 120];   // output sizes the dot size is scaled over, in MB (the largest job is 120)
const RADII = [1, 12];       // the radius in px of a 0 MB and of a 120 MB dot
const EDGE_PAD = 12;         // px kept free at both ends of x, so the largest dot is not cut

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={120} theme={theme} data={jobs} x="secs" y="peak">
      <Dot size="mb" fillOpacity={0.7} />
      <Scale channel="size" type="sqrt" domain={MB_DOMAIN} range={RADII} />
      <Scale channel="x" rangePad={EDGE_PAD} />
      <Axis channel="x" ticks={4} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
