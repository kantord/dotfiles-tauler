import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { hash53 } from '../core.jsx';

test('hash53 separates a known 32-bit FNV-1a collision', () => {
  assert.notEqual(hash53('costarring'), hash53('liquid'));
});

test('hash53 is stable across runs', () => {
  assert.equal(hash53('{"width":248}'), hash53('{"width":248}'));
  assert.equal(hash53(''), 'wvjl67o803');   // cyrb53('') = 3338908027751811, base 36
});
