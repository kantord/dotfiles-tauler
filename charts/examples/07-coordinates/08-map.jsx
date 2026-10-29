// title: A map with points and a route
// section: Coordinates
//
// Give the Plot a projection and it fits the map to its size. Geo draws GeoJSON, GeoDot draws lon/lat points, and an ordinary Line between two points follows the great circle instead of a straight chord.
// A map's shapes are detailed, so a real one should also get a key that changes only when its data does.
import { Plot, Geo, GeoDot, Line, chartTheme } from "@gh/kantord/dotfiles-tauler";

// A made-up world: three blocks of land (use real GeoJSON in practice).
// block(name, lon, lat, w, h) is a rectangle with its top-left corner at lon/lat, w degrees wide and h degrees tall.
const block = (name, lon, lat, w, h) => ({ type: "Feature", properties: { name },
  geometry: { type: "Polygon", coordinates: [[[lon, lat], [lon + w, lat], [lon + w, lat - h], [lon, lat - h], [lon, lat]]] } });
const land = [block("west", -120, 55, 50, 40), block("east", 0, 60, 60, 50), block("south", 100, 10, 40, 35)];
const offices = [{ lon: -100, lat: 40 }, { lon: 30, lat: 40 }, { lon: 120, lat: -10 }];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  const colors = ctx.theme.colors;   // the terminal theme's named colours: "ansi-red", "ansi-cyan"...
  // projection="equal-earth" is a world-map projection that keeps areas true; the map is fitted to the plot (the whole globe, no fit given).
  // key="offices-map": the drawing is rebuilt only when this changes, because map paths are costly to compare.
  // The route (Line) joins the first two offices along the great circle; GeoDot draws every office.
  return (
    <Plot width={248} height={130} theme={theme} projection="equal-earth" key="offices-map">
      <Geo data={land} fill={theme.line} stroke={theme.muted} />
      <Line data={offices.slice(0, 2)} x="lon" y="lat" stroke={colors["ansi-cyan"]} strokeDasharray="3 3" />
      <GeoDot data={offices} r={3.5} fill={colors["ansi-red"]} />
    </Plot>
  );
}
