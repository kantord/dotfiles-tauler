// Scene vocabulary beyond paints (GAPS 1.5, done): filters, markers, images, groups, clipped
// regions, masks and blend. One named test per feature; tags are read as attribute maps (the DOM
// does not keep attribute order). The capability list these cite is SPEC 5.5.
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../test/tauler.js';
import { Plot } from '../Plot.jsx';
import { compile, blur, dropShadow, arrowhead, marker, mask, clipRect, clipPath, linearGradient } from '../core.jsx';
import { Line, Link, Rect, Dot, Group, Image } from '../marks.jsx';

beforeEach(resetFigures);

const W = 240, H = 120;
const series = d3.range(8).map(i => ({ t: i, v: 4 + 3 * Math.sin(i / 1.5) }));
const tags = (svg, tag) => [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))]
  .map(m => Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(a => [a[1], a[2]])));
const svgOf = child => { <Plot width={W} height={H} data={series} x="t" y="v">{child}</Plot>; return drawFigure(figureKeys()[0]); };
const sceneOf = child => compile({ width: W, height: H, data: series, x: 't', y: 'v', children: [child] });

test('capability filter: blur is a defs entry the shape points at', () => {
  const svg = svgOf(<Dot filter={blur({ std: 3 })} />);
  const [f] = tags(svg, 'filter');
  expect(tags(svg, 'feGaussianBlur')[0].stdDeviation).toBe('3');
  expect(tags(svg, 'circle').some(c => c.filter === `url(#${f.id})`)).toBe(true);
});

test('capability filter: blur and drop shadow have a region wider than the shape box', () => {
  for (const effect of [blur({ std: 3 }), dropShadow()]) {
    const [f] = tags(svgOf(<Dot filter={effect} />), 'filter');
    expect(f).toMatchObject({ x: '-20%', y: '-20%', width: '140%', height: '140%' });
  }
});

test('capability filter: drop shadow carries offset, blur and colour', () => {
  const svg = svgOf(<Rect y1={2} y2={6} x="t" width={10} filter={dropShadow({ dx: 2, dy: 3, std: 1.5, color: '#112233', opacity: 0.5 })} />);
  const [f] = tags(svg, 'filter');
  expect(tags(svg, 'feDropShadow')[0]).toMatchObject({ dx: '2', dy: '3', stdDeviation: '1.5', 'flood-color': '#112233', 'flood-opacity': '0.5' });
  expect(tags(svg, 'rect').some(r => r.filter === `url(#${f.id})`)).toBe(true);
});

test('capability marker: an arrowhead on a Line end and a Link start is one marker the path points at', () => {
  const head = arrowhead({ color: '#c33', size: 8 });
  const svg = svgOf([<Line markerEnd={head} />, <Link x1="t" y1="v" x2="t" y2="v" markerStart={head} />]);
  const [m] = tags(svg, 'marker');
  expect(svg.match(/<marker\b/g)).toHaveLength(1);
  expect(m).toMatchObject({ orient: 'auto', markerUnits: 'userSpaceOnUse', markerWidth: '8', markerHeight: '8' });
  expect(tags(svg, 'path').some(p => p['marker-end'] === `url(#${m.id})`)).toBe(true);
  expect(tags(svg, 'line').some(l => l['marker-start'] === `url(#${m.id})`)).toBe(true);
  expect(tags(svg, 'path').some(p => p.d && p.fill === '#c33')).toBe(true);   // the head's own shape
});

test('capability marker: marker() takes any scene shapes', () => {
  const dot = marker({ shapes: [{ t: 'circle', cx: 5, cy: 5, r: 4, fill: 'red' }], viewBox: '0 0 10 10', refX: 5, refY: 5 });
  const svg = svgOf(<Line markerStart={dot} markerEnd={dot} />);
  expect(tags(svg, 'marker')[0]).toMatchObject({ refX: '5', refY: '5', viewBox: '0 0 10 10' });
  expect(tags(svg, 'circle').some(c => c.r === '4' && c.fill === 'red')).toBe(true);
});

test('capability image: an Image mark draws an image shape at a data point from an href', () => {
  const href = 'data:image/png;base64,AAAA';
  const svg = svgOf(<Image href={href} width={16} height={12} />);
  const images = tags(svg, 'image');
  expect(images).toHaveLength(series.length);
  expect(images[0]).toMatchObject({ href, width: '16', height: '12' });
  const scene = sceneOf(<Image href={href} width={16} height={12} />).scene;
  expect(scene.marks[0].t).toBe('image');
});

test('capability image: href may be a field of the datum', () => {
  const data = [{ t: 1, v: 2, src: 'data:image/png;base64,AA' }, { t: 2, v: 3, src: 'data:image/png;base64,BB' }];
  <Plot width={W} height={H} data={data} x="t" y="v"><Image href="src" width={8} height={8} /></Plot>;
  expect(tags(drawFigure(figureKeys()[0]), 'image').map(i => i.href)).toEqual(data.map(d => d.src));
});

test('capability group: a g shape holds children under one transform', () => {
  const svg = svgOf(<Group transform="translate(10,20) rotate(5)" shapes={[{ t: 'rect', x: 0, y: 0, width: 5, height: 6, fill: 'red' }, { t: 'line', x1: 0, y1: 0, x2: 4, y2: 4, stroke: 'blue' }]} />);
  const [g] = tags(svg, 'g').filter(t => t.transform);
  expect(g.transform).toBe('translate(10,20) rotate(5)');
  const inner = svg.slice(svg.indexOf('translate(10,20)'));
  expect(inner).toMatch(/<rect[^>]*fill="red"/);
  expect(inner).toMatch(/<line[^>]*stroke="blue"/);
});

test('capability group: shapes may be a function of the mark context (pixel area)', () => {
  const { scene } = sceneOf(<Group shapes={ctx => [{ t: 'rect', x: ctx.area.left, y: ctx.area.top, width: ctx.area.width, height: 4, fill: 'red' }]} />);
  expect(scene.marks[0].children[0].width).toBeGreaterThan(100);
});

test('capability clip: a group clipped to a rect writes a clipPath with that rect', () => {
  const svg = svgOf(<Group clip={clipRect({ x: 10, y: 20, width: 30, height: 40 })} shapes={[{ t: 'circle', cx: 20, cy: 30, r: 50, fill: 'red' }]} />);
  const cp = tags(svg, 'clipPath').find(c => c.id && !c.id.endsWith('-clip') && tags(svg, 'rect').some(r => r.width === '30'));
  expect(cp).toBeTruthy();
  expect(tags(svg, 'rect').find(r => r.width === '30')).toMatchObject({ x: '10', y: '20', height: '40' });
  expect(tags(svg, 'g').some(g => g['clip-path'] === `url(#${cp.id})`)).toBe(true);
});

test('capability clip: a clip path from path data, on a mark', () => {
  const svg = svgOf(<Line clip={clipPath('M0,0L50,0L25,40Z')} />);
  expect(tags(svg, 'path').some(p => p.d === 'M0,0L50,0L25,40Z')).toBe(true);
  expect(tags(svg, 'path').some(p => /^url\(#.+\)$/.test(p['clip-path'] ?? ''))).toBe(true);
});

test('capability mask: shapes in a mask fade the shape that points at it', () => {
  const fade = mask({ shapes: [{ t: 'rect', x: 0, y: 0, width: 200, height: 100, fill: linearGradient({ stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] }) }] });
  const svg = svgOf(<Rect y1={2} y2={6} x="t" width={20} mask={fade} />);
  const [m] = tags(svg, 'mask');
  expect(tags(svg, 'rect').some(r => r.mask === `url(#${m.id})`)).toBe(true);
  expect(tags(svg, 'linearGradient')).toHaveLength(1);   // the mask's own fill is defined too
  expect(tags(svg, 'rect').some(r => r.width === '200' && /^url\(#/.test(r.fill))).toBe(true);
});

test('capability blend: a blend style becomes mix-blend-mode', () => {
  const svg = svgOf(<Rect y1={2} y2={6} x="t" width={20} blend="multiply" />);
  expect(tags(svg, 'rect').some(r => r.style === 'mix-blend-mode:multiply')).toBe(true);
});

test('scene vocabulary: effects are plain objects in the scene, so they are part of the key; one def per distinct value', () => {
  expect(sceneOf(<Line markerEnd={arrowhead()} />).key).not.toBe(sceneOf(<Line markerEnd={arrowhead({ size: 12 })} />).key);
  expect(sceneOf(<Line markerEnd={arrowhead()} />).key).toBe(sceneOf(<Line markerEnd={arrowhead()} />).key);
  expect(sceneOf(<Line />).key).not.toBe(sceneOf(<Line blend="screen" />).key);
  const svg = svgOf([<Dot filter={blur()} />, <Dot filter={blur()} />, <Dot filter={blur({ std: 5 })} />]);
  expect(svg.match(/<filter\b/g)).toHaveLength(2);
});
