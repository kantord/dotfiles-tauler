// title: A latency histogram
// section: Status-bar recipes
//
// bin runs in the layout on whatever window of samples the stream holds, and the Plot is drawn straight from the bins. A RuleX marks the 95th percentile, computed with plain array code.
// Bars over bins take x1 and x2; the y scale starts at zero by itself.
import { Plot, Bar, RuleX, Scale, bin } from "@gh/kantord/dotfiles-tauler";

// Invented data: latencies in ms, mostly near 20 with a long tail.
// (A fixed pseudo-random sequence, so the picture is the same on every run.)
// const samples = useJSONStream("/usr/bin/bash", `"${PROBE}" | ${TAULER_ACCUMULATE} -n 200`) ?? [];
const samples = Array.from({ length: 200 }, (_, i) => {
  const u = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1;
  return { ms: Math.round(18 - 12 * Math.log(1 - u * 0.97)) };
});

export default function Example() {
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  const sorted = samples.map(s => s.ms).sort((a, b) => a - b);
  // p95: the value 95% of the way through the sorted latencies (95% of requests were this fast or faster).
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  // bin() returns rows { x0, x1, count }; thresholds: 16 asks for about sixteen intervals. inset={0.5} leaves half a pixel between bars.
  return (
    <div class="flex flex-col w-full gap-[6px]">
      <div class="flex flex-row justify-between items-baseline w-full">
        <span class="text-[10px]" style={{ color: themeColor("foreground", 0.45) }}>latency</span>
        <span class="text-[10px]" style={{ color: colors["ansi-yellow"] }}>p95 {p95} ms</span>
      </div>
      <Plot width={232} height={44} margin={{ top: 1, right: 0, bottom: 1, left: 0 }} data={bin(samples, { value: "ms", thresholds: 16 })}>
        <Bar x1="x0" x2="x1" y="count" fill={colors["ansi-cyan"]} fillOpacity={0.7} inset={0.5} />
        <RuleX x={p95} stroke={colors["ansi-yellow"]} />
      </Plot>
    </div>
  );
}
