// title: A battery gauge
// section: Status-bar recipes
//
// A one-row chart: a track and a fill, both Rects over a fixed 0-100 domain, with the colour picked by a function of the datum. A style prop can be a constant or a function of the row, so no scale is needed for a rule this simple.
// The Plot is 14 pixels tall; the number and the label are ordinary tailwind text around it.
import { Plot, Rect, Scale } from "@gh/kantord/dotfiles-tauler";

// const battery = useJSONStream("/usr/bin/bash", `upower-watch`) ?? { percent: 0 };
const battery = { percent: 18, charging: false };

const PERCENT = [0, 100];   // the track is the whole range, the fill a part of it
const UNIT = [0, 1];        // one row: y runs 0 to 1 and both Rects span all of it
const LOW = 20, MEDIUM = 50;   // below 20 % the fill is red, below 50 % yellow, else green

export default function Example() {
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  const color = p => (p < LOW ? colors["ansi-red"] : p < MEDIUM ? colors["ansi-yellow"] : colors["ansi-green"]);
  return (
    <div class="flex flex-col w-full gap-[5px]">
      <div class="flex flex-row justify-between items-baseline w-full">
        <span class="text-[10px]" style={{ color: themeColor("foreground", 0.45) }}>battery</span>
        <span class="text-[10px]" style={{ color: themeColor("foreground", 0.82) }}>{battery.percent}%</span>
      </div>
      <Plot width={232} height={14} margin={{ top: 2, right: 0, bottom: 2, left: 0 }} data={[battery]}>
        <Scale channel="x" domain={PERCENT} />
        <Scale channel="y" domain={UNIT} />
        <Rect x1={0} x2={100} y1={0} y2={1} fill={themeColor("foreground", 0.12)} rx={5} />   {/* rx: corner radius in px, half the 10 px row */}
        <Rect x1={0} x2="percent" y1={0} y2={1} fill={d => color(d.percent)} rx={5} />
      </Plot>
    </div>
  );
}
