// Tree marks: a hierarchy laid out by d3 in the plot area. Plain `defineMark`s; core knows
// nothing about trees.
//
// The hierarchy comes from flat rows, so data stays plain JSON: either `path`, a field holding
// "a/b/c" (missing parents are filled in, as for a disk-usage listing), or `id` and `parent`.
// `value` sizes the leaves (Treemap, Pack, Partition); `label` names a node (a field or a
// function of the datum; a node with no row of its own shows the last segment of its path).
import * as d3 from 'd3';
import { defineMark, text } from './core.jsx';
import { stratifyRows, lastSegment } from './layouts.jsx';
import { fitsBox } from './typeset.jsx';

const LABEL_SIZE = 10;

// The rows as a d3 hierarchy (layouts.jsx), the props read through `ctx.field`.
const stratify = (rows, { field, props }, piece) => {
  const given = name => props[name] != null ? r => field(r, name) : undefined;
  return stratifyRows(rows, { path: given('path'), id: given('id'), parent: given('parent'), value: given('value'), piece });
};

// Below the trunk (where the tree first branches), each branch gets its own colour; a node is
// coloured by its branch, unless its row has a `color` channel or the mark a `fill`.
function branchColours(root, ctx) {
  let trunk = root;
  while (trunk.children?.length === 1) trunk = trunk.children[0];
  const branches = trunk.children ?? [trunk];
  const colourOf = new Map(branches.map((b, i) => [b, ctx.theme.palette[i % ctx.theme.palette.length]]));
  return node => {
    if (node.data && (ctx.props.fill != null || node.data.color != null)) return ctx.resolve(node.data, 'fill');
    const branch = node.ancestors().find(a => colourOf.has(a));
    return branch ? colourOf.get(branch) : ctx.theme.line;
  };
}

const labelOf = (node, ctx) => String(node.data && ctx.props.label != null ? ctx.field(node.data, 'label') : lastSegment(node.id));
const fits = (label, width, height, ctx) => fitsBox([label], width, height, ctx.measure, LABEL_SIZE);   // the rule of `Text fit`
const labelStyle = ctx => ({ fontSize: LABEL_SIZE, fontFamily: ctx.theme.font, fill: ctx.theme.ink, textAnchor: 'start', front: true });

// Rects tiling the area, one per leaf. `tile`: squarify (default), binary, slice, dice, slice-dice.
export const Treemap = defineMark('treemap', {
  render(rows, ctx) {
    const { area, props } = ctx, root = stratify(rows, ctx, 'Treemap'), colour = branchColours(root, ctx);
    const tile = d3['treemap' + (props.tile ?? 'squarify').replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase())];
    d3.treemap().tile(tile).size([area.width, area.height]).paddingInner(props.padding ?? 1).round(false)(root);
    const order = new Map(rows.map((r, i) => [r, i]));   // shapes in row order, not size order
    return d3.sort(root.leaves(), n => order.get(n.data)).flatMap(n => {
      const [x, y, width, height] = [area.left + n.x0, area.top + n.y0, n.x1 - n.x0, n.y1 - n.y0];
      const shapes = [{ t: 'rect', x, y, width, height, fill: colour(n), fillOpacity: props.fillOpacity, stroke: props.stroke }];
      const label = props.label != null || props.path != null ? labelOf(n, ctx) : '';
      if (props.label != null && fits(label, width, height, ctx)) shapes.push(text(x + 3, y + 3, label, { ...labelStyle(ctx), dy: '0.9em' }));
      return shapes;
    });
  },
});

// Node-link diagram, root on the left. `layout`: tree (default) or cluster (leaves aligned).
export const Tree = defineMark('tree', {
  render(rows, ctx) {
    const { area, props } = ctx, root = stratify(rows, ctx, 'Tree');
    // Leave room on the right for the widest label.
    const room = d3.max(root.descendants(), n => ctx.measure(labelOf(n, ctx), LABEL_SIZE)) + 6;
    const layout = props.layout === 'cluster' ? d3.cluster() : d3.tree();
    layout.size([area.height, Math.max(1, area.width - room)])(root);
    const place = n => [area.left + n.y, area.top + n.x];
    const link = d3.linkHorizontal().x(p => p[0]).y(p => p[1]);
    const stroke = props.stroke ?? ctx.theme.line;
    return [
      ...root.links().map(l => ({ t: 'path', d: link({ source: place(l.source), target: place(l.target) }), fill: 'none', stroke, strokeWidth: 1 })),
      ...root.descendants().flatMap(n => {
        const [cx, cy] = place(n);
        return [{ t: 'circle', cx, cy, r: props.r ?? 2.5, fill: n.children ? ctx.theme.muted : ctx.theme.palette[0] },
          text(cx + 5, cy, labelOf(n, ctx), { ...labelStyle(ctx), fill: ctx.theme.muted, dy: '0.32em' })];
      }),
    ];
  },
});

// Nested circles: leaves sized by value, parents drawn as outlines.
export const Pack = defineMark('pack', {
  render(rows, ctx) {
    const { area, props } = ctx, root = stratify(rows, ctx, 'Pack'), colour = branchColours(root, ctx);
    d3.pack().size([area.width, area.height]).padding(props.padding ?? 2)(root);
    return root.descendants().map(n => n.children
      ? { t: 'circle', cx: area.left + n.x, cy: area.top + n.y, r: n.r, fill: 'none', stroke: ctx.theme.line }
      : { t: 'circle', cx: area.left + n.x, cy: area.top + n.y, r: n.r, fill: colour(n), fillOpacity: props.fillOpacity });
  },
});

// An icicle: depth from left to right, each node as tall as its share of its parent.
export const Partition = defineMark('partition', {
  render(rows, ctx) {
    const { area, props } = ctx, root = stratify(rows, ctx, 'Partition'), colour = branchColours(root, ctx);
    d3.partition().size([area.height, area.width]).padding(props.padding ?? 1)(root);
    return root.descendants().flatMap(n => {
      const [x, y, width, height] = [area.left + n.y0, area.top + n.x0, n.y1 - n.y0, n.x1 - n.x0];
      const shapes = [{ t: 'rect', x, y, width, height, fill: n.depth ? colour(n) : ctx.theme.line, fillOpacity: props.fillOpacity }];
      const label = labelOf(n, ctx);
      if (props.label != null && fits(label, width, height, ctx)) shapes.push(text(x + 3, y + 3, label, { ...labelStyle(ctx), dy: '0.9em' }));
      return shapes;
    });
  },
});
