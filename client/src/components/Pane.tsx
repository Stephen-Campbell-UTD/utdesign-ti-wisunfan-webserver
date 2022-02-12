import {useContext} from 'react';
import {ColorScheme, ThemeContext, THEME} from '../ColorScheme';
import '../assets/Pane.css';
import {ComponentThemeImplementations} from '../utils';

interface PaneProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

interface PaneTheme {
  paneStyle: React.CSSProperties;
}
const paneThemeImplementations = new ComponentThemeImplementations<PaneTheme>();
const tiPaneTheme = {
  paneStyle: {
    backgroundColor: 'rgba(0,0,0,0)',
  },
};
paneThemeImplementations.set(THEME.TI, tiPaneTheme);
const gruvboxPaneTheme = {
  paneStyle: {
    backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
  },
};
paneThemeImplementations.set(THEME.GRUVBOX, gruvboxPaneTheme);

export default function Pane(props: PaneProps) {
  const theme = useContext(ThemeContext);
  const {paneStyle} = paneThemeImplementations.get(theme);
  return (
    <div className="pane" style={{...paneStyle, ...props.style}}>
      {props.children}
    </div>
  );
}
