// title: CPU and memory sparkline
// section: Status-bar recipes
//
// The shape of a real panel: a label row in tailwind classes, then a bare Plot at the size of the column, with no axes and no margin. A filled Area and two Lines share one 0-100 scale, so cpu and memory are comparable at a glance.
// The window of samples is rolled by tauler-accumulate; the Plot is redrawn only when its picture changes.
import { Plot, Area, Line, Scale } from "@gh/kantord/dotfiles-tauler";

const WINDOW_S = 118;   // 60 samples two seconds apart span 118 seconds: the x domain slides along with the newest sample
const PERCENT = [0, 100];

// Invented data: t in seconds, cpu and mem in percent.
// const samples = useJSONStream("/usr/bin/bash", `"${SAMPLER}" 2 | ${TAULER_ACCUMULATE} -n 60`) ?? [];
const samples = Array.from({ length: 60 }, (_, i) => ({
  t: 1000 + i * 2,
  cpu: Math.min(100, 28 + 24 * Math.sin(i / 6) + 16 * Math.sin(i * 1.9) ** 2),
  mem: 52 + 8 * Math.sin(i / 17) + i / 12,
}));

export default function Example() {
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  const latest = samples.at(-1);
  const now = latest.t;
  // margin: 1 px top and bottom so the strokes at the extremes are not clipped; none sideways, the lines run edge to edge.
  return (
    <div class="flex flex-col w-full gap-[6px]">
      <div class="flex flex-row justify-between items-baseline w-full">
        <span class="text-[10px]"><span style={{ color: themeColor("foreground", 0.45) }}>cpu </span><span style={{ color: colors["ansi-cyan"] }}>{Math.round(latest.cpu)}%</span></span>
        <span class="text-[10px]"><span style={{ color: themeColor("foreground", 0.45) }}>mem </span><span style={{ color: colors["ansi-magenta"] }}>{Math.round(latest.mem)}%</span></span>
      </div>
      <Plot width={232} height={44} margin={{ top: 1, right: 0, bottom: 1, left: 0 }} data={samples} x="t">
        <Scale channel="x" domain={[now - WINDOW_S, now]} />
        <Scale channel="y" domain={PERCENT} />
        <Area y="cpu" curve="monotone" fill={colors["ansi-cyan"]} fillOpacity={0.18} />
        <Line y="cpu" curve="monotone" stroke={colors["ansi-cyan"]} strokeWidth={1.5} />
        <Line y="mem" curve="monotone" stroke={colors["ansi-magenta"]} strokeWidth={1.2} opacity={0.8} />
      </Plot>
    </div>
  );
}
