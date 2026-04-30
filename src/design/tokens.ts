export const palette = {
  ink900: '#0B0F14',
  ink700: '#1B2330',
  ink500: '#3B4554',
  ink300: '#7A8392',
  ink100: '#C9CFD9',
  paper: '#FFFFFF',
  paperAlt: '#F6F7FB',

  brand500: '#3B82F6',
  brand400: '#60A5FA',
  brand100: '#DBEAFE',

  accent500: '#F59E0B',
  success500: '#10B981',
  danger500: '#EF4444',

  pastel: [
    '#FCD5CE',
    '#F8EDEB',
    '#FAE1DD',
    '#E8E8E4',
    '#D8E2DC',
    '#FFE5D9',
    '#FFD7BA',
    '#FEC89A',
    '#CDB4DB',
    '#FFC8DD',
    '#BDE0FE',
    '#A2D2FF',
    '#B5EAD7',
    '#C7CEEA',
    '#FFDAC1',
  ] as const,
} as const;

export const themes = {
  light: {
    bg: palette.paper,
    bgAlt: palette.paperAlt,
    surface: palette.paper,
    text: palette.ink900,
    textMuted: palette.ink500,
    textSubtle: palette.ink300,
    border: palette.ink100,
    primary: palette.brand500,
    accent: palette.accent500,
    mapWater: '#E6EEF7',
    mapLand: '#F0F2F5',
    mapVisited: palette.brand400,
    mapUnvisited: '#E5E7EB',
  },
  dark: {
    bg: palette.ink900,
    bgAlt: palette.ink700,
    surface: '#141A23',
    text: palette.paper,
    textMuted: palette.ink100,
    textSubtle: palette.ink300,
    border: palette.ink500,
    primary: palette.brand400,
    accent: palette.accent500,
    mapWater: '#0A1422',
    mapLand: '#141A23',
    mapVisited: palette.brand400,
    mapUnvisited: '#1F2937',
  },
} as const;

export type ThemeName = keyof typeof themes;
export type Theme = (typeof themes)[ThemeName];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pop: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export function pickPastel(seed: string | number): string {
  const s = typeof seed === 'number' ? seed : seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette.pastel[s % palette.pastel.length];
}
