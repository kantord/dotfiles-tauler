// Docs test: the work list is closed. GAPS.md has no open item, SPEC.md points at no GAPS item,
// and no gap example is still a `test.fails` or skipped.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => readFileSync(fileURLToPath(new URL('../' + name, import.meta.url)), 'utf8');
const ID = '(?:\\d+\\.\\d+[a-z]?(?:-seam)?|[A-Z]\\.\\d+)';

test('the SPEC has no dangling reference to a GAPS item', () => {
  expect(read('SPEC.md').match(new RegExp(`GAPS ${ID}`, 'g')) ?? []).toEqual([]);
});

test('GAPS.md has no open item and keeps its non-goals and housekeeping', () => {
  const gaps = read('GAPS.md');
  expect(gaps.match(new RegExp(`^#{2,3} (?:Step |${ID})`, 'gm')) ?? []).toEqual([]);
  expect(gaps).toMatch(/^## Non-goals/m);
  expect(gaps).toMatch(/^## Housekeeping/m);
});

test('the docs test sees the pattern: an item heading would be found', () => {
  const heading = new RegExp(`^#{2,3} (?:Step |${ID})`, 'm');
  expect('### A.5 The gap example suite').toMatch(heading);
  expect('### 9.9 Invented').toMatch(heading);
  expect('## Housekeeping').not.toMatch(heading);
});

test('no gap example is still red-first or skipped', () => {
  const dir = new URL('./gaps/', import.meta.url);
  const open = readdirSync(dir).filter(f => /\.test\.jsx?$/.test(f) && f !== 'coverage.test.jsx')
    .filter(f => /\btest\.(fails|skip|todo)\(/.test(readFileSync(new URL(f, dir), 'utf8')));
  expect(open).toEqual([]);
});
