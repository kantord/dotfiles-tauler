// title: A gradient fill
// section: Decoration
//
// fill and stroke take a paint as well as a colour. linearGradient fades the area from the line's colour to transparent along its own height, which gives a depth that a flat fillOpacity cannot.
// radialGradient, pattern and hatch are the other paints. The gradient is one shape, not a stack of slices.
import { Plot, Area, Line, Scale, linearGradient } from "@gh/kantord/dotfiles-tauler";

const PERCENT = [0, 100];   // memory is a percentage

// Invented data: memory percent for 50 samples.
const samples = Array.from({ length: 50 }, (_, i) => ({ t: i, mem: 45 + 20 * Math.sin(i / 6) + 8 * Math.sin(i * 1.3) }));

export default function Example() {
  const color = ctx.theme.colors["ansi-magenta"];
  // The gradient runs top to bottom (to: "bottom"): at offset 0 (the top) the colour is 55% opaque, at offset 1 (the bottom) invisible.
  // margin: 2 px on top so the line's peak is not clipped; the strip runs edge to edge sideways.
  const fade = linearGradient({ to: "bottom", stops: [{ offset: 0, color, opacity: 0.55 }, { offset: 1, color, opacity: 0 }] });
  return (
    <Plot width={232} height={60} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} data={samples} x="t" y="mem">
      <Scale channel="y" domain={PERCENT} />
      <Area curve="monotone" fill={fade} />
      <Line curve="monotone" stroke={color} strokeWidth={1.5} />
    </Plot>
  );
}
