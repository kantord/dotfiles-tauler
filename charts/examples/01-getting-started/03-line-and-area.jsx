// title: Line and area layers
// section: Getting started
//
// Marks are layers: they are drawn in the order you write them, all over the same scales. This is the sparkline of a status bar: a faint Area under a Line, with no axes and no margin.
// Pinning the y scale to 0-100 keeps the picture from rescaling as the samples change.
import { Plot, Area, Line, Scale } from "@gh/kantord/dotfiles-tauler";

const PERCENT = [0, 100];   // cpu is a percentage: the y scale always spans all of it

// Invented data: cpu percent every 2 seconds (t in seconds), kept within 2-100.
// const samples = useJSONStream("/usr/bin/bash", `"${SAMPLER}" 2 | ${TAULER_ACCUMULATE} -n 60`) ?? [];
const samples = Array.from({ length: 60 }, (_, i) => ({
  t: i * 2,
  cpu: Math.min(100, Math.max(2, 30 + 22 * Math.sin(i / 5) + 18 * Math.sin(i * 1.7) ** 2)),
}));

export default function Example() {
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  const latest = samples.at(-1);
  // margin: pixels kept free around the plot; 1 px top and bottom so the strokes at 0 and 100 are not clipped.
  // curve="monotone": a smooth curve that never overshoots the samples.
  return (
    <div class="flex flex-col w-full gap-[6px]">
      <span class="text-[10px]"><span style={{ color: themeColor("foreground", 0.45) }}>cpu </span><span style={{ color: colors["ansi-cyan"] }}>{Math.round(latest.cpu)}%</span></span>
      <Plot width={232} height={44} margin={{ top: 1, right: 0, bottom: 1, left: 0 }} data={samples} x="t" y="cpu">
        <Scale channel="y" domain={PERCENT} />
        <Area curve="monotone" fill={colors["ansi-cyan"]} fillOpacity={0.18} />
        <Line curve="monotone" stroke={colors["ansi-cyan"]} strokeWidth={1.5} />
      </Plot>
    </div>
  );
}
