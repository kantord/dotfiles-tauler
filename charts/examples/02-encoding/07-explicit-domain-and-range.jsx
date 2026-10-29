// title: Explicit domain and range
// section: Encoding
//
// A Scale maps a domain (the values) to a range (pixels, or colours for the colour channel). Left alone it is trained on the data; written out, it stays put however the data moves.
// Here the y domain is 0-100 so the chart always shows a whole battery, and the colour range runs from red through yellow to green over that same domain.
import { Plot, Bar, Scale, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

const charge = Array.from({ length: 12 }, (_, i) => ({ hour: i * 2, percent: Math.round(96 - i * 7.2 + (i % 3) * 2) }));

const PERCENT = [0, 100];          // a battery is a percentage
const STOPS = [0, 50, 100];         // red at 0, yellow at 50, green at 100: one colour per stop

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  return (
    <Plot width={248} height={110} theme={theme} data={charge} x="hour" y="percent" color="percent">
      <Scale channel="x" type="band" />
      <Scale channel="y" domain={PERCENT} />
      <Scale channel="color" domain={STOPS} range={[colors["ansi-red"], colors["ansi-yellow"], colors["ansi-green"]]} />
      <Bar />
      <Axis channel="x" ticks={6} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
