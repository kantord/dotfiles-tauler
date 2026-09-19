import SidebarSection from './SidebarSection.jsx';
import { Icon } from '@ui/icon';

function conditionIcon(cond) {
  if (!cond) return "weather-na";
  const c = cond.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return "weather-thunderstorm";
  if (c.includes("blizzard")) return "weather-snow_wind";
  if (c.includes("sleet")) return "weather-sleet";
  if (c.includes("freezing rain")) return "weather-rain_mix";
  if (c.includes("snow")) return "weather-snow";
  if (c.includes("drizzle") || c.includes("sprinkle")) return "weather-sprinkle";
  if (c.includes("shower")) return "weather-showers";
  if (c.includes("rain")) return "weather-rain";
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return "weather-fog";
  if (c.includes("overcast")) return "weather-cloudy";
  if (c.includes("partly cloudy")) return "weather-day_cloudy";
  if (c.includes("cloudy")) return "weather-cloudy";
  if (c.includes("sunny") || c.includes("clear")) return "weather-day_sunny";
  return "weather-na";
}

function uvLabel(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return "—";
  if (n <= 2) return `Low (${n})`;
  if (n <= 5) return `Moderate (${n})`;
  if (n <= 7) return `High (${n})`;
  if (n <= 10) return `Very High (${n})`;
  return `Extreme (${n})`;
}

function uvColor(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return "rgba(255,255,255,0.5)";
  if (n <= 2) return "#a6e3a1";
  if (n <= 5) return "#f9e2af";
  if (n <= 7) return "#fab387";
  return "#f38ba8";
}

// `location` goes straight to wttr.in, so anything it understands works: a
// city, an airport code, a "~Landmark Name". Leave it empty and it geolocates
// by IP, which is usually right on a laptop. Both props are sanitized before
// they reach the command, so a space or a stray quote in `location` can't
// escape the single quotes around the curl argument.
//
// They both end up inside the command string, and tauler uses that string to
// identify the stream. Change either one and the subprocess gets killed and
// respawned, so set them in layout.jsx and leave them there.
export default function WeatherCard({ location = '', refreshSeconds = 180 }) {
  const period = Number(refreshSeconds) || 180;
  const w = useJSONStream("/usr/bin/bash", `while true; do data=$(curl -s --max-time 10 'wttr.in/${encodeURIComponent(location)}?format=%C|%t|%f|%h|%u' 2>/dev/null); cond=$(echo "$data"|cut -d'|' -f1); temp=$(echo "$data"|cut -d'|' -f2); feels=$(echo "$data"|cut -d'|' -f3); humidity=$(echo "$data"|cut -d'|' -f4); uv=$(echo "$data"|cut -d'|' -f5); printf '{"cond":"%s","temp":"%s","feels":"%s","humidity":"%s","uv":"%s"}\\n' "$cond" "$temp" "$feels" "$humidity" "$uv"; sleep ${period}; done`);
  // A failed curl still prints a complete record, only with every field empty,
  // so `??` would let the blanks through. `||` catches those as well as the
  // null we get before the first line lands.
  const temp = w?.temp || "…";
  const feels = w?.feels || "…";
  const humidity = w?.humidity || "—";
  // THEME-GAP: UV colors in inline style (semantic — low/moderate/high/extreme scale, no token equivalent)
  return (
    <SidebarSection>
    <div class="flex flex-row items-baseline justify-between">
      <span class="text-[15px] text-foreground font-bold">{temp}</span>
      <span class="text-[10px] text-muted-foreground">feels {feels}</span>
    </div>
    <div class="flex flex-row justify-between items-center">
      <Icon name={conditionIcon(w?.cond)} class="text-[14px] text-muted-foreground" />
      <span class="text-[10px] text-muted-foreground">RH {humidity}</span>
    </div>
    <div class="flex flex-row justify-between">
      <span class="text-[10px]" style={{ color: uvColor(w?.uv) }}>UV {uvLabel(w?.uv)}</span>
      <div />
    </div>
    </SidebarSection>
  );
}
