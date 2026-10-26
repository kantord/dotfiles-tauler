// Plot inside tauler's JSX, drawn the way the Draw runtime draws it (test/tauler.js).
import { test, expect, beforeEach } from 'vitest';
import { drawFigure, figureKeys, resetFigures } from '../../test/tauler.js';
import { Plot } from '../Plot.jsx';
import { Axis } from '../core.jsx';
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
