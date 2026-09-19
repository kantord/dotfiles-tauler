// Display component: the shell every sidebar card shares. A hairline divider,
// then a padded column for whatever the card wants to show. Cards that render
// nothing (no items) should return null before reaching this, so the divider
// disappears with them.
//
//   <SidebarSection>
//     <span class="text-[10px] text-muted-foreground">DISK</span>
//     <Progress value={used} />
//   </SidebarSection>
//
// `gap` is the column's row gap in px. `class` is appended to the column, for
// the odd card that wants a row instead: `class="flex-row"`.
export default function SidebarSection({ children, gap = 4, class: cls = "" }) {
  return (
    <div class="flex flex-col w-full">
      <div class="py-[4px] w-full"><div class="h-px w-full" style={{ backgroundColor: "rgba(128,128,128,0.15)" }} /></div>
      <div class={`flex flex-col gap-[${gap}px] px-3 py-[8px] w-full ${cls}`}>{children}</div>
    </div>
  );
}
