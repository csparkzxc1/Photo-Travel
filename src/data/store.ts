import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Country, Photo, Region, Trip, Visit } from '@core/types';
import { processAssets, RawAsset } from '@core/photoProcessor';
import { COUNTRIES, DEFAULT_COUNTRY } from './countries';
import { KR_LEVEL1_REGIONS } from './koreaRegions';
import { generateMockPhotos } from './mockPhotos';

export type MapMode = 'region' | 'heatmap' | 'marker';
export type MapLens = 'visited' | 'unvisited';

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'syncing'; loaded: number; total: number | null }
  | { kind: 'success'; at: string; matched: number; withGps: number; total: number }
  | { kind: 'error'; message: string };

interface AppState {
  countries: Country[];
  selectedCountry: string;
  regions: Record<string, Region[]>;
  photos: Photo[];
  trips: Trip[];
  visits: Visit[];
  yearFilter: number | 'all';
  mapMode: MapMode;
  mapLens: MapLens;
  syncStatus: SyncStatus;
  /** Tracks whether the user has ever completed (or skipped) onboarding. */
  onboarded: boolean;
  isMockData: boolean;

  setCountry: (code: string) => void;
  setYearFilter: (year: number | 'all') => void;
  setMapMode: (mode: MapMode) => void;
  setMapLens: (lens: MapLens) => void;
  markOnboarded: () => void;
  hydrateMockData: () => void;
  ingestAssets: (assets: RawAsset[]) => void;
  setSyncStatus: (status: SyncStatus) => void;
  reset: () => void;
}

const USER_ID = 'demo_user';

const initial = {
  countries: COUNTRIES,
  selectedCountry: DEFAULT_COUNTRY,
  regions: { KR: KR_LEVEL1_REGIONS },
  photos: [] as Photo[],
  trips: [] as Trip[],
  visits: [] as Visit[],
  yearFilter: 'all' as const,
  mapMode: 'region' as MapMode,
  mapLens: 'visited' as MapLens,
  syncStatus: { kind: 'idle' } as SyncStatus,
  onboarded: false,
  isMockData: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,

      setCountry: (code) => set({ selectedCountry: code }),
      setYearFilter: (year) => set({ yearFilter: year }),
      setMapMode: (mode) => set({ mapMode: mode }),
      setMapLens: (lens) => set({ mapLens: lens }),
      markOnboarded: () => set({ onboarded: true }),

      hydrateMockData: () => {
        const photos = generateMockPhotos();
        const regions = get().regions[get().selectedCountry] ?? [];
        const result = processAssets(
          photos.map((p) => ({
            id: p.id,
            uri: p.localUri,
            creationTime: new Date(p.takenAt).getTime(),
            location: { latitude: p.lat, longitude: p.lng },
            accuracy: p.accuracy,
          })),
          { userId: USER_ID, regions }
        );
        set({
          photos: result.photos,
          trips: result.trips,
          visits: result.visits,
          isMockData: true,
        });
      },

      ingestAssets: (assets) => {
        const regions = get().regions[get().selectedCountry] ?? [];
        const result = processAssets(assets, { userId: USER_ID, regions });
        set({
          photos: result.photos,
          trips: result.trips,
          visits: result.visits,
          isMockData: false,
          syncStatus: {
            kind: 'success',
            at: new Date().toISOString(),
            matched: result.stats.matched,
            withGps: result.stats.withGps,
            total: result.stats.total,
          },
        });
      },

      setSyncStatus: (status) => set({ syncStatus: status }),

      reset: () =>
        set({
          photos: [],
          trips: [],
          visits: [],
          isMockData: false,
          syncStatus: { kind: 'idle' },
        }),
    }),
    {
      name: 'phototravel-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedCountry: state.selectedCountry,
        photos: state.photos,
        trips: state.trips,
        visits: state.visits,
        mapMode: state.mapMode,
        mapLens: state.mapLens,
        yearFilter: state.yearFilter,
        onboarded: state.onboarded,
        isMockData: state.isMockData,
      }),
      version: 1,
    }
  )
);

export function selectVisitedRegionIds(
  state: Pick<AppState, 'photos' | 'yearFilter'>,
  year?: number | 'all'
): Set<string> {
  const filter = year ?? state.yearFilter;
  const ids = new Set<string>();
  for (const p of state.photos) {
    if (!p.regionId) continue;
    if (filter !== 'all' && new Date(p.takenAt).getFullYear() !== filter) continue;
    ids.add(p.regionId);
  }
  return ids;
}

export function selectAvailableYears(state: Pick<AppState, 'photos'>): number[] {
  const years = new Set<number>();
  for (const p of state.photos) years.add(new Date(p.takenAt).getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}
