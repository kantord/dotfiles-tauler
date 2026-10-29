// title: Wrapped and rotated text
// section: Text
//
// Text with width wraps at that many pixels, one line per shape; a word wider than the width is cut. angle turns the whole block (degrees, clockwise) about its anchor.
// Text is drawn unclipped and on top, and the width of each line comes from the theme's measure, exact for a monospace font.
import { Plot, Dot, Text, Scale, chartTheme } from "@gh/kantord/dotfiles-tauler";

const X_DOMAIN = [0, 10];   // the notes are at x 2 and 5.2, the rotated word at 8.5
const Y_DOMAIN = [0, 6];
const WRAP_PX = 80;         // a note wraps into lines at most 80 px wide

const notes = [
  { x: 2, y: 2, note: "Deploy of the new build pipeline went out" },
  { x: 5.2, y: 4.6, note: "Cache cleared after the incident" },
];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // textAnchor="start" starts the text at the point; dx moves it 6 px right (clear of the dot), dy 2 px up; angle=-30 turns the word 30 degrees anticlockwise.
  return (
    <Plot width={248} height={120} theme={theme} data={notes} x="x" y="y">
      <Scale channel="x" domain={X_DOMAIN} />
      <Scale channel="y" domain={Y_DOMAIN} />
      <Dot r={3} />
      <Text text={d => d.note} width={WRAP_PX} textAnchor="start" dx={6} dy={-2} fontSize={10} />   {/* dx: 6 px right of the point; dy: 2 px up */}
      <Text data={[{ x: 8.5, y: 1 }]} text={() => "rotated"} angle={-30} />
    </Plot>
  );
}
