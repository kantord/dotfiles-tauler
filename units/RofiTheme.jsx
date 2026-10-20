import {
  Rofi,
  Selector,
  BackgroundColor,
  TextColor,
  BorderColor,
  PlaceholderColor,
  Font,
  Location,
  Anchor,
  YOffset,
  Width,
  Height,
  Spacing,
  Size,
  VerticalAlign,
  Padding,
  Border,
  Cycle,
  Dynamic,
  Scrollbar,
  Lines,
  Columns,
  Placeholder,
  Children,
} from '../schemas/rofi-full-theme.schema.yaml';

// rofi's launcher in the active tauler theme (`ctx.theme`), like KittyTheme and I3Theme. Which token
// paints which surface follows the names a UI uses: the window is a `popover`, the input bar and
// rows sit on `background`, the selection and the accent are `primary`, an error is `destructive`.
const RofiTheme = ConfigFile({
  path: '~/.config/rofi/tauler-theme.rasi',
  render: () => {
    const c = ctx.theme.colors;
    return (
      <Rofi>
        <Selector name="*">
          <Font value="JetBrains Mono 28" />
          <BackgroundColor value="transparent" />
          <TextColor value={c['popover-foreground']} />
        </Selector>
        <Selector name="window">
          <Location value="south" />
          <Anchor value="south" />
          <YOffset value="-5%" />
          <Width value="70%" />
          <Height value="70%" />
          <Padding value="0" />
          <Border value="2px solid" />
          <BorderColor value={c.primary} />
          <BackgroundColor value={c.popover} />
        </Selector>
        <Selector name="mainbox">
          <Padding value="16px" />
          <Spacing value="12px" />
          <Children value={["inputbar", "message", "listview"]} />
        </Selector>
        <Selector name="inputbar">
          <Padding value="10px 12px" />
          <Spacing value="10px" />
          <BackgroundColor value={c.background} />
          <Children value={["prompt", "entry"]} />
        </Selector>
        <Selector name="prompt">
          <TextColor value={c.primary} />
        </Selector>
        <Selector name="entry">
          <Placeholder value="search…" />
          <PlaceholderColor value={c['muted-foreground']} />
        </Selector>
        <Selector name="listview">
          <Lines value="24" />
          <Columns value="1" />
          <Spacing value="2px" />
          <Cycle value="true" />
          <Dynamic value="true" />
          <Scrollbar value="false" />
        </Selector>
        <Selector name="element">
          <Padding value="8px 10px" />
          <Spacing value="10px" />
        </Selector>
        <Selector name="element selected">
          <BackgroundColor value={c.primary} />
          <TextColor value={c['primary-foreground']} />
        </Selector>
        <Selector name="element-icon">
          <Size value="1.3em" />
          <BackgroundColor value="transparent" />
        </Selector>
        <Selector name="element-text">
          <BackgroundColor value="transparent" />
          <TextColor value="inherit" />
          <VerticalAlign value="0.5" />
        </Selector>
        <Selector name="mode-switcher">
          <Spacing value="6px" />
        </Selector>
        <Selector name="button">
          <Padding value="4px 8px" />
          <BackgroundColor value={c.background} />
          <TextColor value={c['muted-foreground']} />
        </Selector>
        <Selector name="button selected">
          <BackgroundColor value={c.primary} />
          <TextColor value={c['primary-foreground']} />
        </Selector>
        <Selector name="message">
          <Padding value="6px 8px" />
          <BackgroundColor value={c.background} />
        </Selector>
        <Selector name="textbox">
          <TextColor value={c['popover-foreground']} />
        </Selector>
        <Selector name="error-message">
          <BackgroundColor value={c.destructive} />
          <TextColor value={c['destructive-foreground']} />
          <Padding value="8px" />
        </Selector>
      </Rofi>
    );
  },
});

export default RofiTheme;
