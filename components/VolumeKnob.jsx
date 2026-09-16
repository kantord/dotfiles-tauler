import { Knob } from '@ui/knob';
import { DEFAULT_BIN, VolumeLabel } from './volume.jsx';

// A rotary knob over the default audio sink, same round trip as VolumeSlider.
//
// <Knob> talks in degrees and has no min or max, because it reads how far you
// have turned it rather than what is under the pointer. Putting it on a 0–100
// scale is this file's job: the usual dial, 270° of travel with the bottom 90°
// off-scale.
const ZERO_AT = 225;   // volume 0 sits at 7 o'clock
const SWEEP = 270;     // and climbs clockwise through the top to 5 o'clock

const volumeToDegrees = v => (ZERO_AT + (v * SWEEP) / 100) % 360;

const degreesToVolume = (deg, step) => {
  // Below the dial is off the scale. Turning past either end lands here, and it
  // has to pin to the end it came from — wrapping round to the other one would
  // silence the speakers on the way up.
  if (deg > 135 && deg < ZERO_AT) return deg <= 180 ? 100 : 0;
  const along = (deg - ZERO_AT + 360) % 360;
  // Rounded to `step`, which also stops a turn sending a message per degree: a
  // motion that produces the volume just sent is skipped.
  return Math.round(along / SWEEP * 100 / step) * step;
};

export default function VolumeKnob({ bin = DEFAULT_BIN, label = "Volume", step = 5, size = 28 }) {
  return (
    <Module bin={bin}>
      {(data, events) => {
        const volume = data?.volume ?? 0;
        const muted = data?.muted ?? false;
        return (
          <div class="flex flex-col gap-[6px] w-full">
            {label && <VolumeLabel label={label} volume={volume} muted={muted} events={events} />}
            <Knob
              class={`w-[${size}px] h-[${size}px]`}
              value={volumeToDegrees(muted ? 0 : volume)}
              on_change={deg => events.setVolume({ volume: degreesToVolume(deg, step) })}
            />
          </div>
        );
      }}
    </Module>
  );
}
