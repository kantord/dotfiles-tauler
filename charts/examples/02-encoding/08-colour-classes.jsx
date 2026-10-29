// title: Threshold and quantize colour classes
// section: Encoding
//
// A threshold scale cuts the domain at the edges you give and takes one colour per class: here ok, warning and critical. A quantize scale cuts the data's own range into equal steps.
// The colour channel carries the same field both times; only the scale type differs.
import { Plot, Bar, Scale, Axis, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Load of each cpu core, in percent.
const cores = [12, 34, 58, 72, 91, 66, 45, 83].map((load, i) => ({ core: i, load }));

const CUTS = [70, 90];   // load below 70 is ok, 70 to 90 a warning, 90 and above critical
const PERCENT = [0, 100];   // load is a percentage

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  // classes: the colours in order, low to high. quantize cuts PERCENT into as many equal steps (0-33, 33-67, 67-100).
  const classes = [colors["ansi-green"], colors["ansi-yellow"], colors["ansi-red"]];
  return (
    <div class="flex flex-row gap-[8px]">
      <Plot width={120} height={110} theme={theme} data={cores} x="core" y="load" color="load">
        <Scale channel="x" type="band" />
        <Scale channel="y" domain={PERCENT} />
        <Scale channel="color" type="threshold" domain={CUTS} range={classes} />
        <Bar />
        <Axis channel="x" ticks={4} />
      </Plot>
      <Plot width={120} height={110} theme={theme} data={cores} x="core" y="load" color="load">
        <Scale channel="x" type="band" />
        <Scale channel="y" domain={PERCENT} />
        <Scale channel="color" type="quantize" domain={PERCENT} range={classes} />
        <Bar />
        <Axis channel="x" ticks={4} />
      </Plot>
    </div>
  );
}
