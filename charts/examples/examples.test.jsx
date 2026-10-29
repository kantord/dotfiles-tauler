// Renders every example in charts/examples/<section>/<nn-name>.jsx the way a tauler layout would, in a
// light and in a dark palette, and keeps what it draws in __html__/ (`pnpm examples` builds the gallery
// from them). An example is the code a user writes: it imports from "@gh/kantord/dotfiles-tauler"
// (aliased to charts/index.jsx in vitest.config.js) and reads the globals tauler gives a layout, `ctx`
// and `themeColor`, which are defined here with fixed values. The whole component tree is drawn: its
// elements as HTML (tailwind classes the gallery cannot style make the test fail) with each figure (a Plot
// is a <D3Figure>) as its inline <svg>.
import { test, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { figureKeys, resetFigures } from '../../test/tauler.js';
import { PALETTES, themeColorFor } from './palettes.js';
import { renderTree } from './render.js';
import * as publicApi from './../index.jsx';

const examples = Object.entries(import.meta.glob('./*/*.jsx', { eager: true })).sort(([a], [b]) => a.localeCompare(b));
const sources = import.meta.glob('./*/*.jsx', { eager: true, query: '?raw', import: 'default' });
const slug = path => path.replace(/^\.\//, '').replace(/\.jsx$/, '').replace('/', '--');

beforeEach(resetFigures);

test('there is a gallery to look at: sections in order, a few dozen examples', () => {
  expect(examples.length).toBeGreaterThanOrEqual(40);
  const sections = new Set(examples.map(([p]) => p.split('/')[1]));
  expect(sections.size).toBeGreaterThanOrEqual(12);
});

test('charts/index.jsx lists the same names as the package index', () => {
  const names = file => [...readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(/export \{([^}]+)\} from '\.\/(?:charts\/)?(?:[A-Za-z]+)\.jsx'/g)]
    .flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop())).filter(Boolean);
  const chartNames = names('../index.jsx');
  const rootChartLines = readFileSync(new URL('../../index.jsx', import.meta.url), 'utf8').split('\n').filter(l => l.includes("'./charts/"));
  const rootNames = rootChartLines.flatMap(l => [...l.matchAll(/\{([^}]+)\}/g)].flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop())));
  expect([...chartNames].sort()).toEqual([...rootNames].sort());
  expect(Object.keys(publicApi).sort()).toEqual([...chartNames].sort());
});

for (const [path, mod] of examples) {
  const source = sources[path];
  const name = slug(path);

  test(`${path}: header, public imports only, no clock or randomness`, () => {
    const lines = source.split('\n');
    expect(lines[0]).toMatch(/^\/\/ title: \S/);
    expect(lines[1]).toMatch(/^\/\/ section: \S/);
    const header = lines.slice(0, lines.findIndex(l => !l.startsWith('//')));
    expect(header.slice(2).join(' ')).toMatch(/[A-Za-z]{3,}.*\./);   // what to notice: plain sentences
    const imports = [...source.matchAll(/import \{([^}]+)\} from "([^"]+)";/g)];
    expect(imports.length).toBeGreaterThan(0);
    for (const [, list, from] of imports) {
      expect(from).toBe('@gh/kantord/dotfiles-tauler');
      for (const n of list.split(',').map(s => s.trim()).filter(Boolean)) expect(Object.keys(publicApi)).toContain(n);
    }
    expect(source).not.toMatch(/import .* from ['"](?!@gh\/kantord\/dotfiles-tauler)/);
    expect(source).not.toMatch(/Math\.random|Date\.now|new Date\(\)/);
    expect(typeof mod.default).toBe('function');
  });

  // Explicit over implicit: a number given as a Scale domain endpoint, a size or an offset is either a named constant or explained by a
  // `//` comment on its line or the line above. A Plot's own width and height are the column it sits in, and 0 is a baseline.
  test(`${path}: numbers that size or place things are named or commented`, () => {
    const lines = source.split('\n'), bare = [];
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|import )/.test(line) || /^\s*<Plot[ >]/.test(line) || /\/\/ |\/\*/.test(line) || /^\s*(\/\/|\{\/\*)/.test(lines[i - 1] ?? '')) return;
      for (const m of line.matchAll(/\b(domain|size|width|height|rangePad|dx|dy|binWidth)(?:=\{|: ?)(\[[^\]]*\]|-?\d[\d.]*)/g)) {
        const literals = m[2].match(/-?\b\d[\d.]*/g)?.filter(n => +n !== 0) ?? [];
        if (literals.length) bare.push(`line ${i + 1}: ${m[0]}`);
      }
    });
    expect(bare).toEqual([]);
  });

  for (const scheme of ['light', 'dark']) {
    test(`${path}: draws in the ${scheme} palette`, async () => {
      globalThis.ctx = { theme: { colors: PALETTES[scheme] } };
      globalThis.themeColor = themeColorFor(PALETTES[scheme]);
      const tree = mod.default();
      expect(figureKeys().length).toBeGreaterThan(0);
      const html = renderTree(tree, path);   // throws on a tailwind class the gallery cannot draw
      expect(html).not.toMatch(/NaN|undefined/);
      const svgs = html.match(/<svg [\s\S]*?<\/svg>/g) ?? [];
      expect(svgs.length).toBe(figureKeys().length);   // every figure is in the picture
      for (const svg of svgs) expect(svg.match(/<(path|rect|circle|line|text|polygon|image)[ >]/g)?.length ?? 0).toBeGreaterThan(1);   // more than the clip's own rect
      await expect(html + '\n').toMatchFileSnapshot(`./__html__/${name}.${scheme}.html`);
    });
  }
}

test('every fragment in __html__ belongs to an example', () => {
  const known = new Set(examples.map(([p]) => slug(p)));
  const stray = readdirSync(new URL('./__html__/', import.meta.url)).filter(f => !known.has(f.replace(/\.(light|dark)\.html$/, '')));
  expect(stray).toEqual([]);
});
