import React, {useContext} from 'react';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';

interface StatusIndicatorProps {
  isGoodStatus: boolean;
}
interface StatusIndicatorTheme {
  goodColor: Color;
  badColor: Color;
  style: React.CSSProperties;
}
const statusIndicatorThemeImplementations =
  new ComponentThemeImplementations<StatusIndicatorTheme>();
const tiStatusIndicatorTheme = {
  goodColor: ColorScheme.getColor('green', THEME.TI),
  badColor: ColorScheme.getColor('red', THEME.TI),
  style: {
    width: 28,
    height: 28,
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
  },
};
statusIndicatorThemeImplementations.set(THEME.TI, tiStatusIndicatorTheme);

const gruvboxStatusIndicatorTheme = {
  goodColor: ColorScheme.getColor('green', THEME.GRUVBOX),
  badColor: ColorScheme.getColor('red', THEME.GRUVBOX),
  style: {
    width: 22,
    height: 22,
    border: `3px solid ${ColorScheme.getColor('bg1', THEME.GRUVBOX)}`,
    borderRadius: 16,
  },
};
statusIndicatorThemeImplementations.set(THEME.GRUVBOX, gruvboxStatusIndicatorTheme);

export default function StatusIndicator(props: StatusIndicatorProps) {
  const theme = useContext(ThemeContext);
  let {goodColor, badColor, style} = statusIndicatorThemeImplementations.get(theme);

  const statusColor = props.isGoodStatus ? goodColor : badColor;
  style = {
    backgroundColor: statusColor,
    ...style,
  };

  return <div style={style}></div>;
}
