import { Slider } from '@ui/slider';
import { DEFAULT_BIN, VolumeLabel } from './volume.jsx';

// A slider over the default audio sink. Holds nothing: `tauler-volume` owns the
// number, a drag sends an intent, wpctl changes the sink, the module re-emits,
// and the next tick moves the slider. Muted draws as 0 without changing the
// stored volume, so unmuting comes back where it was.
export default function VolumeSlider({ bin = DEFAULT_BIN, label = "Volume", step = 5 }) {
  return (
    <Module bin={bin}>
      {(data, events) => {
        const volume = data?.volume ?? 0;
        const muted = data?.muted ?? false;
        return (
          <div class="flex flex-col gap-[6px] w-full">
            {label && <VolumeLabel label={label} volume={volume} muted={muted} events={events} />}
            <Slider
              value={muted ? 0 : volume}
              min={0}
              max={100}
              step={step}
              on_change={v => events.setVolume({ volume: v })}
            />
          </div>
        );
      }}
    </Module>
  );
}
