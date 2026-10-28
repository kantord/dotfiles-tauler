// A flow (Sankey) layout as a statistic, written here because d3-sankey is not available (SPEC
// "Excluded dependencies"). It follows the general design of that library (columns by longest path,
// justify/left/right alignment, value-weighted relaxation sweeps, overlap separation) and its option
// names, but the code is written from the requirement. `flow(links, opts)` takes one row per flow (`source`, `target`, `value`:
// names or functions of the datum) and returns `{ nodes, links }` in [0, width] x [0, height],
// y up like the other layouts. Draw nodes with `<Rect x1="x0" x2="x1" y1="y0" y2="y1"/>` and links
// with `<Area curve="link-horizontal" x1 x2 y1 y2 thickness1="thickness" thickness2="thickness"/>`.
//
// Nodes: `id depth value x0 x1 y0 y1`; `value` is the larger of its inflow and outflow, and the
// height is `value` times one scale `k` shared by every column, so sizes compare across the chart.
// Links: `sourceId targetId value thickness x1 y1 x2 y2 back` (x1 y1 on the source's right edge).
//
// Does: columns by longest path (`align`: 'justify' (default; sinks in the last column), 'left',
// 'right'); `iterations` relaxation sweeps (alternately left to right and back) pulling each node towards the value-weighted mean of
// its neighbours, then pushing apart so none overlap; links stacked inside a node in order of the
// other end. Cycles: a link that closes a cycle (found depth-first in input order, and a node
// linking to itself) is `back: true`; it does not affect columns or relaxation, is drawn from the
// source's right edge to the target's left edge (running leftwards), and counts in node values.
// Does not: place nodes in a column by anything but the sweeps (no crossing minimisation), size
// nodes by anything but throughput, or draw a back link as a loop around the nodes.
import * as d3 from 'd3';
import { read } from './fields.jsx';


// Links, in input order, that close a cycle (depth-first from nodes in first-seen order).
function backLinks(links) {
  const out = d3.group(links, l => l.source), state = new Map(), back = new Set();   // 1 open, 2 done
  const visit = id => {
    state.set(id, 1);
    for (const l of out.get(id) ?? []) {
      if (state.get(l.target) === 1) back.add(l);
      else if (!state.has(l.target)) visit(l.target);
    }
    state.set(id, 2);
  };
  for (const l of links) if (!state.has(l.source)) visit(l.source);
  return back;
}

// Pushes the nodes of one column apart, in order of `y0`, to at least `gap`, inside [0, height].
function separate(column, gap, height) {
  const sorted = d3.sort(column, n => n.top);
  let y = 0;
  for (const n of sorted) { n.top = Math.max(n.top, y); y = n.top + n.size + gap; }
  let limit = height;
  for (const n of [...sorted].reverse()) { n.top = Math.min(n.top, limit - n.size); limit = n.top - gap; }
}

export function flow(data, { source, target, value, width, height, nodeWidth = 8, nodePadding = 0.03 * height, align = 'justify', iterations = 6 }) {
  if (!(width > 0) || !(height > 0)) throw new Error('flow: width and height must be positive numbers');
  const links = data.map(d => ({ d, source: String(read(source)(d)), target: String(read(target)(d)), value: +read(value)(d) }));
  for (const l of links) if (!(l.value >= 0)) throw new Error(`flow: the value of ${l.source} -> ${l.target} must be a number of at least 0`);
  const back = backLinks(links), forward = links.filter(l => !back.has(l));
  const nodes = new Map(links.flatMap(l => [l.source, l.target]).map(id => [id, { id, in: 0, out: 0, depth: 0, height: 0, next: [], prev: [] }]));
  for (const l of links) { nodes.get(l.source).out += l.value; nodes.get(l.target).in += l.value; }
  // Longest path from a source (depth) and to a sink (height), over the forward links, which form a DAG.
  const sweep = (key, from, to) => {
    for (let again = true; again;) {
      again = false;
      for (const l of forward) {
        const [a, b] = [nodes.get(l[from]), nodes.get(l[to])];
        if (b[key] < a[key] + 1) { b[key] = a[key] + 1; again = true; }
      }
    }
  };
  sweep('depth', 'source', 'target'); sweep('height', 'target', 'source');
  for (const l of forward) { nodes.get(l.source).next.push(l); nodes.get(l.target).prev.push(l); }
  const all = [...nodes.values()], last = d3.max(all, n => n.depth) ?? 0;
  for (const n of all) {
    n.column = align === 'left' ? n.depth : align === 'right' ? last - n.height : n.height === 0 ? last : n.depth;
    n.value = Math.max(n.in, n.out);
  }
  const columns = d3.sort(d3.groups(all, n => n.column), ([column]) => column).map(([, nodes]) => nodes);   // left to right
  const gap = Math.min(nodePadding, (0.5 * height) / Math.max(1, d3.max(columns, c => c.length) - 1));
  const k = d3.min(columns, c => (height - gap * (c.length - 1)) / (d3.sum(c, n => n.value) || 1)) ?? 0;
  for (const column of columns) {
    let y = 0;
    for (const n of column) { n.size = n.value * k; n.top = y; y += n.size + gap; }
  }
  const middle = n => n.top + n.size / 2;
  for (let i = 0; i < iterations; i++) {
    const leftwards = i % 2 === 1, order = leftwards ? [...columns].reverse() : columns;
    for (const column of order) {
      for (const n of column) {
        const near = (leftwards ? n.next : n.prev).map(l => [nodes.get(leftwards ? l.target : l.source), l.value]);
        const weight = d3.sum(near, ([, v]) => v);
        if (weight > 0) n.top = d3.sum(near, ([m, v]) => middle(m) * v) / weight - n.size / 2;
      }
      separate(column, gap, height);
    }
  }
  // Each link's slot inside its two nodes: in order of the node at the other end.
  const slot = (key, other) => {
    for (const n of all) {
      let y = n.top;
      for (const l of d3.sort(links.filter(o => o[key] === n.id), o => middle(nodes.get(o[other])))) { l[key + 'Y'] = y + l.value * k / 2; y += l.value * k; }
    }
  };
  slot('source', 'target'); slot('target', 'source');
  const x0 = n => (last === 0 ? 0 : (n.column * (width - nodeWidth)) / last);
  const upwards = y => height - y;
  return {
    nodes: all.map(n => ({ id: n.id, depth: n.column, value: n.value, x0: x0(n), x1: x0(n) + nodeWidth, y0: upwards(n.top + n.size), y1: upwards(n.top) })),
    links: links.map(l => ({ sourceId: l.source, targetId: l.target, value: l.value, thickness: l.value * k, back: back.has(l),
      x1: x0(nodes.get(l.source)) + nodeWidth, y1: upwards(l.sourceY), x2: x0(nodes.get(l.target)), y2: upwards(l.targetY), datum: l.d })),
  };
}
