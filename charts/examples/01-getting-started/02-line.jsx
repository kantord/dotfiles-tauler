// title: A line over time
// section: Getting started
//
// Swap the mark and the same data becomes a line. Dates are recognised on their own: a field holding Date objects gets a time scale.
// Marks inherit x and y from the Plot, so the mark itself needs no props.
import { Plot, Line, chartTheme } from "@gh/kantord/dotfiles-tauler";

// const samples = useJSONStream("/usr/bin/bash", `"${SAMPLER}" 2 | ${TAULER_ACCUMULATE} -n 60`) ?? [];
// Invented data: a daily swing around 14 degrees plus a little noise, one sample every 30 minutes.
const start = Date.UTC(2026, 9, 1);   // 1 October 2026 00:00 UTC (months count from 0)
const STEP_MS = 30 * 60000;   // 30 minutes in milliseconds
const samples = Array.from({ length: 48 }, (_, i) => ({
  t: new Date(start + i * STEP_MS),
  temp: 14 + 6 * Math.sin((i - 14) / 7.6) + 0.6 * Math.sin(i * 2.3),
}));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  return (
    <Plot width={248} height={110} theme={theme} data={samples} x="t" y="temp">
      <Line />
    </Plot>
  );
}
