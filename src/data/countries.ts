import { Country } from '@core/types';

export const COUNTRIES: Country[] = [
  { code: 'KR', name_ko: '대한민국', name_en: 'South Korea', flagEmoji: '🇰🇷', totalRegions: 229, supportedLevel: 2 },
  { code: 'JP', name_ko: '일본', name_en: 'Japan', flagEmoji: '🇯🇵', totalRegions: 47, supportedLevel: 1 },
  { code: 'US', name_ko: '미국', name_en: 'United States', flagEmoji: '🇺🇸', totalRegions: 50, supportedLevel: 1 },
  { code: 'TW', name_ko: '대만', name_en: 'Taiwan', flagEmoji: '🇹🇼', totalRegions: 22, supportedLevel: 1 },
  { code: 'TH', name_ko: '태국', name_en: 'Thailand', flagEmoji: '🇹🇭', totalRegions: 77, supportedLevel: 1 },
  { code: 'VN', name_ko: '베트남', name_en: 'Vietnam', flagEmoji: '🇻🇳', totalRegions: 63, supportedLevel: 1 },
  { code: 'FR', name_ko: '프랑스', name_en: 'France', flagEmoji: '🇫🇷', totalRegions: 18, supportedLevel: 1 },
  { code: 'IT', name_ko: '이탈리아', name_en: 'Italy', flagEmoji: '🇮🇹', totalRegions: 20, supportedLevel: 1 },
];

export const DEFAULT_COUNTRY = 'KR';
