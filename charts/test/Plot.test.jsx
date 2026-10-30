// Plot inside tauler's JSX, drawn the way the Draw runtime draws it (test/tauler.js).
import { test, expect, beforeEach } from 'vitest';
import { drawFigure, figureKeys, resetFigures } from '../../test/tauler.js';
import { Plot } from '../Plot.jsx';
import { Axis, defineMark, stack } from '../core.jsx';
import { Line, Bar } from '../marks.jsx';
import { series } from './fixtures.js';

beforeEach(resetFigures);

const chart = props => (
  <Plot width={248} height={110} data={series} x="t" y="cpu" {...props}>
    <Line />
    <Axis channel="x" format="%H:%M" />
  </Plot>
);

test('marks survive tauler\'s JSX factory (the `$` guard) and draw as SVG', () => {
  const node = chart();
  expect(node.type).toBe('img');
  const svg = drawFigure(figureKeys()[0]);
  expect(svg).toMatch(/^<svg [^>]*width="248"/);   // linkedom writes attributes last-set first
  expect(svg).toMatch(/<path [^>]*d="M/);
  expect(svg).toContain('clip-path="url(#chart');
  expect(svg).toContain('>14:00</text>');
});

test('the scene hash is the key: same props, same key; new data, new key', () => {
  chart(); chart();
  expect(figureKeys()).toHaveLength(1);   // one Picture for both
  chart({ data: series.slice(1) });
  expect(figureKeys()).toHaveLength(2);
});

test('a given `key` reaches D3Figure as is, and the Draw step compiles from props', () => {
  const node = chart({ key: 'cpu/42' });
  expect(node.src).toBe('tauler:picture/cpu/42');
  expect(figureKeys()).toEqual(['cpu/42']);
  expect(drawFigure('cpu/42')).toMatch(/<path [^>]*d="M/);
});

test('a wrapper component returning marks composes', () => {
  const Bars = props => <Bar y="mem" {...props} />;
  <Plot width={100} height={50} data={series.slice(0, 3)} x="t"><Bars /></Plot>;
  expect(drawFigure(figureKeys()[0]).match(/<rect [^>]*fill=/g)).toHaveLength(3);   // not the clip's rect
});

test('a Plot of library marks is keyed by its spec, compiled only in Draw, and draws what the scene-hash path draws', () => {
  chart();
  const [name] = figureKeys();
  expect(name).toMatch(/^json:\["plot-1/);
  const bySpec = drawFigure(name);
  resetFigures();
  chart({ onlyForFallback: undefined, x: d => d.t });   // a closure: keyed by the scene hash
  expect(figureKeys()[0]).not.toMatch(/^json:/);
  expect(drawFigure(figureKeys()[0])).toBe(bySpec);
});

test('same spec, same key; different data or options, a different key', () => {
  chart(); chart();
  expect(figureKeys()).toHaveLength(1);
  chart({ data: series.slice(1) });
  chart({ width: 100 });
  expect(figureKeys()).toHaveLength(3);
});

test('a custom mark with a library mark\'s name is not keyed as the library mark', () => {
  const Custom = defineMark('line', { render: () => [] });
  <Plot width={50} height={50} data={series} x="t" y="cpu"><Custom /></Plot>;
  expect(figureKeys()[0]).not.toMatch(/^json:/);
});

test('stack, dodge, jitter and polar are keyed by their options; a function option is not', () => {
  const keyed = pos => { resetFigures(); <Plot width={80} height={80} data={series} x="t" y="cpu"><Bar position={pos} /></Plot>; return figureKeys()[0]; };
  expect(keyed(stack({ by: 'g' }))).toMatch(/^json:/);
  expect(keyed(stack({ by: 'g' }))).toBe(keyed(stack({ by: 'g' })));
  expect(keyed(stack({ by: 'g' }))).not.toBe(keyed(stack({ by: 'h' })));
  expect(keyed(stack({ by: r => r.cpu }))).not.toMatch(/^json:/);
});

test('Dates and infinities in the props are distinguished, not collapsed', () => {
  const keyOf = data => { resetFigures(); <Plot width={50} height={50} data={data} x="t" y="v"><Line /></Plot>; return figureKeys()[0]; };
  expect(keyOf([{ t: new Date(0), v: 1 }])).not.toBe(keyOf([{ t: new Date(1000), v: 1 }]));
  expect(keyOf([{ t: 0, v: Infinity }])).not.toBe(keyOf([{ t: 0, v: null }]));
});
