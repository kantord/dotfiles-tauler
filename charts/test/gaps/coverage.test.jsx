// Docs test: every gap row in charts/GAP-EXAMPLES.md (g01, g02, ...) has at least one test in
// this folder whose name starts with its id.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const brief = readFileSync(join(here, '../../GAP-EXAMPLES.md'), 'utf8');
const ids = [...new Set(brief.match(/\bg\d\d\b/g))].sort();

// Titles of `test(...)` and `test.fails(...)` calls; `test.skip` and `test.todo` do not count as coverage.
const titles = readdirSync(here).filter(f => /\.test\.jsx?$/.test(f) && f !== 'coverage.test.jsx')
  .flatMap(f => [...readFileSync(join(here, f), 'utf8').matchAll(/^\s*test(?:\.fails)?\(\s*(['"`])(.*?)\1/gm)].map(m => m[2]));

test('the brief lists g01 to g49 without gaps in the numbering', () => {
  expect(ids).toEqual(Array.from({ length: ids.length }, (_, i) => 'g' + String(i + 1).padStart(2, '0')));
  expect(ids.length).toBeGreaterThanOrEqual(49);
});

test('every gap id in the brief has a test whose name starts with it', () => {
  const missing = ids.filter(id => !titles.some(t => t.startsWith(id + ' ')));
  expect(missing).toEqual([]);
});

test('every test name here starts with an id that exists in the brief', () => {
  const stray = titles.filter(t => !ids.some(id => t.startsWith(id + ' ')));
  expect(stray).toEqual([]);
});
