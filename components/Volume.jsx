// Data components (tauler's term: draw nothing, call their child with data)
// over the `tauler-volume` module. All three read the same bin, and tauler
// identifies a subprocess by its bin, so a layout using any mix gets one process.
//
//   <OutputVolume>{(state, actions) => <VolumeSlider value={state?.volume} ... />}</OutputVolume>
//   <AudioChannels>{(channels, actions) => channels.filter(...).map(ch => ...)}</AudioChannels>
//
// For OutputVolume/InputVolume, `state` is `{ volume, muted }`, or `null` while
// the module has not answered yet or the device does not exist (a machine with
// no microphone, say). `actions.setVolume(n)` and `actions.toggleMute()` return
// intents, so they drop straight into an `on_change` or an `on_click`.
//
// For AudioChannels, `channels` is every sink, source, playback stream and
// recording stream PipeWire has, each `{ id, kind, type, name, description,
// app, media, state, default, volume, muted }` (see bin/tauler-volume for the
// values), and the actions take the channel id first: `actions.setVolume(id, n)`,
// `actions.toggleMute(id)`.
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

export function AudioChannels({ bin = DEFAULT_BIN, children }) {
  const child = Array.isArray(children) ? children[0] : children;
  return (
    <Module bin={bin}>
      {(data, events) => child(data?.channels ?? [], {
        setVolume: (id, volume) => events.setVolume({ id, volume }),
        toggleMute: id => events.toggleMute({ id }),
      })}
    </Module>
  );
}
