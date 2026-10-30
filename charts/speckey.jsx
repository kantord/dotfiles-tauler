// A Plot's key without compiling it: a canonical string of its props, or null when the props hold
// something that cannot be keyed (a closure, a custom mark, a projection). Plot passes the string
// to <D3Figure key> and compiles in the Draw runtime only; a null falls back to the scene hash.
//
// Keying is sound because tauler runs one program: the same spec string always means the same
// picture, provided every function inside the props is one we can name. The library's own marks,
// stack/dodge/jitter and polar() register themselves here (`describe`), by identity, so a user's
// `defineMark('line', ...)` is not mistaken for ours. A mark's render may read only rows, ctx and
// props; anything else it reads is invisible to this key.
const VERSION = 'plot-1';
const described = new WeakMap();   // a function or object of ours -> what stands for it in the key

// Name `v` in keys by `spec`, a plain value; returns `v`.
export const describe = (v, spec) => (described.set(v, spec), v);

class Unkeyable extends Error {}

function walk(v, out, seen) {
  if (v === null) return void out.push('n');
  switch (typeof v) {
    case 'number': return void out.push(Number.isFinite(v) ? String(v) : Number.isNaN(v) ? 'NaN' : v > 0 ? '+Inf' : '-Inf');
    case 'string': return void out.push(JSON.stringify(v));
    case 'boolean': return void out.push(v ? 't' : 'f');
    case 'undefined': return void out.push('u');
    case 'bigint': case 'symbol': throw new Unkeyable(typeof v);
  }
  if (described.has(v)) return void (out.push('#'), walk(described.get(v), out, seen));
  if (typeof v === 'function') throw new Unkeyable('function');
  if (seen.has(v)) throw new Unkeyable('cycle');
  seen.add(v);
  if (v instanceof Date) out.push('D' + v.getTime());
  else if (Array.isArray(v)) {
    out.push('[');
    for (let i = 0; i < v.length; i++) (i && out.push(','), walk(v[i], out, seen));
    out.push(']');
  } else {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw new Unkeyable('object');
    out.push('{');
    for (const k of Object.keys(v)) if (k !== '__self' && k !== '__source') out.push(JSON.stringify(k), ':'), walk(v[k], out, seen), out.push(',');
    out.push('}');
  }
  seen.delete(v);
}

// (`__self` and `__source` are what a development JSX transform adds to every element.)
// The key of `props` as a string, or null if they cannot be keyed. Top-level `key` is left out
// (it is the caller's own name for the figure; a nested `key` is a channel or a data field and stays).
export function specKey(props) {
  const out = [VERSION];
  const { key, ...rest } = props;
  try { walk(rest, out, new Set()); } catch (e) { if (e instanceof Unkeyable) return null; throw e; }
  return out.join('');
}
