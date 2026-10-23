// Data component: an action that opens a URL (or file) with `xdg-open`. Draws nothing; its child
// gets the action.
//
//   <OpenUrl>{open => <span on_click={[open("https://github.com")]}>GitHub</span>}</OpenUrl>
//
// `open(url)` returns an intent for an `on_click`. Every <OpenUrl> shares one small subprocess,
// bin/tauler-open (in ~/.local/bin, or pass `bin`), which runs xdg-open for each request.
export const DEFAULT_BIN = "~/.local/bin/tauler-open";

export default function OpenUrl({ bin = DEFAULT_BIN, children }) {
  const child = Array.isArray(children) ? children[0] : children;
  return (
    <Module bin={bin}>
      {(_, events) => child(url => events.open({ url }))}
    </Module>
  );
}
