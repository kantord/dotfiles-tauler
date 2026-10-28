// Map marks, on a made-up archipelago (no real map data in the repo).
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../test/tauler.js';
import { Plot } from '../Plot.jsx';
import { compile, geo } from '../core.jsx';
import { Geo, GeoDot } from '../geo.jsx';
import { Line, Dot } from '../marks.jsx';
import { BUDGET, costOf } from './bench.js';

beforeEach(resetFigures);

// Rings as d3-geo wants them: clockwise, seen from above.
const island = (name, [lon, lat], size, rain) => ({ type: 'Feature', properties: { name, rain },
  geometry: { type: 'Polygon', coordinates: [[[lon, lat], [lon + size, lat], [lon + size, lat - size], [lon, lat - size], [lon, lat]]] } });
const islands = [island('Ash', [10, 48], 3, 20), island('Birch', [15, 46], 2, 70), island('Cedar', [12, 42], 1.5, 45)];
const towns = [{ town: 'Port', lon: 11, lat: 47 }, { town: 'Hill', lon: 16, lat: 45 }];
const reversed = f => ({ ...f, geometry: { ...f.geometry, coordinates: f.geometry.coordinates.map(r => r.slice().reverse()) } });

// The corners of a path's bounding box: [[x0, y0], [x1, y1]].
function bounds(d) {
  const n = d.match(/-?[\d.]+/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}
const plot = (children, props = {}) => compile({ width: 240, height: 140, projection: 'mercator', fit: { type: 'FeatureCollection', features: islands }, children, ...props }).scene;

test('the projection is fitted to the plot area', () => {
  const [sphere] = compile({ width: 240, height: 140, projection: 'equal-earth', children: [Geo({ data: [{ type: 'Sphere' }], fill: 'none', stroke: '#000' })] }).scene.marks;
  const [[x0, y0], [x1, y1]] = bounds(sphere.d);
  expect(x0).toBeGreaterThanOrEqual(8 - 0.01); expect(x1).toBeLessThanOrEqual(232 + 0.01);
  expect(y0).toBeGreaterThanOrEqual(8 - 0.01); expect(y1).toBeLessThanOrEqual(132 + 0.01);
  expect(Math.max(x1 - x0 - 224, y1 - y0 - 124)).toBeGreaterThan(-0.5);   // touches two sides
});

test('`fit` frames the given features', async () => {
  const shapes = plot([Geo({ data: islands })]).marks;
  expect(shapes).toHaveLength(3);
  const all = shapes.map(s => bounds(s.d));
  const width = Math.max(...all.map(b => b[1][0])) - Math.min(...all.map(b => b[0][0]));
  const height = Math.max(...all.map(b => b[1][1])) - Math.min(...all.map(b => b[0][1]));
  expect(Math.max(width - 224, height - 124)).toBeGreaterThan(-0.5);
  <Plot width={240} height={140} projection="mercator" fit={{ type: 'FeatureCollection', features: islands }} data={islands}>
    <Geo color={d => d.properties.rain} stroke="#fff" />
    <GeoDot data={towns} r={3} fill="#000" />
  </Plot>;
  await expect(drawFigure(figureKeys()[0])).toMatchFileSnapshot('./grammar/__svg__/geo-islands.svg');
});

test('counter-clockwise rings (RFC 7946, what most tools write) draw the same island, not the rest of the globe', () => {
  const [ours] = plot([Geo({ data: [islands[0]] })]).marks;
  const [theirs] = plot([Geo({ data: [reversed(islands[0])] })]).marks;
  expect(theirs.d).toBe(ours.d);
});

test('a colour channel makes a choropleth', () => {
  const fills = plot([Geo({ data: islands, color: d => d.properties.rain })]).marks.map(s => s.fill);
  expect(new Set(fills).size).toBe(3);
});

test('dots go where the projection puts them, and not when the globe hides them', () => {
  const projection = d3.geoOrthographic().rotate([-15, -45]);
  const dots = data => compile({ width: 200, height: 200, projection, children: [GeoDot({ data, r: 2 })] }).scene.marks;
  const [front] = dots([{ lon: 15, lat: 45 }]);
  const [, x, y] = front.d.match(/^M(-?[\d.]+),(-?[\d.]+)/).map(Number);   // a dot's path starts at its centre
  expect(x).toBeCloseTo(100, 0);
  expect(y).toBeCloseTo(100, 0);
  expect(dots([{ lon: -165, lat: -45 }])).toHaveLength(0);   // the far side
});

test('a map mark without a projection says what is missing', () => {
  expect(() => compile({ width: 100, height: 100, children: [Geo({ data: islands })] })).toThrow(/projection/);
});

test('generic marks under a coord hide what the globe hides, and a route costs under the budget (SPEC 10)', () => {
  const coord = geo(d3.geoOrthographic().rotate([-15, -45]));
  const dots = data => compile({ width: 200, height: 200, coord, data, children: [Dot({ r: 2 })] }).scene.marks;
  expect(dots([{ lon: 15, lat: 45 }])).toHaveLength(1);
  expect(dots([{ lon: -165, lat: -45 }])).toHaveLength(0);
  const route = Array.from({ length: 20 }, (_, i) => ({ lon: -170 + 17 * i, lat: 35 + 20 * Math.sin(i / 2) }));
  const props = { width: 248, height: 110, coord: geo('equal-earth'), data: route, children: [Line()] };
  expect(costOf(() => compile(props))).toBeLessThan(BUDGET);
});
