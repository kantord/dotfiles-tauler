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
import { readRofiColors } from './rofiColors.jsx';

const RofiTheme = ConfigFile({
  path: '~/.config/rofi/tauler-theme.rasi',
  render: () => {
    const colors = readRofiColors();
    return (
      <Rofi>
        <Selector name="*">
          <Font value="JetBrains Mono 28" />
          <BackgroundColor value="transparent" />
          <TextColor value={colors.fg} />
        </Selector>
        <Selector name="window">
          <Location value="south" />
          <Anchor value="south" />
          <YOffset value="-5%" />
          <Width value="70%" />
          <Height value="70%" />
          <Padding value="0" />
          <Border value="2px solid" />
          <BorderColor value={colors.accent} />
          <BackgroundColor value={colors.panel} />
        </Selector>
        <Selector name="mainbox">
          <Padding value="16px" />
          <Spacing value="12px" />
          <Children value={["inputbar", "message", "listview"]} />
        </Selector>
        <Selector name="inputbar">
          <Padding value="10px 12px" />
          <Spacing value="10px" />
          <BackgroundColor value={colors.bg} />
          <Children value={["prompt", "entry"]} />
        </Selector>
        <Selector name="prompt">
          <TextColor value={colors.accent} />
        </Selector>
        <Selector name="entry">
          <Placeholder value="search…" />
          <PlaceholderColor value={colors["bg-alt-fg"]} />
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
          <BackgroundColor value={colors.accent} />
          <TextColor value={colors.bg} />
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
          <BackgroundColor value={colors.bg} />
          <TextColor value={colors["bg-alt-fg"]} />
        </Selector>
        <Selector name="button selected">
          <BackgroundColor value={colors.accent} />
          <TextColor value={colors.bg} />
        </Selector>
        <Selector name="message">
          <Padding value="6px 8px" />
          <BackgroundColor value={colors.bg} />
        </Selector>
        <Selector name="textbox">
          <TextColor value={colors.fg} />
        </Selector>
        <Selector name="error-message">
          <BackgroundColor value={colors.urgent} />
          <TextColor value={colors.bg} />
          <Padding value="8px" />
        </Selector>
      </Rofi>
    );
  },
});

export default RofiTheme;
