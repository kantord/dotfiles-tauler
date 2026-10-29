// title: Shared colour domain and order
// section: Small multiples
//
// Colour is learnt from each panel's own rows, so one service could get a different colour in each panel. Passing the same colour domain to every panel pins it, and orderBy computes one band order from all the data.
// The panels then show the same services in the same places and the same colours.
import { Plot, Bar, Scale, Axis, orderBy, chartTheme } from "@gh/kantord/dotfiles-tauler";

const rows = [
  { host: "h1", svc: "db", ms: 40 }, { host: "h1", svc: "web", ms: 90 }, { host: "h1", svc: "kv", ms: 5 },
  { host: "h2", svc: "db", ms: 120 }, { host: "h2", svc: "web", ms: 30 }, { host: "h2", svc: "kv", ms: 8 }, { host: "h2", svc: "mq", ms: 60 },
  { host: "h3", svc: "web", ms: 70 }, { host: "h3", svc: "mq", ms: 20 },
];
const hosts = ["h1", "h2", "h3"];

const MS_MAX = 130;   // a little above the slowest row (120 ms): every panel's x domain is 0 to 130

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // orderBy() returns the svc values sorted by the sum of their ms, biggest first: web (190), db (160), mq (80), kv (13).
  const services = orderBy(rows, { field: "svc", by: "ms", stat: "sum", descending: true });
  return (
    <div class="flex flex-row gap-[4px]">
      {hosts.map(host => (
        <Plot width={90} height={96} theme={theme} data={rows.filter(r => r.host === host)} x="ms" y="svc" color="svc">
          <Scale channel="x" domain={[0, MS_MAX]} />
          <Scale channel="y" type="band" domain={services} />
          <Scale channel="color" domain={services} />
          <Bar />
          <Axis channel="y" />
        </Plot>
      ))}
    </div>
  );
}
