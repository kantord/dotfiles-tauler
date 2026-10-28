// The Text mark: one label per row, drawn unclipped and on top (SPEC 5.2, 5.4).
import * as d3 from 'd3';
import { defineMark, top, text, FONT_SIZE } from './core.jsx';
import { wrap, blockHeight, fitsBox, rotation, LINE_HEIGHT, PAD } from './typeset.jsx';

const hasBox = r => r.x1 != null && r.x2 != null && r.y1 != null && r.y2 != null;

// Text at `x` and the far end of y (`y2 ?? y`), or inside the box x1..x2, y1..y2: centred, or in
// the top-left (`textAnchor="start"`) or top-right (`"end"`) corner. `width` wraps lines to that
// many px (and "\n" breaks), `angle` turns the label clockwise about its anchor, `fit` draws it
// only where its lines fit the box.
export const Text = defineMark('text', {
  render(rows, ctx) {
    const { area, theme, props } = ctx;
    if (props.fit && rows.some(r => !hasBox(r))) throw new Error('Text fit: needs the box channels x1, x2, y1 and y2');
    return rows.flatMap(r => {
      const size = ctx.resolve(r, 'fontSize', FONT_SIZE), own = ctx.resolve(r, 'textAnchor');
      const lines = wrap(ctx.resolve(r, 'text', ''), ctx.resolve(r, 'width'), ctx.measure, size);
      let x, y, dy, anchor = own ?? 'middle';
      if (hasBox(r)) {
        // Under a coord the box is the bounding box of its corners and its middle, through ctx.point.
        const corners = ctx.coord ? [[r.x1, r.y1], [r.x1, r.y2], [r.x2, r.y1], [r.x2, r.y2], [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2]].map(([a, b]) => ctx.point(a, b, r)) : null;
        if (corners?.includes(null)) return [];   // the coord hides it
        const [xa, xb, ya, yb] = corners ? [d3.min(corners, p => p[0]), d3.max(corners, p => p[0]), d3.min(corners, p => p[1]), d3.max(corners, p => p[1])]
          : [ctx.x(r.x1), ctx.x(r.x2), ctx.y(r.y1), ctx.y(r.y2)];
        const [left, right, upper, lower] = [Math.min(xa, xb), Math.max(xa, xb), Math.min(ya, yb), Math.max(ya, yb)];
        if (props.fit && !fitsBox(lines, right - left, lower - upper, ctx.measure, size)) return [];
        const middle = corners ? corners[4] : [(left + right) / 2, (upper + lower) / 2];
        x = own === 'start' ? left + PAD : own === 'end' ? right - PAD : middle[0];
        const block = blockHeight(lines.length, size);
        y = (own === 'start' || own === 'end' ? upper + PAD : middle[1] - block / 2) + size / 2;
        dy = '0.32em';
      } else {
        // Under polar, a Text with no x and no y sits at the centre.
        const centred = ctx.coord?.centre && r.x == null && top(r) == null;
        const p = centred ? ctx.coord.centre : ctx.point(r.x, top(r));
        if (!p) return [];   // the coord hides it
        // Under polar, with no `textAnchor`, the anchor comes from the angle and the label sits outside the point.
        const at = !centred && own == null ? ctx.coord?.label?.(p) : null;
        x = (at ? at.x : r.x != null || centred ? p[0] : area.left) + ctx.resolve(r, 'dx', 0);
        y = (at ? at.y : top(r) != null || centred ? p[1] : area.top) + ctx.resolve(r, 'dy', 0);
        dy = at?.dy;
        if (at) anchor = at.textAnchor ?? 'middle';
      }
      const angle = ctx.resolve(r, 'angle');
      // (Key order is part of the scene key: the keys of a one-line, unrotated label are as they always were.)
      return lines.map((line, i) => text(x, y + i * size * LINE_HEIGHT, line, { fontSize: size, fontFamily: theme.font, textAnchor: anchor,
        fill: ctx.resolve(r, 'fill', theme.muted), fontWeight: ctx.resolve(r, 'fontWeight'), dy, front: true,
        ...(angle && { transform: rotation(angle, x, y) }) }));
    });
  },
});
