import { Slider } from '@ui/slider';
import VolumeLabel from './VolumeLabel.jsx';

// A Control: draws a 0–100 volume and reports what you slide it to. Holds
// nothing; pair it with <OutputVolume> or <InputVolume>, which own the number.
// Muted draws as 0 without changing the value it was given, so unmuting comes
// back where it was.
export default function VolumeSlider({ value, muted = false, on_change, on_toggle_mute, label = "Volume", step = 5 }) {
  const volume = value ?? 0;
  return (
    <div class="flex flex-col gap-[6px] w-full">
      {label && <VolumeLabel label={label} value={volume} muted={muted} on_toggle_mute={on_toggle_mute} />}
      <Slider value={muted ? 0 : volume} min={0} max={100} step={step} on_change={on_change} />
    </div>
  );
}
