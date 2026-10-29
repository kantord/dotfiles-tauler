// title: A calendar load strip
// section: Status-bar recipes
//
// Twenty-four hours as twenty-four bands in a row, each shaded by how many meetings it holds. Integer hours would be read as numbers, so the x scale is declared a band with an explicit domain; that also keeps the empty hours.
// The Rect writes its y ends as functions: a mark whose own channels are all constants is an annotation that ignores the Plot's data. A sequential colour scale does the shading, and a fixed colour domain keeps the strip comparable from day to day.
import { Plot, Rect, Scale } from "@gh/kantord/dotfiles-tauler";

// const events = useJSONStream("/usr/bin/bash", `calendar-today`) ?? [];
const meetings = { 9: 1, 10: 2, 11: 3, 13: 1, 14: 2, 15: 4, 16: 2, 17: 1 };
const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: meetings[hour] ?? 0 }));

const MAX_MEETINGS = 4;   // the colour ramp ends at 4 meetings in an hour (the busiest hour here)
const UNIT = [0, 1];      // one row: y runs 0 to 1 and the Rect spans all of it
const GAP = 0.12;         // space between hours, as a fraction of a slot (12%)

export default function Example() {
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  return (
    <div class="flex flex-col w-full gap-[4px]">
      <div class="flex flex-row justify-between w-full">
        <span class="text-[10px]" style={{ color: themeColor("foreground", 0.45) }}>today</span>
        <span class="text-[10px]" style={{ color: themeColor("foreground", 0.82) }}>{hours.reduce((n, h) => n + h.count, 0)} meetings</span>
      </div>
      <Plot width={232} height={16} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} data={hours} x="hour" color="count">
        <Scale channel="x" type="band" domain={hours.map(h => h.hour)} padding={GAP} />
        <Scale channel="color" domain={[0, MAX_MEETINGS]} range={[themeColor("foreground", 0.1), colors["ansi-yellow"]]} />
        <Rect y1={() => 0} y2={() => 1} />
        <Scale channel="y" domain={UNIT} />
      </Plot>
    </div>
  );
}
