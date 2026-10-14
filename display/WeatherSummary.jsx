import { Icon } from '@ui/icon';

// Display component: renders one wttr.in reading — temperature, feels-like,
// a condition icon, humidity and UV — and nothing else. Pair it with
// <Weather>, which is the thing that actually reads wttr.in.
//
//   <Weather location="Barcelona">{w => <WeatherSummary {...w} />}</Weather>
//
// While the first reading is still loading, or if a fetch fails, this shows
// `…` and `—` instead of empty fields — `w` is `null` before the first line
// lands, and a failed curl still prints a record, only with every field
// blank, so a plain `??` would let the blanks through.
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

// THEME-GAP: semantic low/moderate/high/extreme scale, no theme token equivalent
function uvColor(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return ctx.theme.colors['muted-foreground'];
  if (n <= 2) return ctx.theme.colors['ansi-green'];
  if (n <= 5) return ctx.theme.colors['ansi-yellow'];
  if (n <= 7) return ctx.theme.colors['ansi-bright-red'];
  return ctx.theme.colors['ansi-red'];
}

export default function WeatherSummary({ cond, temp, feels, humidity, uv }) {
  return (
    <>
      <div class="flex flex-row items-baseline justify-between">
        <span class="text-[15px] text-foreground font-bold">{temp || "…"}</span>
        <span class="text-[10px] text-muted-foreground">feels {feels || "…"}</span>
      </div>
      <div class="flex flex-row justify-between items-center">
        <Icon name={conditionIcon(cond)} class="text-[14px] text-muted-foreground" />
        <span class="text-[10px] text-muted-foreground">RH {humidity || "—"}</span>
      </div>
      <div class="flex flex-row justify-between">
        <span class="text-[10px]" style={{ color: uvColor(uv) }}>UV {uvLabel(uv)}</span>
        <div />
      </div>
    </>
  );
}
