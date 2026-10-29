// title: Sequential and diverging colour
// section: Encoding
//
// A number on color makes a sequential scale: a ramp from low to high. Give the colour Scale three stops and a domain around a pivot, and it diverges: cold, neutral, warm.
// Text on color (the previous examples) would have made a categorical scale instead; the type of the field decides.
import { Plot, Bar, Scale, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

const hours = Array.from({ length: 12 }, (_, i) => ({ hour: i * 2, temp: Math.round(-3 + 14 * Math.sin((i - 2) / 3.6)) }));

const PIVOT = [-8, 0, 12];   // coldest value, the neutral point (0 degrees), warmest value: three stops, so the scale diverges

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  // Left: no colour Scale is written, so temp is coloured by a ramp from its lowest to its highest value.
  // type="band" on x: hours are numbers, but each is one bar, not a position on a number line.
  return (
    <div class="flex flex-row gap-[8px]">
      <Plot width={120} height={110} theme={theme} data={hours} x="hour" y="temp" color="temp">
        <Scale channel="x" type="band" />
        <Bar />
        <Axis channel="x" ticks={3} />
      </Plot>
      <Plot width={120} height={110} theme={theme} data={hours} x="hour" y="temp" color="temp">
        <Scale channel="x" type="band" />
        <Scale channel="color" domain={PIVOT} range={[colors["ansi-blue"], theme.line, colors["ansi-red"]]} />
        <Bar />
        <Axis channel="x" ticks={3} />
      </Plot>
    </div>
  );
}
