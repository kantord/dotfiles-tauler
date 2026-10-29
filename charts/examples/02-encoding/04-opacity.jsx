// title: Opacity
// section: Encoding
//
// opacity="confidence" fades each dot by a number. It is the quietest encoding: good for how sure a value is, rather than what it is.
// A function or a plain number on the style prop (opacity={0.5}) still wins over the channel.
import { Plot, Dot, Axis, Scale, chartTheme } from "@gh/kantord/dotfiles-tauler";

// A forecast for the next days: the temperature and how much the model trusts it.
const forecast = [
  { day: 1, temp: 18, confidence: 0.95 }, { day: 2, temp: 19, confidence: 0.9 }, { day: 3, temp: 21, confidence: 0.8 },
  { day: 4, temp: 24, confidence: 0.7 }, { day: 5, temp: 22, confidence: 0.55 }, { day: 6, temp: 17, confidence: 0.4 },
  { day: 7, temp: 15, confidence: 0.3 },
];

const OPACITY_RANGE = [0.2, 1];   // the opacity of the lowest and of the highest confidence (these are also the defaults)
const EDGE_PAD = 10;             // px kept free at both ends of x, so the first and last dots are not cut

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={110} theme={theme} data={forecast} x="day" y="temp">
      <Dot r={6} opacity="confidence" />
      <Scale channel="x" rangePad={EDGE_PAD} />
      <Scale channel="opacity" range={OPACITY_RANGE} />
      <Axis channel="x" ticks={7} />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
