import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { chartTheme } from '../theme.jsx';

const colours = { foreground: '#eeeeee', 'muted-foreground': '#999999', border: '#333333', 'chart-1': '#ff0000', 'ansi-blue': '#0000ff' };
const themeColor = (name, alpha) => (colours[name] ? (alpha == null ? colours[name] : `${colours[name]}/${alpha}`) : name);

test('chartTheme maps tokens; chart-* first, then ansi fallbacks', () => {
  const t = chartTheme(themeColor, 'JetBrains Mono');
  assert.equal(t.ink, '#eeeeee');
  assert.equal(t.lineSoft, '#333333/0.5');
  assert.deepEqual(t.palette, ['#ff0000', '#0000ff']);
  assert.equal(t.font, 'JetBrains Mono');
});

test('a missing required token throws instead of drawing black', () => {
  const partial = name => (name === 'border' ? name : themeColor(name));
  assert.throws(() => chartTheme(partial), /'border'/);
});
