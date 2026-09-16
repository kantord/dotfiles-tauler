// The label row both volume controls share: name on the left, percentage on
// the right. When `on_toggle_mute` is given the name is the mute toggle.
export default function VolumeLabel({ label, value, muted, on_toggle_mute }) {
  const text = muted ? `${label} · muted` : label;
  return (
    <div class="flex flex-row items-baseline justify-between w-full">
      <div on_click={on_toggle_mute ? [on_toggle_mute()] : undefined}>
        <span class="text-[10px] text-muted-foreground">{text}</span>
      </div>
      <span class="text-[10px] text-muted-foreground">{value}%</span>
    </div>
  );
}
