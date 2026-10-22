// Data component over `tauler-notify`, tauler's own desktop-notification daemon (installed with
// tauler). Draws nothing.
//
//   <Notifications>
//     {(list, actions) => list.slice(0, 3).map(n => (
//       <div on_click={[actions.dismiss(n.id)]}>{n.summary}</div>
//     ))}
//   </Notifications>
//
// `list` is what the daemon reports, newest first: each notification has at least `id`,
// `summary` and `body`. `actions.dismiss(id)` returns an intent, so it drops straight into an
// `on_click`. tauler identifies a subprocess by its bin, so this shares one daemon with any
// other `useJSONStream` of the same bin in the layout.
export const DEFAULT_BIN = "~/.cargo/bin/tauler-notify";

export default function Notifications({ bin = DEFAULT_BIN, children }) {
  const child = Array.isArray(children) ? children[0] : children;
  return (
    <Module bin={bin}>
      {(data, events) => child(data?.notifications ?? [], {
        dismiss: id => events.dismiss({ id }),
      })}
    </Module>
  );
}
