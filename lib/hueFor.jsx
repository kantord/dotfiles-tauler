// A stable hue (0–359) for any name, for colour-coding things like repositories:
//
//   <div style={{ backgroundColor: `hsla(${hueFor("tauler")}, 60%, 60%, 0.1)` }} />
//
// A hash (FNV-1a) of the name, so the same name gets the same hue on every machine and after
// every restart, with nothing stored. Different names can land close together; pick names, not
// hues, if two must differ.
export default function hueFor(name) {
  let h = 0x811c9dc5;
  for (const ch of String(name)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 360;
}
