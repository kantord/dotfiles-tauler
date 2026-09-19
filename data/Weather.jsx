// Data component: current conditions from wttr.in, as a plain object. Draws
// nothing — pair it with <WeatherSummary> or your own display.
//
//   <Weather location="Barcelona">{w => <WeatherSummary {...w} />}</Weather>
//
// `location` goes straight to wttr.in, so anything it understands works: a
// city, an airport code, a "~Landmark Name". Leave it empty and it geolocates
// by IP, which is usually right on a laptop. Both props are sanitized before
// they reach the command, so a space or a stray quote in `location` can't
// escape the single quotes around the curl argument.
//
// They both end up inside the command string, and tauler uses that string to
// identify the stream. Change either one and the subprocess gets killed and
// respawned, so set them in the layout file and leave them there.
export default function Weather({ location = '', refreshSeconds = 180, children }) {
  const period = Number(refreshSeconds) || 180;
  const w = useJSONStream("/usr/bin/bash", `while true; do data=$(curl -s --max-time 10 'wttr.in/${encodeURIComponent(location)}?format=%C|%t|%f|%h|%u' 2>/dev/null); cond=$(echo "$data"|cut -d'|' -f1); temp=$(echo "$data"|cut -d'|' -f2); feels=$(echo "$data"|cut -d'|' -f3); humidity=$(echo "$data"|cut -d'|' -f4); uv=$(echo "$data"|cut -d'|' -f5); printf '{"cond":"%s","temp":"%s","feels":"%s","humidity":"%s","uv":"%s"}\\n' "$cond" "$temp" "$feels" "$humidity" "$uv"; sleep ${period}; done`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(w);
}
