// Data components (tauler's term: draw nothing, call their child with data)
// over the `tauler-volume` module. Both read the same bin, and tauler
// identifies a subprocess by its bin, so a layout using both gets one process.
//
//   <OutputVolume>{(state, actions) => <VolumeSlider value={state?.volume} ... />}</OutputVolume>
//
// `state` is `{ volume, muted }`, or `null` while the module has not answered
// yet or the device does not exist (a machine with no microphone, say).
// `actions.setVolume(n)` and `actions.toggleMute()` return intents, so they
// drop straight into an `on_change` or an `on_click`.
export const DEFAULT_BIN = "~/.local/bin/tauler-volume";

function VolumeData({ bin, target, children }) {
  const child = Array.isArray(children) ? children[0] : children;
  return (
    <Module bin={bin}>
      {(data, events) => child(data?.[target] ?? null, {
        setVolume: volume => events.setVolume({ target, volume }),
        toggleMute: () => events.toggleMute({ target }),
      })}
    </Module>
  );
}

// Plain calls rather than <VolumeData>: JSX would replace the `children`
// prop with its own (empty) children list.
export function OutputVolume({ bin = DEFAULT_BIN, children }) {
  return VolumeData({ bin, target: "sink", children });
}

export function InputVolume({ bin = DEFAULT_BIN, children }) {
  return VolumeData({ bin, target: "source", children });
}
