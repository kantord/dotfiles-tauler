// title: Jitter
// section: Positions
//
// Points that share a position hide each other. jitter() spreads them inside their band, and jitterPx() spreads them by pixels on a number axis. Both are deterministic: a row's offset comes from its key, so it does not move when other rows come or go.
// jitter needs a declared band scale and a key; without the key a row is left where it is.
import { Plot, Dot, Scale, Axis, jitter, jitterPx, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented pings: 14 per place, three places; ms grows with the place.
const pings = ["home", "work", "cafe"].flatMap((where, k) =>
  Array.from({ length: 14 }, (_, i) => ({ id: where + i, where, spot: k + 1, ms: 20 + 25 * k + (i % 5) * 3 })));

const SPOT_DOMAIN = [0.4, 3.6];   // the spots are at 1, 2 and 3: 0.6 of room each side keeps the jittered dots inside
const SPREAD_PX = 24;            // each dot moves up to 24 px across, left or right of its spot (jitterPx)

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // key="id" names the field that identifies a row; the offset comes from it, so a dot keeps its offset when other rows come and go.
  // jitter() spreads dots over 0.8 of their band's width (the default); `spot` is the same position as `where`, as a number.
  return (
    <div class="flex flex-row gap-[8px]">
      <Plot width={120} height={110} theme={theme} data={pings} x="where" y="ms">
        <Scale channel="x" type="band" />
        <Dot key="id" position={jitter()} r={2.5} />
        <Axis channel="x" />
      </Plot>
      <Plot width={120} height={110} theme={theme} data={pings} x="spot" y="ms">
        <Scale channel="x" domain={SPOT_DOMAIN} />
        <Dot key="id" position={jitterPx({ width: SPREAD_PX })} r={2.5} />
        <Axis channel="x" ticks={3} />
      </Plot>
    </div>
  );
}
