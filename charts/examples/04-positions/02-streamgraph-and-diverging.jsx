// title: Streamgraph and diverging stacks
// section: Positions
//
// stack takes options: offset "wiggle" with order "insideOut" centres the layers into a streamgraph, and anchor puts one series across zero while the others pile to either side. Along "x" stacks horizontally.
// Inside a Layer, marks share one position, so an Area and a Line can use the same stack().
import { Plot, Area, Bar, Layer, Axis, RuleX, stack, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Invented data: requests per second for three services over 16 seconds, and counts of three answers to three questions.
const traffic = Array.from({ length: 16 }, (_, t) => ["web", "api", "cdn"].map((s, i) => ({ t, s, v: 4 + 3 * i + 3 * Math.sin(t * (0.5 + i * 0.3) + i) })) ).flat();
const answers = ["Q1", "Q2", "Q3"].flatMap((q, i) => [["no", 3 + i], ["maybe", 4 - i + 2], ["yes", 5 + 2 * i]].map(([level, n]) => ({ q, level, n })));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // wiggle keeps the stream's centre line moving as little as possible; insideOut puts the biggest layers in the middle.
  // anchor: "maybe" puts that answer across zero, with "no" piled to the left of it and "yes" to the right (along: "x" stacks sideways).
  return (
    <div class="flex flex-row gap-[8px]">
      <Plot width={150} height={110} theme={theme} data={traffic} x="t" y="v" color="s">
        <Layer position={stack({ offset: "wiggle", order: "insideOut" })}>
          <Area />
        </Layer>
      </Plot>
      <Plot width={90} height={110} theme={theme} data={answers} x="n" y="q" color="level">
        <Bar position={stack({ along: "x", anchor: "maybe" })} />
        <RuleX x={0} />   {/* the zero line, the middle of the "maybe" pieces */}
        <Axis channel="y" />
      </Plot>
    </div>
  );
}
