// Reading a field: the helpers every statistic and layout shares. Depends on nothing.

// A field name or a function of the datum, as a function of the datum (a missing datum reads undefined).
export const read = a => typeof a === 'function' ? a : d => d?.[a];
// A number, where a missing value is not 0.
export const num = v => (v == null ? NaN : +v);
