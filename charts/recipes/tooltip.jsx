// Recipe: a tooltip. A figure is a static picture (ADR 0044), so a tooltip is a mark drawn from
// state the host owns: pass the hovered datum as the mark's `data`, and a different datum is a
// different picture and a different key. Uses only `defineMark` and `ctx`, as any third-party
// mark does (SPEC 5.4).
import { defineMark } from '../core.jsx';

const top = row => row.y2 ?? row.y;   // the far end of y, as the built-in marks read it
const PAD = 4, LINE_HEIGHT = 14, OFFSET = 8, SIZE = 11;

// A box beside each row's point: `lines` is an array of strings, or a function of the datum that
// returns one. It flips to the left of the point near the right edge and stays inside the plot
// area vertically. Drawn unclipped, on top (`front`).
export const Tooltip = defineMark('tooltip', {
  render: (rows, ctx) => rows.flatMap(r => {
    const p = ctx.point(r.x, top(r), r), lines = ctx.field(r, 'lines') ?? [];
    if (!p || !lines.length) return [];
    const width = Math.max(...lines.map(l => ctx.measure(l, SIZE))) + 2 * PAD, height = lines.length * LINE_HEIGHT + 2 * PAD;
    const { area } = ctx;
    const x = p[0] + OFFSET + width > area.right ? p[0] - OFFSET - width : p[0] + OFFSET;
    const y = Math.min(Math.max(p[1] - height / 2, area.top), area.bottom - height);
    return [
      { t: 'rect', x, y, width, height, rx: 3, fill: ctx.theme.line, stroke: ctx.theme.lineStrong, front: true },
      ...lines.map((text, i) => ({ t: 'text', x: x + PAD, y: y + PAD + LINE_HEIGHT * (i + 0.8), text, fontSize: SIZE, fill: ctx.theme.ink, front: true })),
    ];
  }),
});
