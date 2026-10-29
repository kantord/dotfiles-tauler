// title: A treemap
// section: Hierarchies
//
// A hierarchy comes from flat rows: a path such as "home/media/photos" (the parents are filled in) or an id and a parent. Treemap sizes the leaves by value, colours them by their top-level branch, and labels the ones that have room.
// This is the shortcut. The next examples draw the same kind of layout with ordinary marks.
import { Plot, Treemap, chartTheme } from "@gh/kantord/dotfiles-tauler";

// Disk usage of a home directory, in MB.
const du = [
  { dir: "home/media/photos", mb: 420 }, { dir: "home/media/music", mb: 260 }, { dir: "home/media/video", mb: 610 },
  { dir: "home/code/app", mb: 180 }, { dir: "home/code/tools", mb: 90 }, { dir: "home/code/scratch", mb: 30 },
  { dir: "home/mail", mb: 150 }, { dir: "home/notes", mb: 12 },
];

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // Treemap does the layout itself: one tile per row, sized by mb, padding={1} leaves 1 px between tiles.
  // Tiles are coloured by the directory just below the trunk (media, code, mail, notes); the label shows only where it fits.
  return (
    <Plot width={248} height={110} theme={theme} data={du}>
      <Treemap path="dir" value="mb" label={d => d.dir.split("/").at(-1)} padding={1} />
    </Plot>
  );
}
