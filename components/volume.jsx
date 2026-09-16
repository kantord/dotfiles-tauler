// Shared by VolumeSlider and VolumeKnob. Both render over the same Module bin,
// and a tauler subprocess is identified by its bin, so a layout that uses both
// gets one `tauler-volume` process and two views of its number.
export const DEFAULT_BIN = "~/.local/bin/tauler-volume";

// The optional label row: name on the left, percentage on the right. The name
// is the mute toggle — same module, different intent.
export function VolumeLabel({ label, volume, muted, events }) {
  return (
    <div class="flex flex-row items-baseline justify-between w-full">
      <div on_click={[events.toggleMute()]}>
        <span class="text-[10px] text-muted-foreground">{muted ? `${label} · muted` : label}</span>
      </div>
      <span class="text-[10px] text-muted-foreground">{volume}%</span>
    </div>
  );
}
