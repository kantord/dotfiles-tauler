// title: Group and count
// section: Statistics
//
// Statistics are plain functions from rows to rows, called in the layout before the Plot. group counts the rows of each key and returns [{ key, value }], which a Bar draws.
// Anything you can do with Array methods works the same way; the library only ships the common ones.
import { Plot, Bar, Axis, group, chartTheme } from "@gh/kantord/dotfiles-tauler";

// One row per commit: who made it.
const authors = ["ana", "bo", "ana", "cy", "ana", "bo", "dee", "ana", "cy", "bo", "ana", "ana", "dee", "bo", "ana"];
const commits = authors.map((author, i) => ({ author, id: i }));

export default function Example() {
  const theme = chartTheme(themeColor, "JetBrains Mono");   // theme: the bar's colours, and the font text is measured in
  // group() returns rows { key, value }: key is the author, value the number of their commits (the default reduce is the count).
  const perAuthor = group(commits, "author");
  return (
    <Plot width={248} height={110} theme={theme} data={perAuthor} x="key" y="value">
      <Bar />
      <Axis channel="x" />
      <Axis channel="y" ticks={3} />
    </Plot>
  );
}
