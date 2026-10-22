import { compile } from "./compile.jsx";

// Display component: draws a chart spec in tauler. Vertical only, one fixed
// linear y scale, `rect` and `rule` marks (see marks.jsx). It fills the height
// it is given.
//
//   <Chart
//     scales={{ y: { domain: [360, 1320], ticks: [
//       { every: 60, overSpans: true, alpha: 0.18, label: v => v / 60 },
//       { every: 30, width: "30%", alpha: 0.08 },
//       { every: 15, width: "15%", alpha: 0.15, dotted: true },
//     ] } }}
//     marks={[rect(events, { y1: "start", y2: "end", fill: "color", label: "title" })]}
//   />
//
// Ticks are guides of the y scale, listed coarsest first; a value gets the
// first tick whose `every` divides it. `width` is a CSS size (default "100%"),
// `alpha` the tick's strength, `overSpans` lets it cross a rect (otherwise it
// is hidden inside one), `label(v)` writes text beside it.
//
// Drawing: one flat flex column with no `position: absolute` (a layered grid
// under an absolute overlay intermittently failed to render in tauler). The
// scene's range is cut at every tick, rect edge and rule into segments, each a
// row whose flex-grow is its length, so layers combine inside a segment.
const RULE_MIN_HEIGHT = "18px"; // a rule's segment can be a couple of px: too short for its label

// Array.prototype.findLast, spelled out: not every JS engine tauler might run on has it.
function last(items, test) {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i])) return items[i];
  return null;
}

function segmentsOf({ domain: [from, to], ticks, nodes }) {
  const clip = (v) => Math.max(from, Math.min(to, v));
  const rects = nodes.filter((n) => n.kind === "rect" && n.to > from && n.from < to);
  const rules = nodes.filter((n) => n.kind === "rule" && n.at >= from && n.at <= to);

  const boundaries = new Set([from, to]);
  const finest = Math.min(...ticks.map((t) => t.every));
  if (finest > 0) {
    for (let v = Math.ceil(from / finest) * finest; v < to; v += finest) boundaries.add(v);
  }
  for (const r of rects) {
    boundaries.add(clip(r.from));
    boundaries.add(clip(r.to));
  }
  for (const r of rules) boundaries.add(r.at);

  const sorted = [...boundaries].sort((a, b) => a - b);
  const segments = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const length = sorted[i + 1] - start;
    segments.push({
      start,
      length,
      // later marks sit on top, so the last match wins
      rect: last(rects, (r) => r.from <= start && r.to >= start + length),
      rule: last(rules, (r) => r.at === start),
      tick: ticks.find((t) => start % t.every === 0) ?? null,
    });
  }
  return segments;
}

export default function Chart({ marks, scales }) {
  const scene = compile({ marks, scales });
  const [from] = scene.domain;

  return (
    <div class="flex flex-col h-full w-full" style={{ overflow: "hidden" }}>
      {segmentsOf(scene).map((seg) => {
        const { rect, rule, tick } = seg;
        const style = { flexGrow: seg.length, flexBasis: 0, flexShrink: 0, overflow: "hidden", width: "100%" };
        if (rect) {
          // THEME-GAP: fill and stroke are per-datum semantic colours, not theme tokens
          style.backgroundColor = rect.fill + "22";
          style.borderLeft = `2px solid ${rect.fill}`;
        }
        const drawTick = tick && (!rect || tick.overSpans);
        if (rule) {
          style.borderTop = `2px solid ${rule.stroke}`;
          style.minHeight = RULE_MIN_HEIGHT;
        } else if (drawTick) {
          style.width = tick.width ?? "100%";
          style.borderTop = `1px ${tick.dotted ? "dotted" : "solid"} ${themeColor("foreground", tick.alpha ?? 0.15)}`;
        }

        const tickLabel = drawTick && !rule && tick.label ? tick.label(seg.start) : null;
        return (
          <div key={seg.start} style={style}>
            {rect && seg.start === Math.max(from, rect.from) && rect.label != null && (
              <span class="text-[8px] text-foreground leading-none" style={{ paddingLeft: 3, paddingTop: 2 }}>
                {rect.label}
              </span>
            )}
            {!rect && tickLabel != null && (
              <span class="text-[9px] leading-none" style={{ color: themeColor("foreground"), paddingTop: 3, paddingLeft: 3 }}>
                {tickLabel}
              </span>
            )}
            {rule && rule.label != null && (
              <span class="text-[9px] leading-none" style={{ color: rule.stroke, paddingTop: 1, paddingLeft: 3 }}>
                {rule.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
