// What a layout file gets from tauler, for tests: the JSX factory, `D3Figure`, and a Draw step
// that runs a figure's `draw` the way tauler's Draw runtime does (d3 + linkedom, the same
// `<svg>` setup). Modelled on tauler's tauler-web/js/runtime.js (`estoH`),
// tauler-core/src/globals.rs (`__tauler_flatten_node`, `D3Figure`) and src/jsx.rs
// (`__tauler_draw_figure`); keep it in step with them.
import * as d3 from 'd3';
import { parseHTML } from 'linkedom';

const FRAGMENT = Symbol('fragment');
const figures = new Map();

function flattenChildren(values, out) {
  for (const v of values) {
    if (v === null || v === undefined || v === false) continue;
    if (Array.isArray(v)) flattenChildren(v, out); else out.push(v);
  }
}

// A component is called at once; anything with both `type` and `props` is reshaped flat.
function flattenNode(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  if (!('type' in v) || !('props' in v)) return v;
  const out = { type: v.type, ...v.props };
  out.children = 'children' in v ? v.children : [];
  return out;
}

function h(type, props, ...children) {
  const kids = [];
  flattenChildren(children, kids);
  if (typeof type === 'function') return flattenNode(type({ ...(props ?? {}), children: kids }));
  if (type && typeof type === 'object' && FRAGMENT in type) return kids;
  const rest = { ...(props ?? {}) };
  delete rest.children;
  return flattenNode({ type, props: rest, children: kids });
}

function D3Figure({ key, width, height, draw }) {
  if (key === undefined || key === null || key === '') throw new Error('<D3Figure> needs a key');
  const isSize = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
  if (!isSize(width) || !isSize(height)) throw new Error('<D3Figure> needs a numeric width and height');
  figures.set(String(key), { width, height, draw });
  return { type: 'img', src: 'tauler:picture/' + key, style: { width, height } };
}

Object.assign(globalThis, { h, Fragment: { [FRAGMENT]: true }, D3Figure });

// The keys of the figures rendered since the last reset, in order.
export const figureKeys = () => [...figures.keys()];
export const resetFigures = () => figures.clear();

// Runs figure `key`'s draw against a fresh linkedom <svg>; returns the markup tauler would rasterize.
export function drawFigure(key) {
  const figure = figures.get(String(key));
  if (!figure) throw new Error(`no figure with key ${key}; have ${figureKeys().join(', ')}`);
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>');
  const svg = d3.select(document.body).append('svg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('width', figure.width).attr('height', figure.height)
    .attr('viewBox', `0 0 ${figure.width} ${figure.height}`)
    .attr('font-family', 'sans-serif');
  figure.draw(svg, d3);
  return svg.node().outerHTML;
}
