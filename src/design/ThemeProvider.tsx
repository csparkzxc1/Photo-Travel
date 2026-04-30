import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeName, themes } from './tokens';

type ThemeCtx = { theme: Theme; name: ThemeName };

const ThemeContext = createContext<ThemeCtx>({ theme: themes.light, name: 'light' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo<ThemeCtx>(() => {
    const name: ThemeName = scheme === 'dark' ? 'dark' : 'light';
    return { name, theme: themes[name] };
  }, [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
