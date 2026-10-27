// Shared helpers for the gap example suite (charts/GAP-EXAMPLES.md). Not a test file.
//
// `need(...names)` looks a not-yet-existing piece of the library up by name and throws when it is
// not there, so a gap example written against the target call site fails for that reason only.
// Several names may be given when the final spelling is undecided (`ruleY`, `RuleY`).
import { expect } from 'vitest';
import * as d3 from 'd3';
import '../../../test/tauler.js';   // defines the JSX factory `h` and `D3Figure`
import * as core from '../../core.jsx';
import * as marks from '../../marks.jsx';
import * as stats from '../../stats.jsx';
import * as hierarchy from '../../hierarchy.jsx';
import * as geo from '../../geo.jsx';

const library = { ...core, ...marks, ...stats, ...hierarchy, ...geo };

export function need(...names) {
  for (const name of names) if (library[name] !== undefined) return library[name];
  throw new Error(`the library has no ${names.join(' / ')} yet`);
}

export const W = 320, H = 200;

// A mark that also records what it was given: `tap(<Bar/>).seen[0].rows`.
export function tap(mark) {
  const seen = [];
  return { ...mark, seen, render: (rows, ctx) => { seen.push({ rows, ctx }); return mark.render(rows, ctx); } };
}

export const near = (a, b, eps = 0.01) => expect(Math.abs(a - b)).toBeLessThan(eps);

// Every shape of a scene, whichever layer it is in.
export const allShapes = scene => [...scene.back, ...scene.marks, ...scene.front];

// The numbers of an SVG path, as [x, y] pairs (for paths made of M, L and Z only).
export function pathPoints(d) {
  const n = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g).map(Number);
  return d3.range(0, n.length - 1, 2).map(i => [n[i], n[i + 1]]);
}

// The class edges of a colour scale that classifies values.
export const edgesOf = scale => scale.thresholds?.() ?? scale.quantiles?.() ?? scale.domain();

// Angle of a pixel around `centre`, clockwise from straight up, in [0, 2 pi).
export const angleOf = ([x, y], [cx, cy]) => (Math.atan2(x - cx, -(y - cy)) + 2 * Math.PI) % (2 * Math.PI);
export const centreOf = area => [(area.left + area.right) / 2, (area.top + area.bottom) / 2];
export const distance = ([x, y], [cx, cy]) => Math.hypot(x - cx, y - cy);

// A seeded generator (no Math.random): the same numbers on every run.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
