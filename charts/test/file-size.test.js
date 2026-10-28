// Script test: no source file in charts/ may exceed 300 lines (split by concern, SPEC 4).
import { test, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LIMIT = 300;
const dir = fileURLToPath(new URL('../', import.meta.url));
const sources = readdirSync(dir).filter(f => /\.jsx?$/.test(f));
const lines = f => readFileSync(dir + f, 'utf8').split('\n').length - 1;

test(`no source file in charts/ exceeds ${LIMIT} lines`, () => {
  expect(sources).toContain('core.jsx');
  expect(sources.filter(f => lines(f) > LIMIT).map(f => `${f}: ${lines(f)}`)).toEqual([]);
});
