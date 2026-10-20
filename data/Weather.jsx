// Data component: current conditions from wttr.in, as a plain object. Draws
// nothing — pair it with <WeatherSummary> or your own display.
//
//   <Weather location="Barcelona">{w => <WeatherSummary {...w} />}</Weather>
//
// `location` goes straight to wttr.in, so anything it understands works: a
// city, an airport code, a "~Landmark Name". Leave it empty and it geolocates
// by IP, which is usually right on a laptop. `location` is percent-encoded,
// apostrophes included (encodeURIComponent leaves `'` alone), so nothing in it
// can close the single quotes around the curl argument. `refreshSeconds` has a
// floor, so a zero or negative value can't turn the loop into a busy one.
//
// They both end up inside the command string, and tauler uses that string to
// identify the stream. Change either one and the subprocess gets killed and
// respawned, so set them in the layout file and leave them there.
//
// jq builds the JSON line, so a quote or backslash in what wttr.in sends back
// (its error and rate-limit messages are plain text) can't break the record.
const MIN_REFRESH_SECONDS = 10;

export default function Weather({ location = '', refreshSeconds = 180, children }) {
  const period = Math.max(Number(refreshSeconds) || 180, MIN_REFRESH_SECONDS);
  const place = encodeURIComponent(location).replace(/'/g, '%27');
  const w = useJSONStream("/usr/bin/bash", `while true; do curl -s --max-time 10 'wttr.in/${place}?format=%C|%t|%f|%h|%u' 2>/dev/null | jq -Rsc 'rtrimstr("\\n") | split("|") as $f | {cond: ($f[0] // ""), temp: ($f[1] // ""), feels: ($f[2] // ""), humidity: ($f[3] // ""), uv: ($f[4] // "")}'; sleep ${period}; done`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(w);
}
