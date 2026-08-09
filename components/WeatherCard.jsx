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

// `location` is anything wttr.in resolves — a city, an airport code, a
// "~Landmark Name". Omit it and wttr.in geolocates from the requesting IP,
// which is the sane default for a machine that travels. It is URL-encoded
// before interpolation, so a space (or a stray quote) can't break out of the
// single-quoted curl argument below.
//
// Both props are part of the command string, and the command string is the
// stream's identity — changing either respawns the subprocess. Fine for
// config set once in layout.jsx; don't drive them from changing state.
export default function WeatherCard({ location = '', refreshSeconds = 180 }) {
  const w = useJSONStream("/usr/bin/bash", `while true; do data=$(curl -s --max-time 10 'wttr.in/${encodeURIComponent(location)}?format=%C|%t|%f|%h|%u' 2>/dev/null); cond=$(echo "$data"|cut -d'|' -f1); temp=$(echo "$data"|cut -d'|' -f2); feels=$(echo "$data"|cut -d'|' -f3); humidity=$(echo "$data"|cut -d'|' -f4); uv=$(echo "$data"|cut -d'|' -f5); printf '{"cond":"%s","temp":"%s","feels":"%s","humidity":"%s","uv":"%s"}\\n' "$cond" "$temp" "$feels" "$humidity" "$uv"; sleep ${refreshSeconds}; done`);
  // THEME-GAP: UV colors in inline style (semantic — low/moderate/high/extreme scale, no token equivalent)
  return (
    <container tw="flex flex-col w-full">
      <container tw="py-[4px] w-full"><container tw="h-px w-full" style={{backgroundColor: "rgba(255,255,255,0.08)"}} /></container>
    <container tw="flex flex-col gap-[4px] px-3 py-[8px]">
      <container tw="flex flex-row items-baseline justify-between">
        <text tw="text-[15px] text-foreground font-bold">{w?.temp ?? "…"}</text>
        <text tw="text-[10px] text-muted-foreground">feels {w?.feels ?? "…"}</text>
      </container>
      <container tw="flex flex-row justify-between items-center">
        <Icon name={conditionIcon(w?.cond)} tw="text-[14px] text-muted-foreground" />
        <text tw="text-[10px] text-muted-foreground">RH {w?.humidity ?? "—"}</text>
      </container>
      <container tw="flex flex-row justify-between">
        <text tw="text-[10px]" style={{ color: uvColor(w?.uv) }}>UV {uvLabel(w?.uv)}</text>
        <container />
      </container>
    </container>
    </container>
  );
}
