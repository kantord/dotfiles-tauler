// Data component: the current time as a string, from `date`. Draws nothing.
//
//   <Clock>{t => <span>{t}</span>}</Clock>
//   <Clock format="%a %d %b" refreshSeconds={60}>{d => <span>{d}</span>}</Clock>
//
// `format` is a `date +FORMAT` string (default `%H:%M`). The child gets `null` until the first
// line arrives. `refreshSeconds` has a floor of 1.
//
// Both end up in the command string, which tauler uses to identify the stream: change either
// and the subprocess is respawned, so set them in the layout and leave them there.
const MIN_REFRESH_SECONDS = 1;

export default function Clock({ format = '%H:%M', refreshSeconds = 1, children }) {
  const period = Math.max(Number(refreshSeconds) || 1, MIN_REFRESH_SECONDS);
  // Single-quoted for the shell; a `'` in the format closes, escapes and reopens the quote.
  const fmt = `'+${String(format).replace(/'/g, `'\\''`)}'`;
  const t = useStringStream("/usr/bin/bash", `while true; do date ${fmt}; sleep ${period}; done`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(t ? t.trim() : null);
}
