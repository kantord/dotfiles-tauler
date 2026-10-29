// Hierarchy layouts as statistics (SPEC 6): flat rows in, node rows out, in the unit square
// (`size` [w, h] changes the units) with y already inverted, so any mark draws them:
//   <Scale channel="x" domain={[0, 1]}/><Scale channel="y" domain={[0, 1]}/>
//   <Rect x1="x0" x2="x1" y1="y0" y2="y1" color="branch"/>
// The hierarchy comes from `path` ("a/b/c", missing parents filled in) or `id` and `parent` (`parent`
// is null for the root); `value` sizes the leaves (else leaves count). Fields are names or functions
// of the datum. `name` is the field (or function of the row) that labels a node; without it, or for a
// node that has no row of its own (a path's missing ancestor), the name is the last segment of the id.
//
// A node row is the input row's own fields, then these (the layout wins a clash, silently):
//   `id parentId depth value name branch leaf datum` plus its geometry.
//   id        the row's `id` field, or for `path` the path with a leading "/" ("init/sshd" -> "/init/sshd")
//   parentId  the parent's id, null for the root;  depth  0 for the root;  leaf  true without children
//   value     the sum of `value` over the leaves below (a leaf's own), or the leaf count without `value`
//   name      the `name` option, else the row's own `name`, else the id's last segment;  datum  the input row, null for a node made up from a path
//   branch    the id of the ancestor just below the trunk (where the tree first branches), null above it
// Geometry, by layout (y is already inverted, so it points up):
//   treemap, partition   x0 y0 x1 y1  (the rectangle)
//   pack                 x y r        (centre and radius, r in x units)
//   tree                 returns { nodes, links }
//     nodes  the node row with x y (depth along x, the root at x = 0; siblings spread along y)
//     links  one per parent-child pair: { sourceId, targetId, branch, x1, y1, x2, y2 }, (x1, y1) the parent
import * as d3 from 'd3';
import { read } from './fields.jsx';

export const lastSegment = id => String(id ?? '').split('/').filter(Boolean).at(-1) ?? '';

// The rows as a d3 hierarchy, summed by `value` and sorted, biggest first, for stable layouts.
export function stratifyRows(data, { path, id, parent, value, piece = 'tree' }) {
  if (path != null && (id != null || parent != null)) throw new Error(`${piece} path: id and parent also given; give one`);
  if (path == null && id == null) throw new Error('hierarchy: give `path`, or `id` and `parent`');
  const root = (path != null ? d3.stratify().path(read(path)) : d3.stratify().id(read(id)).parentId(read(parent)))(data);
  if (value != null) root.sum(d => (d ? +read(value)(d) || 0 : 0));
  else root.count();
  return root.sort((a, b) => b.value - a.value || d3.ascending(a.id, b.id));
}

function nodeRows(root, geometry, name) {
  const label = name == null ? null : read(name);
  let trunk = root;
  while (trunk.children?.length === 1) trunk = trunk.children[0];
  const branches = new Set(trunk.children ?? [trunk]);
  return root.descendants().map(n => ({
    ...n.data, id: n.id, parentId: n.parent?.id ?? null, depth: n.depth, value: n.value,
    name: n.data && label ? label(n.data) : n.data?.name ?? lastSegment(n.id),
    branch: n.ancestors().find(a => branches.has(a))?.id ?? null, leaf: !n.children, datum: n.data ?? null, ...geometry(n),
  }));
}

const options = o => ({ size: o.size ?? [1, 1], padding: o.padding ?? 0 });
const flip = (h, y) => h - y;

// Rects tiling `size`: `x0 y0 x1 y1`. `tile`: squarify (default), binary, slice, dice, slice-dice.
export function treemap(data, opts) {
  const { size: [w, h], padding } = options(opts), tile = d3['treemap' + (opts.tile ?? 'squarify').replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase())];
  if (!tile) throw new Error(`treemap: no tile named '${opts.tile}'`);
  const root = stratifyRows(data, { ...opts, piece: 'treemap' });
  d3.treemap().tile(tile).size([w, h]).paddingInner(padding).round(false)(root);
  return nodeRows(root, n => ({ x0: n.x0, x1: n.x1, y0: flip(h, n.y1), y1: flip(h, n.y0) }), opts.name);
}

// An icicle: depth along x. `x0 y0 x1 y1`. Under `coord={polar()}` with the channels swapped
// (`<Rect x1="y0" x2="y1" y1="x0" y2="x1"/>`) the same rows are a sunburst (SPEC 5.13).
export function partition(data, opts) {
  const { size: [w, h], padding } = options(opts), root = stratifyRows(data, { ...opts, piece: 'partition' });
  d3.partition().size([h, w]).padding(padding)(root);
  return nodeRows(root, n => ({ x0: n.y0, x1: n.y1, y0: flip(h, n.x1), y1: flip(h, n.x0) }), opts.name);
}

// Nested circles: `x y r`, `r` in x units (draw with `<Dot rx="r"/>`).
export function pack(data, opts) {
  const { size: [w, h], padding } = options({ padding: 2, ...opts }), root = stratifyRows(data, { ...opts, piece: 'pack' });
  d3.pack().size([w, h]).padding(padding)(root);
  return nodeRows(root, n => ({ x: n.x, y: flip(h, n.y), r: n.r }), opts.name);
}

// Node-link, root on the left: `{ nodes, links }`. Nodes have `x y`; links `sourceId targetId
// x1 y1 x2 y2` (draw with `<Link curve="link-horizontal"/>`). `layout`: tree (default) or cluster.
export function tree(data, opts) {
  const { size: [w, h] } = options(opts), root = stratifyRows(data, opts);
  (opts.layout === 'cluster' ? d3.cluster() : d3.tree()).size([h, w])(root);
  const nodes = nodeRows(root, n => ({ x: n.y, y: flip(h, n.x) }), opts.name);
  const at = new Map(nodes.map(n => [n.id, n]));
  const links = root.links().map(({ source, target }) => ({ sourceId: source.id, targetId: target.id, branch: at.get(target.id).branch,
    x1: at.get(source.id).x, y1: at.get(source.id).y, x2: at.get(target.id).x, y2: at.get(target.id).y }));
  return { nodes, links };
}
