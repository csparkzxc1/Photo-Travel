import React from 'react';
import { Region } from '@core/types';
import { RegionMap } from './RegionMap';

interface Props {
  regions: Region[];
  visitedRegionIds: Set<string>;
  photos?: Array<{ lat: number; lng: number; id: string }>;
  mode: 'region' | 'heatmap' | 'marker';
  lens?: 'visited' | 'unvisited';
}

/**
 * Picks the active map renderer:
 *
 *   EXPO_PUBLIC_USE_MAPLIBRE=1  →  MapLibreRegionMap (production, GPU-accelerated)
 *   otherwise                   →  RegionMap        (SVG fallback, Expo Go-safe)
 *
 * The require() is lazy and try/catch-guarded so missing native bindings
 * don't crash the app — they just downgrade to the SVG path. This keeps
 * `npm start` working without `expo prebuild`.
 */
const useMapLibre = process.env.EXPO_PUBLIC_USE_MAPLIBRE === '1';

let MapLibreRegionMap: React.ComponentType<Props> | null = null;
if (useMapLibre) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    MapLibreRegionMap = require('./MapLibreRegionMap').MapLibreRegionMap;
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[MapView] EXPO_PUBLIC_USE_MAPLIBRE=1 but MapLibre Native is unavailable. ' +
          'Did you run `expo prebuild`? Falling back to SVG.',
        err
      );
    }
    MapLibreRegionMap = null;
  }
}

export function MapView(props: Props) {
  if (MapLibreRegionMap) return <MapLibreRegionMap {...props} />;
  return <RegionMap {...props} />;
}
