// title: Shape
// section: Encoding
//
// shape works like color, with a symbol per distinct value. Here one field drives both channels, so the chart still reads without colour.
// The channels are independent: you could just as well colour by one field and shape by another.
import { Plot, Dot, Legend, chartTheme } from "@gh/kantord/dotfiles-tauler";

const runs = [
  { km: 5, mins: 28, route: "river" }, { km: 5.2, mins: 29, route: "river" }, { km: 4.8, mins: 27, route: "river" },
  { km: 10, mins: 58, route: "hills" }, { km: 12, mins: 74, route: "hills" }, { km: 9, mins: 55, route: "hills" },
  { km: 7, mins: 36, route: "park" }, { km: 6.5, mins: 33, route: "park" }, { km: 8, mins: 42, route: "park" },
];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // shape="route" gives each route a symbol in order of first appearance, like colour; r={4} is the symbol's size in px.
  return (
    <Plot width={248} height={120} theme={theme} data={runs} x="km" y="mins" color="route" shape="route">
      <Dot r={4} />
      <Legend channel="color" side="top" />
    </Plot>
  );
}
