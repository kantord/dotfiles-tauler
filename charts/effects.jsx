// Marks that draw scene shapes beyond the data ones: images at points, and groups (SPEC 5.2).
import { defineMark, top } from './core.jsx';

// The style props every data mark passes through besides its own (appended after them, as the
// scene key hashes shape keys in order): effects of defs.jsx, and `blend` (a mix-blend-mode).
export const EFFECTS = ['filter', 'mask', 'clip', 'blend'];

// The style props a shape kind takes, each read through `ctx.resolve` (function > constant >
// colour scale > fallback), so every built-in mark passes the same ones through.
// (Order matters: the scene key hashes the keys in order.)
export const RECT = ['fill', 'stroke', 'strokeWidth', 'fillOpacity', 'opacity', 'strokeDasharray', 'strokeOpacity', ...EFFECTS];
export const LINE = ['stroke', 'strokeWidth', 'strokeDasharray', 'opacity', 'strokeOpacity', 'strokeLinecap', 'strokeLinejoin', 'markerStart', 'markerEnd', ...EFFECTS];
export const styleOf = (ctx, row, names) => Object.fromEntries(names.map(n => [n, ctx.resolve(row, n)]));

// An image centred on each point: `href` (a field of the datum, or a data: URL itself), `width` and
// `height` in px.
export const Image = defineMark('image', {
  render: (rows, ctx) => rows.filter(r => top(r) != null && r.x != null).flatMap(r => {
    const p = ctx.point(r.x, top(r), r), [w, h] = [ctx.resolve(r, 'width', 16), ctx.resolve(r, 'height', 16)];
    return p ? [{ t: 'image', x: p[0] - w / 2, y: p[1] - h / 2, width: w, height: h, href: ctx.field(r, 'href') ?? ctx.props.href,
      opacity: ctx.resolve(r, 'opacity'), filter: ctx.resolve(r, 'filter'), mask: ctx.resolve(r, 'mask'), clip: ctx.resolve(r, 'clip'), blend: ctx.resolve(r, 'blend') }] : [];
  }),
});

// One group of scene shapes (an array, or a function of the mark context) in figure pixels, under
// one `transform`, `clip`, `mask`, `filter`, `blend` or `opacity`. It reads no data rows. With `front` it is drawn unclipped, on top.
export const Group = defineMark('group', {
  render(_rows, ctx) {
    const p = ctx.props, shapes = typeof p.shapes === 'function' ? p.shapes(ctx) : p.shapes ?? [];
    return [{ t: 'g', transform: p.transform, opacity: p.opacity, filter: p.filter, mask: p.mask, clip: p.clip, blend: p.blend,
      front: p.front, children: shapes }];
  },
});
