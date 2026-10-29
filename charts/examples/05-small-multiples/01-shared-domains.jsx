// title: Small multiples with shared domains
// section: Small multiples
//
// There is no facet component: a small multiple is a loop that makes one Plot per group. The panels line up and compare fairly because every one is given the same explicit domains, and the same margin.
// Without the shared y domain, each panel would stretch its own data to fill the height.
import { Plot, Line, Area, Scale, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Load of four cpu cores over the last 20 samples.
const loads = [0, 1, 2, 3].flatMap(core =>
  Array.from({ length: 20 }, (_, t) => ({ core, t, load: Math.max(2, 25 + 18 * core + 20 * Math.sin(t / (2 + core) + core)) })));
const cores = [0, 1, 2, 3].map(core => loads.filter(r => r.core === core));

const LAST_T = 19;   // 20 samples, t = 0 to 19: every panel's x domain

export default function Example() {
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  // yMax: the highest load of any core, so all four panels share one y domain (0 to yMax).
  // margin 1 px all round: strokes at the extremes stay visible; the same margin in every panel keeps them aligned.
  const yMax = Math.max(...loads.map(r => r.load));
  return (
    <div class="flex flex-row gap-[8px]">
      {cores.map(rows => (
        <div class="flex flex-col gap-[4px]">
          <span class="text-[10px]" style={{ color: themeColor("foreground", 0.45) }}>core {rows[0].core}</span>
          <Plot width={52} height={40} margin={{ top: 1, right: 1, bottom: 1, left: 1 }} data={rows} x="t" y="load">
            <Scale channel="x" domain={[0, LAST_T]} />
            <Scale channel="y" domain={[0, yMax]} />
            <Area fill={colors["ansi-cyan"]} fillOpacity={0.18} />
            <Line stroke={colors["ansi-cyan"]} />
          </Plot>
        </div>
      ))}
    </div>
  );
}
