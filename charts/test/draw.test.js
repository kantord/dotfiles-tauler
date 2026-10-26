// drawScene against a stub selection: it must write exactly the shape table (SPEC 5.5).
import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { drawScene } from '../core.jsx';

function stub(name = 'svg') {
  const el = { name, attrs: {}, children: [], content: undefined };
  el.append = n => { const c = stub(n); el.children.push(c); return c; };
  el.attr = (k, v) => { el.attrs[k] = v; return el; };
  el.text = v => { el.content = v; return el; };
  return el;
}

const scene = {
  width: 100, height: 50, clip: { x: 0, y: 0, w: 100, h: 50 },
  back: [{ t: 'line', x1: 0, y1: 1, x2: 2, y2: 3, stroke: '#000', crisp: true }],
  marks: [
    { t: 'rect', x: 1, y: 2, width: -3, height: 4, rx: 1, fill: '#f00', strokeDasharray: '2 2', foo: 'x' },
    { t: 'path', d: 'M0,0', transform: 'translate(1,1)', fillOpacity: 0.5, opacity: 0.9 },
  ],
  front: [{ t: 'text', x: 5, y: 6, dy: '0.3em', text: 'hi', textAnchor: 'end', fontSize: 11, fontFamily: 'mono', fill: '#111' }],
};

test('drawScene writes the table, kebab-cased, and nothing else', () => {
  const svg = stub();
  drawScene(svg, scene, 'c1');
  const [defs, back, marks, front] = svg.children;
  assert.equal(defs.children[0].attrs.id, 'c1');
  assert.deepEqual(back.children[0].attrs, { x1: 0, y1: 1, x2: 2, y2: 3, stroke: '#000', 'shape-rendering': 'crispEdges' });
  assert.equal(marks.attrs['clip-path'], 'url(#c1)');
  assert.deepEqual(marks.children[0].attrs, { x: 1, y: 2, width: 0, height: 4, rx: 1, fill: '#f00', 'stroke-dasharray': '2 2' });
  assert.deepEqual(marks.children[1].attrs, { d: 'M0,0', transform: 'translate(1,1)', 'fill-opacity': 0.5, opacity: 0.9 });
  const label = front.children[0];
  assert.equal(front.attrs['clip-path'], undefined);
  assert.equal(label.content, 'hi');
  assert.deepEqual(label.attrs, { x: 5, y: 6, dy: '0.3em', 'text-anchor': 'end', 'font-size': 11, 'font-family': 'mono', fill: '#111' });
});
