// title: One dot per row
// section: Getting started
//
// A Plot takes rows of data, and x and y name the field each row is positioned by. A mark draws one shape per row, so Dot gives fourteen dots here.
// No axes are drawn until you ask for them (see "Axes and grid").
import { Plot, Dot, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Commits per day over the last fortnight.
const days = [3, 5, 2, 8, 6, 0, 1, 4, 9, 7, 5, 2, 0, 6].map((commits, i) => ({ day: i + 1, commits }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // No Scale is written: each axis covers the data's extent, rounded outwards to round numbers.
  return (
    <Plot width={248} height={110} theme={theme} data={days} x="day" y="commits">
      <Dot />
    </Plot>
  );
}
