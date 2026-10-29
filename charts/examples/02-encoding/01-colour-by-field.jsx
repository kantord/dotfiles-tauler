// title: Colour by a field
// section: Encoding
//
// A channel is a way a field can drive the picture. Naming a text field as color gives every distinct value its own colour from the theme's palette, in the order the values first appear.
// Legend reads the keys from the colour scale itself and makes room for its row.
import { Plot, Dot, Legend, chartTheme } from "@gh/kantord/dotfiles-tauler";

// One row per running process: cpu and memory share, and what kind of process it is.
const processes = [
  { cpu: 38, mem: 22, kind: "web" }, { cpu: 31, mem: 35, kind: "web" }, { cpu: 12, mem: 28, kind: "web" },
  { cpu: 4, mem: 6, kind: "shell" }, { cpu: 2, mem: 3, kind: "shell" }, { cpu: 7, mem: 4, kind: "shell" },
  { cpu: 22, mem: 9, kind: "build" }, { cpu: 41, mem: 14, kind: "build" }, { cpu: 17, mem: 11, kind: "build" },
  { cpu: 3, mem: 15, kind: "daemon" }, { cpu: 6, mem: 19, kind: "daemon" },
];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // The four kinds take the first four colours of theme.palette, in order of first appearance: web, shell, build, daemon.
  return (
    <Plot width={248} height={120} theme={theme} data={processes} x="cpu" y="mem" color="kind">
      <Dot />
      <Legend channel="color" side="top" />
    </Plot>
  );
}
