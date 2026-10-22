// Data component: a laptop battery's charge, from /sys/class/power_supply. Draws nothing.
//
//   <Battery>{b => b && <span>{b.percent}%{b.charging ? ' ⚡' : ''}</span>}</Battery>
//
// The child gets `{ percent, charging }`, or `null` while there is no answer yet and on a
// machine without that battery (a desktop), so a layout can leave the cell out. `device` is the
// directory name under /sys/class/power_supply (default `BAT0`); anything that is not a plain
// name falls back to the default, so it cannot reach outside that directory or the shell.
const MIN_REFRESH_SECONDS = 1;

export default function Battery({ device = 'BAT0', refreshSeconds = 10, children }) {
  const dev = /^[A-Za-z0-9_.-]+$/.test(device) && !device.startsWith('.') ? device : 'BAT0';
  const period = Math.max(Number(refreshSeconds) || 10, MIN_REFRESH_SECONDS);
  const b = useJSONStream("/usr/bin/bash", `d=/sys/class/power_supply/${dev}; while true; do if [ -r $d/capacity ]; then c=false; [ "$(cat $d/status 2>/dev/null)" = Charging ] && c=true; printf '{"percent":%d,"charging":%s}\\n' "$(cat $d/capacity)" $c; else echo null; fi; sleep ${period}; done`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(b ?? null);
}
