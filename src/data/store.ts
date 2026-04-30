import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Country, Photo, Region, Trip, Visit } from '@core/types';
import { processAssets, RawAsset } from '@core/photoProcessor';
import { COUNTRIES, DEFAULT_COUNTRY } from './countries';
import { KR_LEVEL1_REGIONS } from './koreaRegions';
import { KR_LEVEL2_REGIONS } from './koreaSigungu';
import { generateMockPhotos } from './mockPhotos';

export type MapMode = 'region' | 'heatmap' | 'marker';
export type MapLens = 'visited' | 'unvisited';
export type RegionLevelChoice = 1 | 2;

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'syncing'; loaded: number; total: number | null }
  | { kind: 'success'; at: string; matched: number; withGps: number; total: number }
  | { kind: 'error'; message: string };

interface AppState {
  countries: Country[];
  selectedCountry: string;
  /** regions[countryCode][level] = Region[] */
  regions: Record<string, Partial<Record<RegionLevelChoice, Region[]>>>;
  regionLevel: RegionLevelChoice;
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
  setRegionLevel: (level: RegionLevelChoice) => void;
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
  regions: {
    KR: { 1: KR_LEVEL1_REGIONS, 2: KR_LEVEL2_REGIONS },
  } as Record<string, Partial<Record<RegionLevelChoice, Region[]>>>,
  regionLevel: 1 as RegionLevelChoice,
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
      setRegionLevel: (level) => set({ regionLevel: level }),
      setYearFilter: (year) => set({ yearFilter: year }),
      setMapMode: (mode) => set({ mapMode: mode }),
      setMapLens: (lens) => set({ mapLens: lens }),
      markOnboarded: () => set({ onboarded: true }),

      hydrateMockData: () => {
        const photos = generateMockPhotos();
        // Always match against the most specific (highest level) region set so
        // a photo's regionId is the leaf — parents are derived on the fly.
        const regions = leafRegions(get());
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
        const regions = leafRegions(get());
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
        regionLevel: state.regionLevel,
        photos: state.photos,
        trips: state.trips,
        visits: state.visits,
        mapMode: state.mapMode,
        mapLens: state.mapLens,
        yearFilter: state.yearFilter,
        onboarded: state.onboarded,
        isMockData: state.isMockData,
      }),
      version: 2,
    }
  )
);

export function activeRegions(
  state: Pick<AppState, 'regions' | 'selectedCountry' | 'regionLevel'>
): Region[] {
  const byLevel = state.regions[state.selectedCountry];
  return byLevel?.[state.regionLevel] ?? byLevel?.[1] ?? [];
}

/**
 * Returns the most specific (leaf) regions the country provides, falling back
 * to coarser levels if the deeper data isn't available. Photo matching always
 * happens against leaves so parent visits can be derived without re-matching.
 */
export function leafRegions(
  state: Pick<AppState, 'regions' | 'selectedCountry'>
): Region[] {
  const byLevel = state.regions[state.selectedCountry];
  if (!byLevel) return [];
  if (byLevel[2]?.length) return byLevel[2];
  return byLevel[1] ?? [];
}

export function activeRegionsForLevel(
  state: Pick<AppState, 'regions' | 'selectedCountry'>,
  level: RegionLevelChoice
): Region[] {
  return state.regions[state.selectedCountry]?.[level] ?? [];
}

export function selectVisitedRegionIds(
  state: Pick<AppState, 'photos' | 'yearFilter' | 'regions' | 'selectedCountry'>,
  year?: number | 'all'
): Set<string> {
  const filter = year ?? state.yearFilter;
  const leaves = leafRegions(state);
  const parentOf = new Map<string, string | undefined>();
  for (const r of leaves) parentOf.set(r.id, r.parentId);

  const ids = new Set<string>();
  for (const p of state.photos) {
    if (!p.regionId) continue;
    if (filter !== 'all' && new Date(p.takenAt).getFullYear() !== filter) continue;
    ids.add(p.regionId);
    // Propagate visit up the parent chain so toggling between sido/sigungu
    // shows the correct count without re-matching photos.
    let parent = parentOf.get(p.regionId);
    while (parent) {
      if (ids.has(parent)) break;
      ids.add(parent);
      parent = parentOf.get(parent);
    }
  }
  return ids;
}

export function selectAvailableYears(state: Pick<AppState, 'photos'>): number[] {
  const years = new Set<number>();
  for (const p of state.photos) years.add(new Date(p.takenAt).getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}
