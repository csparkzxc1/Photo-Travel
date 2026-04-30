import { create } from 'zustand';
import { Country, Photo, Region, Trip, Visit } from '@core/types';
import { clusterTrips } from '@core/tripClusterer';
import { COUNTRIES, DEFAULT_COUNTRY } from './countries';
import { KR_LEVEL1_REGIONS } from './koreaRegions';
import { generateMockPhotos } from './mockPhotos';

export type MapMode = 'region' | 'heatmap' | 'marker';

interface AppState {
  countries: Country[];
  selectedCountry: string;
  regions: Record<string, Region[]>;
  photos: Photo[];
  trips: Trip[];
  visits: Visit[];
  yearFilter: number | 'all';
  mapMode: MapMode;

  setCountry: (code: string) => void;
  setYearFilter: (year: number | 'all') => void;
  setMapMode: (mode: MapMode) => void;
  hydrateMockData: () => void;
}

const USER_ID = 'demo_user';

export const useAppStore = create<AppState>((set) => ({
  countries: COUNTRIES,
  selectedCountry: DEFAULT_COUNTRY,
  regions: { KR: KR_LEVEL1_REGIONS },
  photos: [],
  trips: [],
  visits: [],
  yearFilter: 'all',
  mapMode: 'region',

  setCountry: (code) => set({ selectedCountry: code }),
  setYearFilter: (year) => set({ yearFilter: year }),
  setMapMode: (mode) => set({ mapMode: mode }),

  hydrateMockData: () => {
    const photos = generateMockPhotos();
    const trips = clusterTrips(photos, USER_ID);
    const visits = computeVisits(photos, USER_ID);
    set({ photos, trips, visits });
  },
}));

function computeVisits(photos: Photo[], userId: string): Visit[] {
  const map = new Map<string, Visit>();
  for (const p of photos) {
    if (!p.regionId) continue;
    const existing = map.get(p.regionId);
    if (!existing) {
      map.set(p.regionId, {
        userId,
        regionId: p.regionId,
        firstVisitedAt: p.takenAt,
        lastVisitedAt: p.takenAt,
        totalPhotos: 1,
        totalTrips: 1,
      });
    } else {
      existing.totalPhotos += 1;
      if (p.takenAt < existing.firstVisitedAt) existing.firstVisitedAt = p.takenAt;
      if (p.takenAt > existing.lastVisitedAt) existing.lastVisitedAt = p.takenAt;
    }
  }
  return Array.from(map.values());
}

export function selectVisitedRegionIds(state: AppState, year?: number | 'all'): Set<string> {
  const filter = year ?? state.yearFilter;
  const ids = new Set<string>();
  for (const p of state.photos) {
    if (!p.regionId) continue;
    if (filter !== 'all' && new Date(p.takenAt).getFullYear() !== filter) continue;
    ids.add(p.regionId);
  }
  return ids;
}

export function selectAvailableYears(state: AppState): number[] {
  const years = new Set<number>();
  for (const p of state.photos) years.add(new Date(p.takenAt).getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}
